"""Discovery: the four opening answers, then adaptive situations driven by information gaps.

Flow: save_context → start_session (situation 1) → record_choice → next_situation … until the
configured number of situations is answered. Each situation targets the highest-priority open
gap and follows on from the consequence of the founder's previous choice.
"""

import json
import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import utcnow
from app.models import (
    Choice,
    ContextAnswer,
    DiscoverySession,
    InformationGap,
    Signal,
    Situation,
    User,
)
from app.schemas.demo import (
    ChoiceIn,
    ChoiceResult,
    ContextIn,
    KnownItem,
    KnownUnknown,
    SignalView,
    SituationOption,
    SituationView,
    UnknownItem,
)
from app.services import interactions
from app.services.ai.client import AIClient
from app.services.errors import Conflict, NotFound
from app.services.founders import founder_context

# What we want to learn first, in order. These become information_gaps rows.
INITIAL_GAPS = [
    ("Decision making", "How you decide when resources are tight.", "Tells us who can help you think through big calls.", 1),
    ("Execution vs learning", "Whether you build first or learn first under pressure.", "Decides whether you need a builder or a sounding board.", 1),
    ("Control vs partnership", "How much control you trade for capability.", "Decides which partners and co-founders would fit you.", 2),
    ("Risk orientation", "How much risk you take when the upside is large.", "Avoids introducing you to people who would frustrate you.", 2),
    ("Conflict handling", "How you handle disagreement with someone senior.", "Predicts how a working relationship would actually go.", 3),
]

# Labels for the declared facts shown on the known/unknown screen.
DECLARED = {"working_on": "Direction", "hoping_for": "Aspiration", "in_the_way": "Constraint"}

OBSERVED_CONFIDENCE = 0.35  # one decision is weak evidence, and the UI says so
SOMETHING_ELSE = {
    "id": "E",
    "text": "Something else.",
    "signal": "None of the obvious paths fit — worth exploring what you would do instead.",
    "still_unclear": "What you would actually do instead.",
}

SITUATION_SCHEMA = {
    "type": "object",
    "properties": {
        "consequence": {"type": "string"},
        "why_asking": {"type": "string"},
        "situation": {"type": "string"},
        "question": {"type": "string"},
        "dimension": {"type": "string"},
        "gap_question": {"type": "string"},
        "options": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "text": {"type": "string"},
                    "signal": {"type": "string"},
                    "still_unclear": {"type": "string"},
                },
                "required": ["id", "text", "signal", "still_unclear"],
            },
        },
    },
    "required": ["dimension", "gap_question", "consequence", "why_asking", "situation", "question", "options"],
}


# ── Opening answers ─────────────────────────────────────────────────────


def save_context(db: Session, founder: User, data: ContextIn) -> KnownUnknown:
    for key in DECLARED:
        text = getattr(data, key).strip()
        db.add(ContextAnswer(user_id=founder.id, question_key=key, answer_text=text))
        db.add(
            Signal(
                user_id=founder.id,
                source_type="context_answer",
                signal_type="declared",
                dimension=DECLARED[key],
                value_text=text,
                evidence_text="You told us",
                confidence=1.0,
            )
        )
    if not db.scalar(select(func.count()).where(InformationGap.user_id == founder.id)):
        for dimension, question, why, priority in INITIAL_GAPS:
            db.add(
                InformationGap(
                    user_id=founder.id,
                    dimension=dimension,
                    question=question,
                    why_it_matters=why,
                    priority=priority,
                )
            )
    founder.onboarding_stage = "discovery"
    interactions.record(db, "context_answered", user_id=founder.id)
    db.commit()
    return known_unknown(db, founder)


def known_unknown(db: Session, founder: User) -> KnownUnknown:
    signals = db.scalars(
        select(Signal)
        .where(Signal.user_id == founder.id, Signal.signal_type.in_(["declared", "observed"]))
        .order_by(Signal.created_at)
    )
    known: dict[str, KnownItem] = {}
    for s in signals:
        # Newest declaration per dimension wins; every observation is kept.
        key = s.dimension if s.signal_type == "declared" else str(s.id)
        known[key] = KnownItem(dimension=s.dimension, text=s.value_text, source=s.signal_type)
    return KnownUnknown(known=list(known.values()), unknown=_open_gaps(db, founder.id))


def _open_gaps(db: Session, founder_id: uuid.UUID) -> list[UnknownItem]:
    return [
        UnknownItem(id=g.id, dimension=g.dimension, label=g.question, why_it_matters=g.why_it_matters)
        for g in _open_gap_rows(db, founder_id)
    ]


# ── Sessions and situations ─────────────────────────────────────────────


def start_session(db: Session, ai: AIClient, founder: User) -> SituationView:
    """Idempotent: an active session with an unanswered situation is returned as it is."""
    session = db.scalar(
        select(DiscoverySession)
        .where(
            DiscoverySession.user_id == founder.id,
            DiscoverySession.status == "active",
            DiscoverySession.kind == "discovery",
        )
        .order_by(DiscoverySession.started_at.desc())
    )
    if session is None:
        session = DiscoverySession(user_id=founder.id, situation_count=get_settings().situations_per_session)
        db.add(session)
        db.flush()
        interactions.record(db, "discovery_started", user_id=founder.id, entity_type="discovery_session", entity_id=session.id)
        db.commit()
    latest = _latest_situation(db, session.id)
    if latest and not _choice_for(db, latest.id):
        return _view(session, latest)
    return next_situation(db, ai, founder, session.id)


def probe_gap(db: Session, ai: AIClient, founder: User, gap_id: uuid.UUID) -> SituationView:
    """The founder tapped an unknown: one optional situation on exactly that topic."""
    gap = db.get(InformationGap, gap_id)
    if gap is None or gap.user_id != founder.id:
        raise NotFound("That topic isn't on your ID.")
    session = DiscoverySession(user_id=founder.id, situation_count=1, kind="probe")
    db.add(session)
    db.flush()
    interactions.record(
        db, "gap_probe_started", user_id=founder.id, entity_type="information_gap", entity_id=gap.id, dimension=gap.dimension
    )
    db.commit()
    return next_situation(db, ai, founder, session.id, required_gap=gap)


def get_session(db: Session, founder_id: uuid.UUID | None, session_id: uuid.UUID) -> DiscoverySession:
    session = db.get(DiscoverySession, session_id)
    if session is None or (founder_id and session.user_id != founder_id):
        raise NotFound("Discovery session not found.")
    return session


def current_situation(db: Session, session_id: uuid.UUID) -> SituationView:
    session = get_session(db, None, session_id)
    latest = _latest_situation(db, session.id)
    if latest is None:
        raise Conflict("This session has no situation yet. Start discovery again.")
    if _choice_for(db, latest.id):
        raise Conflict("The latest situation is answered; ask for the next one.")
    return _view(session, latest)


def next_situation(
    db: Session,
    ai: AIClient,
    founder: User | None,
    session_id: uuid.UUID,
    required_gap: InformationGap | None = None,
) -> SituationView:
    """Idempotent: if the latest situation is still unanswered it is returned instead of a new one.
    The web app prefetches this while the founder reads their signal, so double calls are normal."""
    session = get_session(db, founder.id if founder else None, session_id)
    founder = founder or db.get(User, session.user_id)
    latest = _latest_situation(db, session.id)
    if latest and not _choice_for(db, latest.id):
        return _view(session, latest)
    answered = latest.sequence_no if latest else 0
    if answered >= session.situation_count:
        raise Conflict("Discovery is complete — build the ID next.")

    # The AI chooses what to learn next from the open gaps (or names a new one the
    # founder's answers raised). Priorities are guidance, not a fixed order.
    open_gaps = [required_gap] if required_gap else _open_gap_rows(db, founder.id)
    last_dimension = None if required_gap else (latest.dimension_targeted if latest else None)
    variables = {
        **founder_context(db, founder),
        "open_gaps": json.dumps(
            [{"dimension": g.dimension, "what_we_dont_know": g.question, "priority": g.priority} for g in open_gaps]
        ),
        "last_dimension_probed": last_dimension or "none yet",
        "situation_number": f"{answered + 1} of {session.situation_count}",
        # A probe sees every decision the founder has made, so it doesn't repeat one.
        "previous_situations": json.dumps(_history(db, None if required_gap else session.id, founder.id)),
    }
    if required_gap:
        variables["required_gap"] = json.dumps(
            {"dimension": required_gap.dimension, "gap_question": required_gap.question}
        )
    prompt = ai.prompt("situation")
    data = ai.run(
        purpose="situation",
        prompt_key="situation",
        variables=variables,
        schema=SITUATION_SCHEMA,
        user_id=founder.id,
        max_output_tokens=1400,
        validate=lambda d: _check_situation(d, open_gaps, last_dimension, check_topic=required_gap is None),
    )
    if required_gap:
        gap, chosen_from = required_gap, "founder_tapped"
    else:
        gap, chosen_from = _gap_for_choice(db, founder.id, open_gaps, data)
    dimension = gap.dimension

    options = [
        {
            "id": letter,
            "text": _clean(o["text"]),
            "signal": _clean(o["signal"]),
            "still_unclear": _clean(o.get("still_unclear")),
        }
        for letter, o in zip("ABCD", data["options"], strict=False)
    ] + [SOMETHING_ELSE]
    situation = Situation(
        session_id=session.id,
        sequence_no=answered + 1,
        consequence_text=_clean(data.get("consequence")) or None if answered and not required_gap else None,
        situation_text=_clean(data["situation"]),
        question_text=_clean(data["question"]),
        why_asking=_clean(data["why_asking"]),
        options=options,
        dimension_targeted=dimension,
        model_used=ai.provider.name,
        prompt_version=f"{prompt.key}@{prompt.version}",
    )
    db.add(situation)
    gap.status = "probing"
    db.flush()
    interactions.record(
        db,
        "situation_shown",
        user_id=founder.id,
        entity_type="situation",
        entity_id=situation.id,
        sequence_no=situation.sequence_no,
        dimension=dimension,
        topic_chosen_from=chosen_from,  # "open_gap" or "new_gap": how adaptive discovery really is
    )
    db.commit()
    return _view(session, situation)


def record_choice(db: Session, situation_id: uuid.UUID, data: ChoiceIn) -> ChoiceResult:
    situation = db.get(Situation, situation_id)
    if situation is None:
        raise NotFound("Situation not found.")
    session = get_session(db, data.founder_id, situation.session_id)
    option = next((o for o in situation.options if o["id"] == data.option_id.upper()), None)
    if option is None:
        raise NotFound(f"Option {data.option_id} is not part of this situation.")

    existing = _choice_for(db, situation.id)
    if existing is None:  # a retried request must not record the decision twice
        why = (data.why or "").strip() or None
        db.add(
            Choice(
                situation_id=situation.id,
                user_id=data.founder_id,
                chosen_option_id=option["id"],
                chosen_text=option["text"],
                why_text=why,
                not_chosen=[{"id": o["id"], "text": o["text"]} for o in situation.options if o["id"] != option["id"]],
                response_time_ms=data.response_time_ms,
            )
        )
        db.add(
            Signal(
                user_id=data.founder_id,
                source_type="choice",
                source_id=situation.id,
                signal_type="observed",
                dimension=situation.dimension_targeted,
                value_text=option["signal"],
                evidence_text=(
                    f"Chose {option['id']} in an optional situation on {situation.dimension_targeted.lower()}"
                    if session.kind == "probe"
                    else f"Chose {option['id']} in situation {situation.sequence_no}"
                ),
                confidence=OBSERVED_CONFIDENCE,
                model_version=situation.model_used,
            )
        )
        if situation.sequence_no >= session.situation_count:
            session.status = "complete"
            session.completed_at = utcnow()
        interactions.record(
            db,
            "choice_made",
            user_id=data.founder_id,
            entity_type="situation",
            entity_id=situation.id,
            option=option["id"],
            response_time_ms=data.response_time_ms,
            gave_reason=bool(why),
        )
        db.commit()

    decisions = db.scalar(select(func.count()).select_from(Choice).where(Choice.user_id == data.founder_id)) or 0
    return ChoiceResult(
        signal=SignalView(
            text=option["signal"],
            still_unclear=option.get("still_unclear") or "Whether this holds when the stakes are real.",
            decisions_so_far=decisions,
            evidence=(
                f"Chose {option['id']} in this optional situation"
                if session.kind == "probe"
                else f"Chose {option['id']} in situation {situation.sequence_no}"
            ),
            confidence=OBSERVED_CONFIDENCE,
        ),
        done=situation.sequence_no >= session.situation_count,
        remaining_unknowns=_open_gaps(db, data.founder_id),
    )


# ── Helpers ─────────────────────────────────────────────────────────────

# Mila occasionally emits "‹" where it means "₹" (seen in testing: "‹10,00,000").
_BROKEN_RUPEE = re.compile(r"[‹›](?=\s?\d)")


def _clean(text) -> str:
    return _BROKEN_RUPEE.sub("₹", str(text or "")).strip()


def _check_situation(
    data: dict, open_gaps: list[InformationGap], last_dimension: str | None, check_topic: bool = True
) -> None:
    """Raising here makes the AI client retry once, with the reason logged in ai_calls."""
    options = data.get("options")
    if not isinstance(options, list) or len(options) < 4:
        raise ValueError(f"expected 4 options, got {len(options) if isinstance(options, list) else 'none'}")
    if not all(isinstance(o, dict) and str(o.get("text", "")).strip() for o in options[:4]):
        raise ValueError("an option is empty")
    if not str(data.get("situation", "")).strip():
        raise ValueError("empty situation")

    if not check_topic:  # the founder picked the topic; only the situation itself is checked
        return
    dimension = _key(data.get("dimension"))
    if not dimension:
        raise ValueError("no dimension chosen")
    if last_dimension and dimension == _key(last_dimension):
        raise ValueError(f"probed '{last_dimension}' twice in a row")
    is_open_gap = any(_key(g.dimension) == dimension for g in open_gaps)
    if not is_open_gap and not str(data.get("gap_question", "")).strip():
        raise ValueError(f"new dimension '{data.get('dimension')}' needs a gap_question")


def _gap_for_choice(
    db: Session, founder_id: uuid.UUID, open_gaps: list[InformationGap], data: dict
) -> tuple[InformationGap, str]:
    """The gap the AI chose: an open one, an earlier one it returned to, or a new one it raised."""
    dimension = _key(data["dimension"])
    for gap in open_gaps:
        if _key(gap.dimension) == dimension:
            return gap, "open_gap"
    earlier = db.scalar(
        select(InformationGap).where(
            InformationGap.user_id == founder_id, func.lower(InformationGap.dimension) == dimension
        )
    )
    if earlier is not None:
        return earlier, "revisited_gap"
    gap = InformationGap(
        user_id=founder_id,
        dimension=_clean(data["dimension"])[:60],
        question=_clean(data["gap_question"]),
        why_it_matters="Raised by your earlier answers.",
        priority=1,
    )
    db.add(gap)
    return gap, "new_gap"


def _open_gap_rows(db: Session, founder_id: uuid.UUID) -> list[InformationGap]:
    return list(
        db.scalars(
            select(InformationGap)
            .where(InformationGap.user_id == founder_id, InformationGap.status == "open")
            .order_by(InformationGap.priority, InformationGap.created_at)
        )
    )


def _key(dimension) -> str:
    return " ".join(str(dimension or "").lower().split())


def _latest_situation(db: Session, session_id: uuid.UUID) -> Situation | None:
    return db.scalar(
        select(Situation).where(Situation.session_id == session_id).order_by(Situation.sequence_no.desc())
    )


def _choice_for(db: Session, situation_id: uuid.UUID) -> Choice | None:
    return db.scalar(select(Choice).where(Choice.situation_id == situation_id))


def _history(db: Session, session_id: uuid.UUID | None, founder_id: uuid.UUID) -> list[dict]:
    """This session's answered situations, or every decision the founder has made (session_id=None)."""
    query = select(Situation, Choice).join(Choice, Choice.situation_id == Situation.id)
    if session_id is not None:
        query = query.where(Situation.session_id == session_id).order_by(Situation.sequence_no)
    else:
        query = query.where(Choice.user_id == founder_id).order_by(Choice.created_at)
    rows = db.execute(query)
    return [
        {
            "situation": s.situation_text,
            "dimension": s.dimension_targeted,
            "chose": c.chosen_text,
            "refused": [o["text"] for o in c.not_chosen],
            "why": c.why_text or "",
        }
        for s, c in rows
    ]


def _view(session: DiscoverySession, s: Situation) -> SituationView:
    return SituationView(
        kind="probe" if session.kind == "probe" else "discovery",
        session_id=session.id,
        situation_id=s.id,
        sequence_no=s.sequence_no,
        total=session.situation_count,
        dimension=s.dimension_targeted,
        why_asking=s.why_asking,
        consequence=s.consequence_text,
        situation=s.situation_text,
        question=s.question_text,
        options=[SituationOption(id=o["id"], text=o["text"]) for o in s.options],
    )
