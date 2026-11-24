"""The investor web app.

What an investor can see of a founder, enforced here:
- only founders who introduced themselves to this investor (an accepted suggestion or a request
  to them), never a browsable list;
- of those, only rooms the founder ticked for investors, and only while the founder is opted in
  to investors (privacy.id_visible_to_investors). Otherwise just the public card.
Insights are counts across founders, never names, and a theme appears only when at least
MIN_FOUNDERS different founders share it.
"""

import re
import uuid
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import iso
from app.models import (
    ConnectionRequest,
    IdState,
    InvestorThesis,
    Opportunity,
    OpportunityResponse,
    PipelineEntry,
    User,
)
from app.services import connect, district, interactions, privacy
from app.services.errors import NotFound
from app.services.people import person_card

MIN_FOUNDERS = 3
STAGES = ("introduced", "conversation", "diligence", "passed")
_WORD = re.compile(r"[a-z]{4,}")
_STOP = connect._STOP | {"founders", "founder", "startup", "business", "early", "building", "build", "software", "platform"}


def get_investor(db: Session, investor_id: uuid.UUID) -> User:
    u = db.get(User, investor_id)
    if u is None or u.user_type != "investor":
        raise NotFound("No investor with that id.")
    return u


def create_investor(db: Session, name: str, firm: str) -> dict:
    u = User(name=name.strip(), organisation=firm.strip(), user_type="investor", onboarding_stage="id_built", city="Bengaluru", country="India")
    db.add(u)
    db.flush()
    db.add(InvestorThesis(user_id=u.id, firm=firm.strip()))
    interactions.record(db, "investor_created", user_id=u.id)
    db.commit()
    return {"id": str(u.id), "name": u.name, "firm": firm.strip()}


def demo_investors(db: Session) -> list[dict]:
    return [{"id": str(u.id), "name": u.name, "firm": u.organisation or ""}
            for u in db.scalars(select(User).where(User.user_type == "investor").order_by(User.name))]


# ── Thesis ──────────────────────────────────────────────────────────────


def _thesis_row(db: Session, inv: User) -> InvestorThesis:
    t = db.scalar(select(InvestorThesis).where(InvestorThesis.user_id == inv.id))
    if t is None:
        t = InvestorThesis(user_id=inv.id, firm=inv.organisation or "")
        db.add(t)
        db.flush()
    return t


def thesis(db: Session, inv: User) -> dict:
    t = _thesis_row(db, inv)
    db.commit()
    split = lambda v: [x for x in (v or "").split(",") if x]  # noqa: E731
    return {"name": inv.name, "firm": t.firm, "sectors": split(t.sectors), "stages": split(t.stages), "cheque": t.cheque, "geography": t.geography}


def set_thesis(db: Session, inv: User, data: dict) -> dict:
    t = _thesis_row(db, inv)
    t.firm = data["firm"].strip()
    t.sectors = ",".join(s.strip().lower() for s in data["sectors"] if s.strip())
    t.stages = ",".join(s.strip().lower() for s in data["stages"] if s.strip())
    t.cheque = data["cheque"].strip()
    t.geography = data["geography"].strip()
    inv.organisation = t.firm
    interactions.record(db, "investor_thesis", user_id=inv.id)
    db.commit()
    return thesis(db, inv)


# ── Who an investor may see ─────────────────────────────────────────────


def _introduced_founder_ids(db: Session, inv: User) -> set[uuid.UUID]:
    """Founders who asked to meet this investor (pending, accepted or not) or are connected."""
    ids = set(db.scalars(select(ConnectionRequest.from_user_id).where(ConnectionRequest.to_user_id == inv.id)))
    return ids | connect.connected_ids(db, inv.id)


def visible_to_investor(db: Session, founder_id: uuid.UUID) -> list[str]:
    if not privacy.read(db, founder_id).id_visible_to_investors:
        return []
    return district.investor_rooms(db, founder_id)


def _thesis_fit(db: Session, inv: User, founder: User) -> str | None:
    t = _thesis_row(db, inv)
    sectors = {s for s in t.sectors.split(",") if s}
    text = " ".join(db.scalars(select(IdState.value).where(IdState.user_id == founder.id, IdState.superseded_at.is_(None),
                                                           IdState.field.in_(("project", "stage")))))
    words = set(_WORD.findall(text.lower()))
    hits = sorted(s for s in sectors if any(w.startswith(s[:5]) for w in words))
    return ", ".join(hits) if hits else None


def founder_view(db: Session, inv: User, founder_id: uuid.UUID) -> dict:
    if founder_id not in _introduced_founder_ids(db, inv):
        raise NotFound("You can see a founder only after they introduce themselves to you.")
    founder = db.get(User, founder_id)
    rooms = visible_to_investor(db, founder_id)
    interactions.record(db, "investor_view_founder", user_id=inv.id, entity_type="user", entity_id=founder_id)
    db.commit()
    entry = db.scalar(select(PipelineEntry).where(PipelineEntry.investor_id == inv.id, PipelineEntry.founder_id == founder_id))
    return {
        "id": str(founder.id),
        "person": person_card(db, founder).model_dump(),
        "opted_in": privacy.read(db, founder_id).id_visible_to_investors,
        "shared": rooms,
        "not_shared": [r for r in district.ROOMS if r not in rooms],
        "rooms": {r: connect._room_data(db, founder, r) for r in rooms},
        "relation": connect.relation(db, inv.id, founder_id),
        "thesis_fit": _thesis_fit(db, inv, founder),
        "pipeline": {"stage": entry.stage, "note": entry.note} if entry else None,
    }


# ── Introductions waiting, and the pipeline ─────────────────────────────


def _intro_out(db: Session, inv: User, r: ConnectionRequest) -> dict:
    founder = db.get(User, r.from_user_id)
    return {
        "request_id": str(r.id),
        "founder_id": str(founder.id),
        "person": person_card(db, founder).model_dump(),
        "status": r.status,
        "sent_at": iso(r.created_at),
        "why": ("ID introduced you: they are looking for funding now and opted in to meeting investors."
                if r.origin == "suggestion" else (r.note or f"{founder.name} asked to meet you.")),
        "thesis_fit": _thesis_fit(db, inv, founder),
        "shares_rooms": visible_to_investor(db, founder.id),
    }


def introductions(db: Session, inv: User) -> list[dict]:
    rows = db.scalars(select(ConnectionRequest).where(ConnectionRequest.to_user_id == inv.id, ConnectionRequest.status == "pending")
                      .order_by(ConnectionRequest.created_at.desc()))
    return [_intro_out(db, inv, r) for r in rows]


def respond_intro(db: Session, inv: User, request_id: uuid.UUID, accept: bool) -> dict:
    out = connect.respond(db, inv, request_id, accept)
    r = db.get(ConnectionRequest, request_id)
    entry = db.scalar(select(PipelineEntry).where(PipelineEntry.investor_id == inv.id, PipelineEntry.founder_id == r.from_user_id))
    if entry is None:
        db.add(PipelineEntry(investor_id=inv.id, founder_id=r.from_user_id, stage="conversation" if accept else "passed"))
    else:
        entry.stage = "conversation" if accept else "passed"
    db.commit()
    return out


def pipeline(db: Session, inv: User) -> dict:
    rows = list(db.scalars(select(PipelineEntry).where(PipelineEntry.investor_id == inv.id).order_by(PipelineEntry.created_at.desc())))
    out = {s: [] for s in STAGES}
    for e in rows:
        founder = db.get(User, e.founder_id)
        if founder is None:
            continue
        out.setdefault(e.stage, []).append({"founder_id": str(founder.id), "person": person_card(db, founder).model_dump(), "note": e.note})
    out["introduced"] = [{"founder_id": i["founder_id"], "person": i["person"], "note": ""} for i in introductions(db, inv)] + out["introduced"]
    return out


def move(db: Session, inv: User, founder_id: uuid.UUID, stage: str, note: str | None) -> dict:
    if founder_id not in _introduced_founder_ids(db, inv):
        raise NotFound("That founder isn't in your pipeline.")
    e = db.scalar(select(PipelineEntry).where(PipelineEntry.investor_id == inv.id, PipelineEntry.founder_id == founder_id))
    if e is None:
        e = PipelineEntry(investor_id=inv.id, founder_id=founder_id)
        db.add(e)
    e.stage = stage
    if note is not None:
        e.note = note.strip()
    interactions.record(db, "investor_pipeline", user_id=inv.id, stage=stage)
    db.commit()
    return pipeline(db, inv)


# ── Anonymised ecosystem insights ───────────────────────────────────────


def _themes(db: Session, field: str, limit: int = 6) -> list[dict]:
    founders = list(db.scalars(select(User.id).where(User.user_type == "founder")))
    per_word: Counter[str] = Counter()
    for fid in founders:
        text = " ".join(db.scalars(select(IdState.value).where(IdState.user_id == fid, IdState.field == field, IdState.superseded_at.is_(None))))
        for w in set(_WORD.findall(text.lower())) - _STOP:
            per_word[w] += 1
    common = [(w, n) for w, n in per_word.most_common() if n >= MIN_FOUNDERS][:limit]
    return [{"theme": w, "founders": "many" if n >= 10 else "several"} for w, n in common]


def insights(db: Session) -> dict:
    total = len(list(db.scalars(select(User.id).where(User.user_type == "founder"))))
    return {
        "founders_in_community": "fewer than 20" if total < 20 else ("20 to 100" if total <= 100 else "more than 100"),
        "top_needs": _themes(db, "need"),
        "common_offers": _themes(db, "offer"),
        "what_founders_build": _themes(db, "project"),
        "rule": f"Themes shared by at least {MIN_FOUNDERS} founders. No names, no single founder's words.",
    }


# ── Investors post opportunities ────────────────────────────────────────


def post_opportunity(db: Session, inv: User, data: dict) -> dict:
    t = _thesis_row(db, inv)
    o = Opportunity(posted_by_user_id=inv.id, posted_by=t.firm or inv.organisation or inv.name,
                    **{k: (v.strip() if isinstance(v, str) else v) for k, v in data.items()})
    db.add(o)
    interactions.record(db, "investor_post_opportunity", user_id=inv.id)
    db.commit()
    return {"id": str(o.id)}


def my_opportunities(db: Session, inv: User) -> list[dict]:
    out = []
    for o in db.scalars(select(Opportunity).where(Opportunity.posted_by_user_id == inv.id).order_by(Opportunity.created_at.desc())):
        interested = db.execute(
            select(User.id, User.name, OpportunityResponse.note)
            .join(User, User.id == OpportunityResponse.user_id)
            .where(OpportunityResponse.opportunity_id == o.id, OpportunityResponse.interested_at.is_not(None))
        )
        out.append({"id": str(o.id), "kind": o.kind, "title": o.title, "archived": o.archived_at is not None,
                    "interested": [{"founder_id": str(i), "name": n, "note": note} for i, n, note in interested]})
    return out


def home(db: Session, inv: User) -> dict:
    p = pipeline(db, inv)
    return {
        "name": inv.name,
        "firm": _thesis_row(db, inv).firm,
        "introductions": introductions(db, inv),
        "pipeline_counts": {s: len(p.get(s, [])) for s in STAGES},
        "insight_teaser": insights(db)["top_needs"][:3],
        "has_thesis": bool(_thesis_row(db, inv).sectors),
    }

