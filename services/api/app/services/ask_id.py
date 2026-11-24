"""Ask ID: a guide that talks a decision through using only what is in the founder's District.

Stateless for now: the client sends the last few turns. Every question is logged to
`interactions`; the model call itself is logged to `ai_calls` by AIClient.
"""

import json

from sqlalchemy.orm import Session

from app.models import User
from app.services import district, id_builder, interactions
from app.services.ai.client import AIClient
from app.services.founders import founder_context

ASK_SCHEMA = {
    "type": "object",
    "required": ["reply", "rests_on", "strength", "suggestions"],
    "properties": {
        "reply": {"type": "string"},
        "rests_on": {"type": "string"},
        "strength": {"type": "string", "enum": ["low", "medium", "high"]},
        "suggestions": {"type": "array", "items": {"type": "string"}, "maxItems": 3},
    },
}

MAX_TURNS = 8


def _check(data: dict) -> None:
    if not data["reply"].strip():
        raise ValueError("empty reply")
    if data["strength"] not in ("low", "medium", "high"):
        raise ValueError("strength must be low, medium or high")


def ask(db: Session, ai: AIClient, founder: User, message: str, history: list[dict]) -> dict:
    current = id_builder.read(db, founder)
    turns = history[-MAX_TURNS:]
    variables = {
        **founder_context(db, founder),
        "their_state": json.dumps([{"field": s.field, "value": s.value} for s in current.state]),
        "how_we_read_them": json.dumps(
            [{"dimension": p.dimension, "insight": p.insight, "confidence": p.confidence, "evidence": p.evidence} for p in current.person]
        ),
        "what_we_do_not_know": json.dumps([g.question for g in current.gaps if g.status != "closed"]),
        "their_journey_recent": json.dumps(
            [{"kind": j["kind"], "title": j["title"], "learned": j["learned"], "on": j["on"]} for j in district.journey(db, founder)[:6]]
        ),
        "their_experiments": json.dumps(
            [{"title": e["title"], "status": e["status"], "tried": e["tried"], "learned": e["learned"]} for e in district.experiments(db, founder)[:5]]
        ),
        "conversation_so_far": json.dumps(turns) if turns else "(none)",
        "their_question": message.strip(),
    }
    data = ai.run(
        purpose="ask_id",
        prompt_key="ask_id",
        variables=variables,
        schema=ASK_SCHEMA,
        user_id=founder.id,
        max_output_tokens=700,
        validate=_check,
    )
    interactions.record(db, "ask_id", user_id=founder.id, chars=len(message.strip()))
    db.commit()
    return {
        "reply": data["reply"].strip(),
        "rests_on": data["rests_on"].strip(),
        "strength": data["strength"],
        "suggestions": [s.strip() for s in data.get("suggestions", []) if s.strip()][:3],
    }
