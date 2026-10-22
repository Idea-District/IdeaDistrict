"""Offline provider: scripted, schema-shaped answers so the whole flow runs with no network.
Used for development, tests, and as the on-stage fallback (AI_PROVIDER=mock)."""

import json
import re

from app.services.ai.providers.base import ProviderRequest, ProviderResponse

_SITUATIONS = [
    {
        "consequence": "",
        "dimension": "Decision making",
        "gap_question": "How you decide when resources are tight.",
        "why_asking": "We know what you're building and what's in the way. We don't yet know how you decide when resources are tight.",
        "situation": "You have ₹50 lakh and four months before you need to raise again. Two strong engineers in Bengaluru would join tomorrow.",
        "question": "What do you do first?",
        "options": [
            {"id": "A", "text": "Hire both engineers and build faster.", "signal": "Leans toward building capacity before proof."},
            {"id": "B", "text": "Spend a month selling to ten customers by hand first.", "signal": "Prioritises customer evidence before major spend."},
            {"id": "C", "text": "Partner with an agency to build while you sell.", "signal": "Trades control for speed and flexibility."},
            {"id": "D", "text": "Keep the money and extend runway to eight months.", "signal": "Protects optionality over momentum."},
        ],
    },
    {
        "consequence": "Your choice bought clarity, but one of the engineers took another offer while you decided.",
        "dimension": "Execution vs learning",
        "gap_question": "Whether you build first or learn first under pressure.",
        "why_asking": "We've seen how you spend under pressure. We don't yet know whether you build first or learn first when the product wobbles.",
        "situation": "Customers love the idea, but your first version breaks every few days. A big customer wants a pilot next month.",
        "question": "What do you do?",
        "options": [
            {"id": "A", "text": "Freeze new features and fix reliability for six weeks.", "signal": "Puts reliability ahead of the next deal."},
            {"id": "B", "text": "Take the pilot and patch issues as they come.", "signal": "Learns in public, accepts execution risk."},
            {"id": "C", "text": "Bring in a senior contractor to stabilise it fast.", "signal": "Buys capability to protect momentum."},
            {"id": "D", "text": "Shrink the pilot to one team you can support.", "signal": "Narrows scope to keep promises."},
        ],
    },
    {
        "consequence": "The pilot went ahead in some form, and the customer asked for features you hadn't planned.",
        "dimension": "Control vs partnership",
        "gap_question": "How much control you trade for capability.",
        "why_asking": "We're learning how you balance speed and quality. We don't yet know how much control you trade for help.",
        "situation": "A larger company offers to distribute your product to 2,000 businesses — if they get a say in your roadmap.",
        "question": "How do you respond?",
        "options": [
            {"id": "A", "text": "Accept: distribution like this is rare.", "signal": "Trades control for reach."},
            {"id": "B", "text": "Agree, with written limits on their roadmap say.", "signal": "Partners while protecting key decisions."},
            {"id": "C", "text": "Run a three-month trial before committing.", "signal": "Builds trust in stages, on evidence."},
            {"id": "D", "text": "Decline and keep the roadmap yours.", "signal": "Strong preference for product control."},
        ],
    },
    {
        "consequence": "The partnership question settled for now, and a new opportunity appeared in another city.",
        "dimension": "Risk orientation",
        "gap_question": "How much risk you take when the upside is large.",
        "why_asking": "We know how you treat partners. We don't yet know how much risk you take when the upside is large.",
        "situation": "An investor offers to double your round if you launch in Hyderabad within eight weeks. Your team is already stretched.",
        "question": "What do you do?",
        "options": [
            {"id": "A", "text": "Take it and launch with a skeleton team.", "signal": "Comfortable with big bets under strain."},
            {"id": "B", "text": "Negotiate a twelve-week timeline instead.", "signal": "Takes the upside on its own terms."},
            {"id": "C", "text": "Decline and grow where you already win.", "signal": "Prefers depth over expansion."},
            {"id": "D", "text": "Test demand in Hyderabad remotely first.", "signal": "De-risks before committing people."},
        ],
    },
    {
        "consequence": "Your growth plan moved forward, and your senior advisor disagrees with it strongly.",
        "dimension": "Conflict handling",
        "gap_question": "How you handle disagreement with someone senior.",
        "why_asking": "We know a lot about how you decide. We don't yet know how you handle disagreement with someone senior.",
        "situation": "Your most experienced advisor tells your team, in a meeting, that your plan is wrong.",
        "question": "What do you do next?",
        "options": [
            {"id": "A", "text": "Talk to them privately the same day.", "signal": "Addresses conflict directly and quickly."},
            {"id": "B", "text": "Ask the team to test both plans for two weeks.", "signal": "Lets evidence settle disagreements."},
            {"id": "C", "text": "Hold your plan and explain your reasoning.", "signal": "Holds a position under senior pressure."},
            {"id": "D", "text": "Bring in a neutral third person to mediate.", "signal": "Seeks structure in conflict."},
        ],
    },
]

FIXTURES: dict[str, object] = {
    "ping": {"ok": True},
    "situation": _SITUATIONS,  # picked by the situation number in the request, not by call order
    "build_person": {
        "headline": "You look for evidence from customers before you commit money or people.",
        "attributes": [
            {"dimension": "Decision making", "insight": "You buy proof before you buy capacity.", "confidence": "medium", "strength": 0.55, "evidence": "3 of 5 decisions", "facet": "primary"},
            {"dimension": "Collaboration", "insight": "You partner when the terms protect what matters to you.", "confidence": "low", "strength": 0.3, "evidence": "2 decisions", "facet": "primary"},
            {"dimension": "Risk orientation", "insight": "You take large bets only after a cheap test.", "confidence": "medium", "strength": 0.45, "evidence": "2 of 5 decisions", "facet": "primary"},
            {"dimension": "Conflict handling", "insight": "Not enough evidence yet to say.", "confidence": "low", "strength": 0.1, "evidence": "Never tested", "facet": "primary"},
        ],
    },
    "build_state": {
        "state": [
            {"field": "project", "value": "The venture you described in your own words", "confidence": "high", "facet": "primary", "source": "declared"},
            {"field": "stage", "value": "Early", "confidence": "medium", "facet": "primary", "source": "inferred"},
            {"field": "need", "value": "Technical help to build the first version", "confidence": "medium", "facet": "primary", "source": "inferred"},
            {"field": "offer", "value": "Experience talking to early customers", "confidence": "medium", "facet": "primary", "source": "inferred"},
        ],
        "gaps": [
            {"dimension": "Conflict handling", "question": "How you handle disagreement with someone senior.", "why_it_matters": "Predicts how a co-founder relationship would go.", "priority": 1},
            {"dimension": "Long-term ambition", "question": "What you want in three years.", "why_it_matters": "Separates people who'd share your direction from those who wouldn't.", "priority": 2},
            {"dimension": "Delegation", "question": "Whether you can let go of work you're good at.", "why_it_matters": "Matters for your first hires.", "priority": 3},
        ],
    },
    "tell_me_more": {
        "state": [{"field": "offer", "value": "Design and brand skills you can share with other founders", "confidence": "high", "facet": "secondary", "source": "declared"}],
        "person": [],
        "acknowledgement": "This means we can introduce you to founders who need what you know, not only people who can help your venture.",
    },
    "match": {
        "match": "M1",
        "match_type": "NEED → CAPABILITY",
        "intent": "seek",
        "why_now": "You need technical help to build the first version, and they have done exactly that recently.",
        "why_them": "They have built and shipped an early product in Bengaluru at a similar stage.",
        "what_could_happen": "A practical hour on scoping your first version — and it may well be useful to them too.",
        "confidence": "medium",
        "confidence_reason": "Strong on the need; untested on whether you'd work well together.",
        "no_match_reasons": [],
    },
}


class MockProvider:
    name = "mock"

    def complete(self, request: ProviderRequest) -> ProviderResponse:
        fixture = FIXTURES.get(request.purpose)
        if fixture is None:
            raise LookupError(f"mock provider has no fixture for purpose '{request.purpose}'")
        payload = fixture
        if isinstance(fixture, list):
            found = re.search(r"situation_number: (\d+)", request.prompt)
            payload = fixture[(int(found.group(1)) - 1 if found else 0) % len(fixture)]
        text = json.dumps(payload)
        return ProviderResponse(
            text=text,
            model="mock-1",
            input_tokens=len(request.system + request.prompt) // 4,
            output_tokens=len(text) // 4,
        )
