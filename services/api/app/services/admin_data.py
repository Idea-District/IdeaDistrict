"""Everything the team can see about the community, for the admin console's Users & data pages.

Admin-only (the routes sit behind require_admin). This is the team's view, so it includes contact
details and what founders told us. Two things stay out even here:
- message bodies: the team sees who talks to whom and how much, never what they wrote;
- an investor's private pipeline notes are shown, because they are written on our platform, but
  founders never see them.
"""

import uuid
from datetime import timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.base import iso, utcnow
from app.models.cafe import BrewAnswer, TablePost, TableSeat
from app.models.connections import ConnectionRequest, Opportunity, OpportunityResponse
from app.models.discovery import Choice, ContextAnswer, DiscoverySession, Situation
from app.models.district import Experiment, JourneyEntry, RoomVisibility
from app.models.id_model import IdAttribute, IdState, InformationGap
from app.models.identity import User, UserPrivacySettings
from app.models.infra import AiCall, Interaction
from app.models.investor import InvestorThesis, PipelineEntry
from app.models.messaging import Conversation, ConversationParticipant, Message
from app.models.recommendations import NoMatchLog, Recommendation
from app.models.toolkit import Simulation
from app.services.errors import NotFound
from app.services.id_builder import HEADLINE


def _iso(dt):
    return iso(dt) if dt else None


def _count(db: Session, stmt) -> int:
    return int(db.scalar(stmt) or 0)


def _n(db: Session, model, *where) -> int:
    return _count(db, select(func.count()).select_from(model).where(*where))


def _names(db: Session, ids) -> dict[uuid.UUID, User]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    return {u.id: u for u in db.scalars(select(User).where(User.id.in_(ids)))}


def _person(u: User | None) -> dict | None:
    if u is None:
        return None
    return {"id": str(u.id), "name": u.name, "type": u.user_type, "organisation": u.organisation or ""}


def _state(db: Session, user_id: uuid.UUID) -> list[IdState]:
    return list(db.scalars(select(IdState).where(IdState.user_id == user_id, IdState.superseded_at.is_(None)).order_by(IdState.field)))


def _first(state: list[IdState], field: str) -> str:
    return next((s.value for s in state if s.field == field), "")


def _last_seen(db: Session, u: User):
    last = db.scalar(select(func.max(Interaction.occurred_at)).where(Interaction.user_id == u.id))
    cands = [d for d in (u.last_active_at, last) if d is not None]
    return max(cands, key=lambda d: d.replace(tzinfo=None)) if cands else None


def _privacy(db: Session, user_id: uuid.UUID) -> dict:
    p = db.scalar(select(UserPrivacySettings).where(UserPrivacySettings.user_id == user_id))
    return {
        "visible_to_investors": bool(p and p.id_visible_to_investors),
        "allow_introductions": True if p is None else bool(p.allow_introductions),
    }


def _connections(db: Session, user_id: uuid.UUID) -> list[dict]:
    rows = list(
        db.scalars(
            select(ConnectionRequest)
            .where(or_(ConnectionRequest.from_user_id == user_id, ConnectionRequest.to_user_id == user_id))
            .order_by(ConnectionRequest.created_at.desc())
        )
    )
    people = _names(db, [r.from_user_id for r in rows] + [r.to_user_id for r in rows])
    out = []
    for r in rows:
        mine = r.from_user_id == user_id
        out.append({
            "id": str(r.id),
            "direction": "sent" if mine else "received",
            "with": _person(people.get(r.to_user_id if mine else r.from_user_id)),
            "status": r.status,
            "origin": r.origin,
            "note": r.note,
            "sent_at": _iso(r.created_at),
            "answered_at": _iso(r.responded_at),
        })
    return out


def _conversations(db: Session, user_id: uuid.UUID) -> list[dict]:
    """Who they talk to and how much. Never what was written."""
    convo_ids = list(db.scalars(select(ConversationParticipant.conversation_id).where(ConversationParticipant.user_id == user_id)))
    out = []
    for cid in convo_ids:
        others = list(db.scalars(select(ConversationParticipant.user_id).where(
            ConversationParticipant.conversation_id == cid, ConversationParticipant.user_id != user_id)))
        people = _names(db, others)
        convo = db.get(Conversation, cid)
        out.append({
            "id": str(cid),
            "with": [_person(people.get(o)) for o in others],
            "messages": _n(db, Message, Message.conversation_id == cid),
            "sent_by_them": _n(db, Message, Message.conversation_id == cid, Message.sender_id == user_id),
            "started_at": _iso(convo.created_at) if convo else None,
            "last_message_at": _iso(convo.last_message_at) if convo else None,
        })
    return sorted(out, key=lambda c: c["last_message_at"] or c["started_at"] or "", reverse=True)


def _ai_usage(db: Session, user_id: uuid.UUID | None = None) -> dict:
    where = [AiCall.user_id == user_id] if user_id else []
    row = db.execute(select(func.count(), func.coalesce(func.sum(AiCall.cost_usd), 0.0),
                            func.coalesce(func.sum(AiCall.input_tokens + AiCall.output_tokens), 0)).where(*where)).one()
    failed = _n(db, AiCall, AiCall.status == "failed", *where)
    return {"calls": int(row[0]), "cost_usd": round(float(row[1]), 4), "tokens": int(row[2]), "failed": failed}


# ── The overview ────────────────────────────────────────────────────────


def summary(db: Session) -> dict:
    now = utcnow()
    week, month = now - timedelta(days=7), now - timedelta(days=30)
    founders = User.user_type == "founder"
    investors = User.user_type == "investor"
    built = select(IdAttribute.user_id).distinct()
    active_ids = set(db.scalars(select(Interaction.user_id).where(Interaction.occurred_at >= week).distinct()))
    active_ids |= set(db.scalars(select(User.id).where(User.last_active_at >= week)))
    founder_ids = set(db.scalars(select(User.id).where(founders)))
    investor_ids = set(db.scalars(select(User.id).where(investors)))
    founder_to_investor = select(ConnectionRequest).where(ConnectionRequest.to_user_id.in_(investor_ids)).subquery()
    return {
        "users": {
            "total": _n(db, User),
            "founders": len(founder_ids),
            "investors": len(investor_ids),
            "new_7_days": _n(db, User, User.created_at >= week),
            "new_30_days": _n(db, User, User.created_at >= month),
            "active_7_days": len(active_ids & (founder_ids | investor_ids)),
        },
        "founders": {
            "id_built": _n(db, User, founders, User.id.in_(built)),
            "finished_discovery": _count(db, select(func.count(func.distinct(DiscoverySession.user_id))).where(DiscoverySession.status == "complete")),
            "visible_to_investors": _n(db, UserPrivacySettings, UserPrivacySettings.id_visible_to_investors.is_(True),
                                       UserPrivacySettings.user_id.in_(founder_ids)),
            "paused_introductions": _n(db, UserPrivacySettings, UserPrivacySettings.allow_introductions.is_(False)),
        },
        "investors": {
            "with_thesis": _count(db, select(func.count(func.distinct(InvestorThesis.user_id))).where(InvestorThesis.sectors != "")),
            "introductions_waiting": _count(db, select(func.count()).select_from(founder_to_investor).where(founder_to_investor.c.status == "pending")),
            "introductions_accepted": _count(db, select(func.count()).select_from(founder_to_investor).where(founder_to_investor.c.status == "accepted")),
            "in_pipeline": _n(db, PipelineEntry),
            "opportunities_posted": _n(db, Opportunity, Opportunity.posted_by_user_id.in_(investor_ids)),
        },
        "matching": {
            "suggestions_shown": _n(db, Recommendation),
            "accepted": _n(db, Recommendation, Recommendation.status == "accepted"),
            "declined": _n(db, Recommendation, Recommendation.status == "declined"),
            "no_match": _n(db, NoMatchLog),
        },
        "connections": {
            "accepted": _n(db, ConnectionRequest, ConnectionRequest.status == "accepted"),
            "waiting": _n(db, ConnectionRequest, ConnectionRequest.status == "pending"),
            "declined": _n(db, ConnectionRequest, ConnectionRequest.status == "declined"),
            "conversations": _n(db, Conversation),
            "messages": _n(db, Message),
            "messages_7_days": _n(db, Message, Message.sent_at >= week),
        },
        "cafe": {
            "brew_answers": _n(db, BrewAnswer),
            "table_posts": _n(db, TablePost),
            "opportunities": _n(db, Opportunity, Opportunity.archived_at.is_(None)),
            "opportunity_interest": _n(db, OpportunityResponse, OpportunityResponse.interested_at.is_not(None)),
        },
        "ai": _ai_usage(db),
    }


# ── Founders ────────────────────────────────────────────────────────────


def founders(db: Session) -> list[dict]:
    built = set(db.scalars(select(IdAttribute.user_id).distinct()))
    out = []
    for u in db.scalars(select(User).where(User.user_type == "founder").order_by(User.created_at.desc())):
        st = _state(db, u.id)
        seen = _last_seen(db, u)
        out.append({
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "city": u.city or "",
            "building": _first(st, "project") or u.one_line or u.organisation or "",
            "stage": _first(st, "stage"),
            "id_built": u.id in built,
            "visible_to_investors": _privacy(db, u.id)["visible_to_investors"],
            "connections": _n(db, ConnectionRequest, ConnectionRequest.status == "accepted",
                              or_(ConnectionRequest.from_user_id == u.id, ConnectionRequest.to_user_id == u.id)),
            "joined_at": _iso(u.created_at),
            "last_seen_at": _iso(seen),
        })
    return out


def founder(db: Session, founder_id: uuid.UUID) -> dict:
    u = db.get(User, founder_id)
    if u is None or u.user_type != "founder":
        raise NotFound("No such founder.")
    attrs = list(db.scalars(select(IdAttribute).where(IdAttribute.user_id == u.id).order_by(IdAttribute.strength.desc())))
    headline = next((a.insight for a in attrs if a.dimension == HEADLINE), "")
    choices = db.execute(
        select(Situation, Choice).join(Choice, Choice.situation_id == Situation.id).where(Choice.user_id == u.id)
        .order_by(Choice.created_at)
    ).all()
    recs = list(db.scalars(select(Recommendation).where(or_(Recommendation.user_a_id == u.id, Recommendation.user_b_id == u.id))
                           .order_by(Recommendation.created_at.desc())))
    rec_people = _names(db, [r.user_a_id for r in recs] + [r.user_b_id for r in recs])
    events = list(db.scalars(select(Interaction).where(Interaction.user_id == u.id).order_by(Interaction.occurred_at.desc()).limit(40)))
    pipeline = list(db.scalars(select(PipelineEntry).where(PipelineEntry.founder_id == u.id)))
    inv = _names(db, [p.investor_id for p in pipeline])
    return {
        "profile": {
            "id": str(u.id), "name": u.name, "email": u.email, "phone": u.phone, "city": u.city, "country": u.country,
            "organisation": u.organisation, "role_title": u.role_title, "linkedin_url": u.linkedin_url, "one_line": u.one_line,
            "onboarding_stage": u.onboarding_stage, "joined_at": _iso(u.created_at), "last_seen_at": _iso(_last_seen(db, u)),
        },
        "privacy": _privacy(db, u.id),
        "rooms": [{"room": r.room, "audience": r.audience, "to_investors": r.to_investors}
                  for r in db.scalars(select(RoomVisibility).where(RoomVisibility.user_id == u.id).order_by(RoomVisibility.room))],
        "headline": headline,
        "told_us": [{"question": a.question_key, "answer": a.answer_text, "choice": a.answer_choice, "at": _iso(a.answered_at)}
                    for a in db.scalars(select(ContextAnswer).where(ContextAnswer.user_id == u.id).order_by(ContextAnswer.answered_at))],
        "situations": [{"situation": s.situation_text, "question": s.question_text, "probing": s.dimension_targeted,
                        "chose": c.chosen_text, "why": c.why_text} for s, c in choices],
        "state": [{"field": s.field, "facet": s.facet, "value": s.value, "confidence": s.confidence, "source": s.source} for s in _state(db, u.id)],
        "reads": [{"dimension": a.dimension, "facet": a.facet, "insight": a.insight, "confidence": a.confidence,
                   "strength": round(a.strength, 2), "evidence": a.evidence_summary} for a in attrs if a.dimension != HEADLINE],
        "gaps": [{"dimension": g.dimension, "question": g.question, "status": g.status}
                 for g in db.scalars(select(InformationGap).where(InformationGap.user_id == u.id).order_by(InformationGap.priority))],
        "journey": [{"kind": j.kind, "title": j.title, "on": str(j.happened_on), "learned": j.learned}
                    for j in db.scalars(select(JourneyEntry).where(JourneyEntry.user_id == u.id).order_by(JourneyEntry.happened_on.desc()))],
        "experiments": [{"title": e.title, "status": e.status, "tried": e.tried, "happened": e.happened, "learned": e.learned}
                        for e in db.scalars(select(Experiment).where(Experiment.user_id == u.id).order_by(Experiment.started_on.desc()))],
        "suggestions": [{
            "with": _person(rec_people.get(r.user_b_id if r.user_a_id == u.id else r.user_a_id)),
            "direction": "for them" if r.user_a_id == u.id else "suggested to someone else",
            "type": r.match_type, "status": r.status, "confidence": r.confidence, "why_them": r.why_them,
            "at": _iso(r.created_at),
        } for r in recs],
        "connections": _connections(db, u.id),
        "conversations": _conversations(db, u.id),
        "investor_pipelines": [{"investor": _person(inv.get(p.investor_id)), "stage": p.stage} for p in pipeline],
        "activity": {
            "brew_answers": _n(db, BrewAnswer, BrewAnswer.user_id == u.id),
            "tables_joined": _n(db, TableSeat, TableSeat.user_id == u.id),
            "table_posts": _n(db, TablePost, TablePost.user_id == u.id),
            "simulations": _n(db, Simulation, Simulation.user_id == u.id),
            "opportunities_interested": _n(db, OpportunityResponse, OpportunityResponse.user_id == u.id,
                                           OpportunityResponse.interested_at.is_not(None)),
        },
        "ai": _ai_usage(db, u.id),
        "recent_events": [{"event": e.event_type, "at": _iso(e.occurred_at)} for e in events],
    }


# ── Investors ───────────────────────────────────────────────────────────


def _thesis(db: Session, user_id: uuid.UUID) -> dict | None:
    t = db.scalar(select(InvestorThesis).where(InvestorThesis.user_id == user_id))
    if t is None:
        return None
    split = lambda s: [x for x in (s or "").split(",") if x]  # noqa: E731
    return {"firm": t.firm, "sectors": split(t.sectors), "stages": split(t.stages), "cheque": t.cheque, "geography": t.geography}


def investors(db: Session) -> list[dict]:
    out = []
    for u in db.scalars(select(User).where(User.user_type == "investor").order_by(User.created_at.desc())):
        t = _thesis(db, u.id)
        received = ConnectionRequest.to_user_id == u.id
        out.append({
            "id": str(u.id),
            "name": u.name,
            "firm": (t or {}).get("firm") or u.organisation or "",
            "email": u.email,
            "sectors": (t or {}).get("sectors", []),
            "has_thesis": bool(t and t["sectors"]),
            "introductions": _n(db, ConnectionRequest, received),
            "accepted": _n(db, ConnectionRequest, received, ConnectionRequest.status == "accepted"),
            "waiting": _n(db, ConnectionRequest, received, ConnectionRequest.status == "pending"),
            "in_pipeline": _n(db, PipelineEntry, PipelineEntry.investor_id == u.id),
            "opportunities": _n(db, Opportunity, Opportunity.posted_by_user_id == u.id),
            "joined_at": _iso(u.created_at),
            "last_seen_at": _iso(_last_seen(db, u)),
        })
    return out


def investor(db: Session, investor_id: uuid.UUID) -> dict:
    u = db.get(User, investor_id)
    if u is None or u.user_type != "investor":
        raise NotFound("No such investor.")
    pipeline = list(db.scalars(select(PipelineEntry).where(PipelineEntry.investor_id == u.id).order_by(PipelineEntry.created_at.desc())))
    founders_ = _names(db, [p.founder_id for p in pipeline])
    opps = list(db.scalars(select(Opportunity).where(Opportunity.posted_by_user_id == u.id).order_by(Opportunity.created_at.desc())))
    events = list(db.scalars(select(Interaction).where(Interaction.user_id == u.id).order_by(Interaction.occurred_at.desc()).limit(40)))
    return {
        "profile": {
            "id": str(u.id), "name": u.name, "email": u.email, "phone": u.phone, "city": u.city,
            "organisation": u.organisation, "one_line": u.one_line, "linkedin_url": u.linkedin_url,
            "joined_at": _iso(u.created_at), "last_seen_at": _iso(_last_seen(db, u)),
        },
        "thesis": _thesis(db, u.id),
        "introductions": [c for c in _connections(db, u.id) if c["direction"] == "received"],
        "pipeline": [{"founder": _person(founders_.get(p.founder_id)), "stage": p.stage, "note": p.note} for p in pipeline],
        "opportunities": [{
            "id": str(o.id), "kind": o.kind, "title": o.title, "archived": o.archived_at is not None, "posted_at": _iso(o.created_at),
            "interested": _n(db, OpportunityResponse, OpportunityResponse.opportunity_id == o.id, OpportunityResponse.interested_at.is_not(None)),
            "saved": _n(db, OpportunityResponse, OpportunityResponse.opportunity_id == o.id, OpportunityResponse.saved.is_(True)),
        } for o in opps],
        "conversations": _conversations(db, u.id),
        "recent_events": [{"event": e.event_type, "at": _iso(e.occurred_at)} for e in events],
    }
