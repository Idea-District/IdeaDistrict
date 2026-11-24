"""Seed data (idempotent):
- default prompts → prompt_versions (a changed prompt file becomes a new active version)
- sample members with built IDs: 30 founders (matching candidates) and 10 investors
  (stored with user_type="investor"; investors are read-only in the MVP and not matched)

    python -m app.seed
"""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import IdAttribute, IdState, PromptVersion, User, UserPrivacySettings
from app.prompts import available_prompts, load_default_prompt
from app.seed_data import DEMO_INVESTORS, MORE_FOUNDERS
from app.services.id_builder import HEADLINE

DEMO_EMAIL_DOMAIN = "ideadistrict.demo"

# Each founder: profile, State (field, value, facet), Person (dimension, insight, confidence, strength, evidence).
DEMO_FOUNDERS = [
    {
        "slug": "ananya", "name": "Ananya Rao", "organisation": "Kirana Route",
        "headline": "You scale through people on the ground before you scale the software.",
        "state": [
            ("project", "B2B ordering and delivery software for kirana distributors", "primary"),
            ("stage", "Seed", "primary"),
            ("offer", "Built and ran a 40-person field sales team across three cities", "primary"),
            ("offer", "Expanded from Bengaluru to Pune and Hyderabad in one year", "primary"),
            ("need", "A first senior engineering hire she can trust", "primary"),
        ],
        "person": [
            ("Execution vs learning", "You go to the market first and let the product catch up.", "medium", 0.6, "4 of 5 decisions"),
            ("Delegation", "You hand over operations early but keep pricing decisions close.", "low", 0.3, "2 decisions"),
        ],
    },
    {
        "slug": "karthik", "name": "Karthik Menon", "organisation": "Settle",
        "headline": "You take regulatory risk seriously and move once the path is clear.",
        "state": [
            ("project", "UPI-based payment collection infrastructure for small businesses", "primary"),
            ("stage", "Series A", "primary"),
            ("offer", "Took a payment aggregator licence through RBI approval", "primary"),
            ("offer", "Bank partnership negotiations with two private banks", "primary"),
            ("need", "An enterprise sales leader for large merchants", "primary"),
        ],
        "person": [
            ("Risk orientation", "You avoid bets the regulator could undo.", "medium", 0.65, "4 of 5 decisions"),
            ("Collaboration", "You partner readily when the partner carries the compliance burden.", "low", 0.35, "2 decisions"),
        ],
    },
    {
        "slug": "farah", "name": "Farah Siddiqui", "organisation": "HomeLab",
        "headline": "You protect quality of service even when growth pressure says otherwise.",
        "state": [
            ("project", "At-home diagnostic sample collection for families", "primary"),
            ("stage", "Pre-seed", "primary"),
            ("offer", "Hired and trained her first ten field staff", "primary"),
            ("need", "Introductions to angel investors in healthtech", "primary"),
        ],
        "person": [
            ("Decision making", "You slow down when patient trust is at stake.", "medium", 0.55, "3 of 5 decisions"),
            ("Conflict handling", "Not enough evidence yet to say.", "low", 0.1, "Never tested"),
        ],
    },
    {
        "slug": "rohan", "name": "Rohan Iyer", "organisation": "SwapGrid",
        "headline": "You solve supply problems before you chase demand.",
        "state": [
            ("project", "Battery-swapping stations for electric two-wheelers", "primary"),
            ("stage", "Seed", "primary"),
            ("offer", "Manufacturing and supplier relationships in Hosur and Chennai", "primary"),
            ("offer", "Hardware prototyping on a tight budget", "primary"),
            ("need", "Delivery fleets as first large customers", "primary"),
        ],
        "person": [
            ("Execution vs learning", "You build a working unit before you ask anyone to buy it.", "medium", 0.6, "4 of 5 decisions"),
        ],
    },
    {
        "slug": "meera", "name": "Meera Krishnan", "organisation": "Studio Kolam",
        "headline": "You lead with craft and build community around it.",
        "state": [
            ("project", "Brand and storefront tooling for D2C craft brands", "primary"),
            ("stage", "Bootstrapped", "primary"),
            ("offer", "Brand identity and product design for early-stage startups", "primary"),
            ("offer", "Built a 3,000-member maker community", "secondary"),
            ("need", "A technical co-founder", "primary"),
        ],
        "person": [
            ("Collaboration", "You prefer partners who bring a different craft to yours.", "medium", 0.5, "3 of 5 decisions"),
        ],
    },
    {
        "slug": "vikram", "name": "Vikram Shetty", "organisation": "LedgerPilot",
        "headline": "You prototype fast and let real users decide what survives.",
        "state": [
            ("project", "AI assistants that automate filing work for CA firms", "primary"),
            ("stage", "Pre-seed", "primary"),
            ("offer", "Full-stack engineering and AI prototyping; former startup CTO", "primary"),
            ("offer", "Helping non-technical founders scope a first product", "secondary"),
            ("need", "Distribution into CA firms and small businesses", "primary"),
        ],
        "person": [
            ("Execution vs learning", "You ship a rough version in days rather than plan for weeks.", "medium", 0.6, "4 of 5 decisions"),
            ("Delegation", "Not enough evidence yet to say.", "low", 0.1, "Never tested"),
        ],
    },
]


def seed_prompts() -> int:
    """Adds v1, v2… per key whenever the file differs from the active version.
    Older versions are kept (inactive) so every past signal still traces to its prompt."""
    added = 0
    with SessionLocal() as db:
        for key in available_prompts():
            body = load_default_prompt(key)
            versions = list(db.scalars(select(PromptVersion).where(PromptVersion.key == key)))
            active = next((v for v in versions if v.active), None)
            if active is not None and active.body == body:
                continue
            for v in versions:
                v.active = False
            db.add(PromptVersion(key=key, version=f"v{len(versions) + 1}", body=body, active=True))
            added += 1
        db.commit()
    return added


def seed_demo_founders() -> int:
    return _seed_members(DEMO_FOUNDERS + MORE_FOUNDERS, "founder")


def seed_demo_investors() -> int:
    return _seed_members(DEMO_INVESTORS, "investor")


def _seed_members(members: list[dict], user_type: str) -> int:
    """Idempotent by email: people already present are skipped, never duplicated."""
    added = 0
    with SessionLocal() as db:
        for f in members:
            email = f"{f['slug']}@{DEMO_EMAIL_DOMAIN}"
            if db.scalar(select(User).where(User.email == email)):
                continue
            user = User(
                name=f["name"], email=email, organisation=f["organisation"], city="Bengaluru",
                country="India", onboarding_stage="id_built", user_type=user_type,
            )
            db.add(user)
            db.flush()
            db.add(UserPrivacySettings(user_id=user.id))
            db.add(
                IdAttribute(
                    user_id=user.id, dimension=HEADLINE, insight=f["headline"], confidence="medium",
                    strength=0.5, evidence_summary="From 5 decisions", signal_count=5, version=1,
                )
            )
            for dimension, insight, confidence, strength, evidence in f["person"]:
                db.add(
                    IdAttribute(
                        user_id=user.id, dimension=dimension, insight=insight, confidence=confidence,
                        strength=strength, evidence_summary=evidence, signal_count=5, version=1,
                    )
                )
            for field, value, facet in f["state"]:
                db.add(
                    IdState(
                        user_id=user.id, field=field, value=value, facet=facet, confidence="high", source="declared"
                    )
                )
            added += 1
        db.commit()
    return added


# ── Cafe sample content (Daily Brew, Open Table, What's On) ──────────────

CAFE_BREWS = [
    "What did a customer teach you this month that you didn't expect?",
    "Which decision this week would you make differently with hindsight?",
    "What is one thing you stopped doing that made your week better?",
    "Who outside your team helped you most this month, and how?",
    "What did you learn from the last 'no' you heard?",
    "Which assumption about your market are you least sure of right now?",
    "What small win this week would you otherwise overlook?",
]

CAFE_TABLES = [
    ("First 10 customers", "How did you find the first people who paid you? What would you skip if you started again?", 0),
    ("Raising your first round", "What do you wish you had known before your first investor meeting?", None),
    ("First hires", "Who was your first hire, and what did they teach you about hiring?", None),
    ("What to build next", "How do you decide between a customer's request and your own roadmap?", None),
    ("Pricing your first plan", "Bring your pricing page, or your guess at one. We'll pressure-test it together.", 2),
]

CAFE_POSTS = [
    "Our first five came from one WhatsApp group of shop owners. Not one from cold email.",
    "I'd skip the free pilots. The ones who paid from day one gave far better feedback.",
    "Asking for a small amount up front filtered out the polite yeses very quickly.",
]

CAFE_ANSWERS = [
    "That owners care more about not running out on a Saturday than about saving money. Changed our whole pitch.",
    "A kirana owner told me she trusts a voice note more than a dashboard. We're testing that this week.",
    "That the person who uses the tool is rarely the one who pays for it.",
]


def seed_cafe() -> int:
    """Idempotent: adds sample Cafe content only when the Cafe is empty."""
    from datetime import timedelta

    from app.db.base import utcnow
    from app.models import Brew, BrewAnswer, CafeTable, TablePost, TableSeat, WhatsOn
    from app.services.cafe import cafe_today

    with SessionLocal() as db:
        if db.scalar(select(Brew.id).limit(1)):
            return 0
        today = cafe_today()
        brews = [Brew(question=q, publish_on=today + timedelta(days=i - 1)) for i, q in enumerate(CAFE_BREWS)]
        db.add_all(brews)
        members = list(db.scalars(select(User).where(User.email.like(f"%@{DEMO_EMAIL_DOMAIN}"), User.user_type == "founder").limit(8)))
        tables = []
        for title, prompt, days in CAFE_TABLES:
            starts = None if days is None else utcnow() + timedelta(days=days, hours=2)
            status = "open" if days in (None, 0) else "scheduled"
            t = CafeTable(title=title, prompt=prompt, status=status, starts_at=None if days == 0 else starts)
            tables.append(t)
        db.add_all(tables)
        db.flush()
        todays = brews[1]
        for m, body in zip(members[:3], CAFE_ANSWERS, strict=False):
            db.add(BrewAnswer(brew_id=todays.id, user_id=m.id, body=body))
        first = tables[0]
        for m in members[:5]:
            db.add(TableSeat(table_id=first.id, user_id=m.id))
        for m, body in zip(members[:3], CAFE_POSTS, strict=False):
            db.add(TablePost(table_id=first.id, user_id=m.id, body=body))
        db.add_all(
            [
                WhatsOn(kind="event", title="Open Table: pricing your first plan", detail="Bring your pricing page, or your guess at one.",
                        starts_at=tables[4].starts_at, place="Online", table_id=tables[4].id),
                WhatsOn(kind="event", title="Founder walk", detail="An easy hour, no slides. Meet at the bandstand.",
                        starts_at=utcnow() + timedelta(days=4), place="Cubbon Park"),
                WhatsOn(kind="open_call", title="Pilot call: food manufacturers association",
                        detail="A regional association is looking for an inventory tool to pilot with 20 members."),
                WhatsOn(kind="table", title="New table: First hires", detail="Who was your first hire, and what did they teach you?",
                        table_id=tables[2].id),
            ]
        )
        db.commit()
        return 1


# ── Explore industries: sample reads (patterns to check, never statistics) ──

INDUSTRY_TOPICS = [
    {
        "title": "How small food manufacturers buy software", "category": "market", "minutes": 4,
        "tags": "food,manufactur,inventory,factory,unit,owners",
        "summary": "Who decides, what they compare you with, and the objections you are likely to hear.",
        "sections": [
            {"heading": "Who decides", "body": "In a small unit the owner usually decides, but the person who keeps the stock book often decides whether it gets used. Meet both early."},
            {"heading": "What they compare you with", "body": "Rarely another product. More often a notebook, a WhatsApp group and a trusted supervisor. Your real competitor is the habit that already works well enough."},
            {"heading": "Objections you may hear", "body": "\"We'll try it after the festive season.\" \"My staff won't use a phone app.\" \"What happens when the internet is down?\" Each one is worth a direct answer before the demo, not after."},
            {"heading": "What tends to move a decision", "body": "Seeing a unit like theirs using it, a price that feels small next to one bad week of stock-outs, and a first week where someone helps them set it up."},
        ],
        "questions": ["Who in the unit would feel the change first?", "What does one stock-out actually cost them?", "Which objection have you not answered yet?"],
    },
    {
        "title": "Pricing your first plan", "category": "business_model", "minutes": 3,
        "tags": "pricing,price,plan,subscription,customers,paying",
        "summary": "Per unit, per user or flat: what each one signals, and how to test a price without guessing.",
        "sections": [
            {"heading": "What each model signals", "body": "Per user says the value grows with the team. Per unit or per location says it grows with the business. Flat says it is simple. Pick the one that matches how your customer already thinks about cost."},
            {"heading": "Test, don't guess", "body": "Offer two prices to similar customers and watch who signs, not who says it sounds fair. A small upfront payment tells you more than a long free pilot."},
            {"heading": "Leave room to change", "body": "Early prices are hypotheses. Tell first customers they are founding prices and you will learn together."},
        ],
        "questions": ["What does your customer already pay for the problem today?", "Which two prices could you test this month?"],
    },
    {
        "title": "Selling to small businesses in India", "category": "market", "minutes": 4,
        "tags": "kirana,shop,sme,small,business,retail,distributor,msme",
        "summary": "Trust travels through people. Where your first customers are likely to come from.",
        "sections": [
            {"heading": "Trust travels through people", "body": "Owners often buy because someone they know uses it. A single respected owner in a market or association can open more doors than any campaign."},
            {"heading": "Show up where they already are", "body": "Trade associations, wholesale markets and existing WhatsApp groups tend to work better than cold outreach. Ask to be introduced rather than introducing yourself."},
            {"heading": "Make the first week easy", "body": "Setup help, a voice note in their language and a quick check-in after three days often decide whether the product sticks."},
        ],
        "questions": ["Who is the one owner others in your market listen to?", "What would make your first week effortless for them?"],
    },
    {
        "title": "Circular supply chains", "category": "market", "minutes": 3,
        "tags": "circular,climate,sustainab,material,waste,recycl,supply",
        "summary": "Where waste becomes someone else's input, and why partnerships matter more than technology here.",
        "sections": [
            {"heading": "The idea", "body": "One business's waste becomes another's raw material. The hard part is rarely the technology; it is reliable volume, quality and logistics between the two."},
            {"heading": "Where founders get stuck", "body": "Promising buyers before supply is steady, or collecting supply before a buyer has committed. Most early wins come from a single dependable pair."},
            {"heading": "Questions buyers ask", "body": "Is the quality consistent? Can you deliver every month? What happens if you cannot? Have answers before the first meeting."},
        ],
        "questions": ["Who is your one dependable pair to start with?", "What would make your supply steady enough to promise?"],
    },
    {
        "title": "Marketplaces vs software tools", "category": "business_model", "minutes": 3,
        "tags": "marketplace,platform,saas,software,tool,b2b",
        "summary": "Two different businesses that often get confused. What each needs to work.",
        "sections": [
            {"heading": "A tool earns from use", "body": "A software tool is valuable to one customer on day one. It grows customer by customer, and retention is the number to watch."},
            {"heading": "A marketplace earns from matches", "body": "A marketplace is only valuable when both sides are there. Early on you are usually doing the matching by hand."},
            {"heading": "Which are you, really?", "body": "Many founders start as a tool for one side and add the second side later. Being honest about which you are now changes who you should talk to this week."},
        ],
        "questions": ["Is your product useful to one customer on day one?", "If you are a marketplace, which side do you bring first?"],
    },
]


def seed_topics() -> int:
    """Idempotent by slug."""
    import json

    from app.models import IndustryTopic
    from app.services.topics_admin import slugify

    added = 0
    with SessionLocal() as db:
        for t in INDUSTRY_TOPICS:
            slug = slugify(t["title"])
            if db.scalar(select(IndustryTopic.id).where(IndustryTopic.slug == slug)):
                continue
            db.add(IndustryTopic(slug=slug, title=t["title"], category=t["category"], minutes=t["minutes"], summary=t["summary"],
                                 sections_json=json.dumps(t["sections"]), questions_json=json.dumps(t["questions"]), tags=t["tags"]))
            added += 1
        db.commit()
    return added


# ── People: sample opportunities, and sample members' shared rooms ───────

OPPORTUNITIES = [
    {"kind": "pilot_call", "title": "Inventory tool pilot for 20 member units", "posted_by": "Karnataka Food Processors Association (sample)",
     "summary": "The association wants to pilot one inventory and reorder tool with 20 small member units this quarter.",
     "what_they_need": "A tool owners can use on a phone, works in Kannada or English, and a named person for setup in week one.",
     "timeline": "Shortlist in December, pilot January to March", "how_to_respond": "Express interest with two lines on what you'd offer the 20 units.",
     "tags": "inventory,food,manufactur,stock,units"},
    {"kind": "challenge", "title": "Cut cold-chain waste for small dairies", "posted_by": "Idea District (sample)",
     "summary": "Small dairies lose stock between collection and the chiller. Ideas, pilots or partners welcome.",
     "what_they_need": "Low-cost ways to track temperature and time at collection points.", "timeline": "Open until the end of January",
     "how_to_respond": "Express interest and say which part you'd take on.", "tags": "cold,dairy,logistics,waste,supply"},
    {"kind": "problem", "title": "Kirana owners want credit they can trust", "posted_by": "Idea District (sample)",
     "summary": "Several kirana owners in the community told us informal credit is their biggest weekly headache.",
     "what_they_need": "Founders who are building, or want to build, around small-shop credit and ledgers.", "timeline": "Ongoing",
     "how_to_respond": "Express interest to join a small working group.", "tags": "kirana,credit,ledger,shop,retail"},
    {"kind": "circle", "title": "First-time B2B sellers circle", "posted_by": "Idea District",
     "summary": "Six founders selling to businesses for the first time, meeting every other Thursday evening.",
     "what_they_need": "Founders in their first year of B2B sales.", "timeline": "Every other Thursday, 7 pm",
     "how_to_respond": "Express interest and the team will introduce you.", "tags": "b2b,sales,customers,selling,pricing"},
]


def seed_people() -> int:
    """Idempotent. Opportunities when there are none; sample members share Business and Needs with the community."""
    from app.models import Opportunity, RoomVisibility

    added = 0
    with SessionLocal() as db:
        if not db.scalar(select(Opportunity.id).limit(1)):
            db.add_all([Opportunity(**o) for o in OPPORTUNITIES])
            added += len(OPPORTUNITIES)
        members = db.scalars(select(User).where(User.email.like(f"%@{DEMO_EMAIL_DOMAIN}"), User.user_type == "founder"))
        for m in members:
            for room in ("business", "needs"):
                if not db.scalar(select(RoomVisibility.id).where(RoomVisibility.user_id == m.id, RoomVisibility.room == room)):
                    db.add(RoomVisibility(user_id=m.id, room=room, audience="community"))
        db.commit()
    return added


if __name__ == "__main__":
    print(
        f"Seeded {seed_prompts()} prompt(s), {seed_demo_founders()} founder(s) "
        f"and {seed_demo_investors()} investor(s)."
    )
    print(f"Cafe sample content: {'added' if seed_cafe() else 'already there'}.")
    print(f"Industry reads added: {seed_topics()}.")
    print(f"Opportunities added: {seed_people()}.")
