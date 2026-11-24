"""People beyond ID's suggestions: Explore, visiting a District, where journeys meet,
connection requests (both people agree), and opportunities.

Privacy is enforced here, not in the client:
- Another member's rooms are returned only when their audience setting covers the viewer
  ("community" for anyone, "connections" for people already connected). Nothing else leaks,
  not even through the AI: "where journeys meet" sees only what the viewer may see.
- The public card (name, what they're building, stage, city) is visible to members, as before.
"""

import hashlib
import json
import re
import uuid
from datetime import timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.base import iso, utcnow
from app.models import (
    ConnectionRequest,
    Conversation,
    ConversationParticipant,
    Experiment,
    IdState,
    JourneyEntry,
    Message,
    Opportunity,
    OpportunityResponse,
    Recommendation,
    User,
)
from app.services import district, interactions, messaging
from app.services.ai.client import AIClient
from app.services.errors import Conflict, NotFound
from app.services.people import person_card

_WORD = re.compile(r"[a-z]{4,}")
_STOP = {"with", "that", "this", "from", "their", "they", "your", "have", "into", "more", "help", "need", "want", "will", "about", "first", "small"}


def _words(text: str) -> set[str]:
    return set(_WORD.findall(text.lower())) - _STOP


def _state(db: Session, user_id: uuid.UUID) -> list[IdState]:
    return list(db.scalars(select(IdState).where(IdState.user_id == user_id, IdState.superseded_at.is_(None))))


# ── Who is connected ────────────────────────────────────────────────────


def connected_ids(db: Session, founder_id: uuid.UUID) -> set[uuid.UUID]:
    """Connected = both people agreed: a shared conversation, or an accepted request."""
    mine = select(ConversationParticipant.conversation_id).where(ConversationParticipant.user_id == founder_id)
    ids = set(
        db.scalars(
            select(ConversationParticipant.user_id).where(
                ConversationParticipant.conversation_id.in_(mine), ConversationParticipant.user_id != founder_id
            )
        )
    )
    for a, b in db.execute(
        select(ConnectionRequest.from_user_id, ConnectionRequest.to_user_id).where(
            ConnectionRequest.status == "accepted",
            or_(ConnectionRequest.from_user_id == founder_id, ConnectionRequest.to_user_id == founder_id),
        )
    ):
        ids.add(b if a == founder_id else a)
    return ids


def _pending_between(db: Session, a: uuid.UUID, b: uuid.UUID) -> ConnectionRequest | None:
    return db.scalar(
        select(ConnectionRequest).where(
            ConnectionRequest.status == "pending",
            or_(
                (ConnectionRequest.from_user_id == a) & (ConnectionRequest.to_user_id == b),
                (ConnectionRequest.from_user_id == b) & (ConnectionRequest.to_user_id == a),
            ),
        )
    )


def relation(db: Session, viewer_id: uuid.UUID, other_id: uuid.UUID) -> str:
    """connected | request_sent | request_received | none"""
    if other_id in connected_ids(db, viewer_id):
        return "connected"
    req = _pending_between(db, viewer_id, other_id)
    if req is None:
        return "none"
    return "request_sent" if req.from_user_id == viewer_id else "request_received"


# ── What a viewer may see of someone's District ─────────────────────────


def visible_rooms(db: Session, viewer_id: uuid.UUID, owner_id: uuid.UUID) -> dict[str, bool]:
    vis = district.visibility(db, owner_id)
    connected = owner_id in connected_ids(db, viewer_id)
    return {room: aud == "community" or (aud == "connections" and connected) for room, aud in vis.items()}


# Labels as a visitor reads them (the owner's own screens say "you").
VISITOR_LABEL = {
    "project": "What they're building", "stage": "Stage", "problem": "Hardest part right now", "constraint": "Constraint",
    "trajectory": "Where it's heading", "need": "What would help them now", "goal": "Where they're heading", "offer": "What they can offer",
}


def _room_data(db: Session, owner: User, room: str) -> list[dict]:
    if room == "business":
        return [{"label": VISITOR_LABEL.get(s.field, s.field.capitalize()), "value": s.value}
                for s in _state(db, owner.id) if s.field not in district.NEED_KINDS]
    if room == "needs":
        return [{"label": VISITOR_LABEL[s.field], "value": s.value} for s in _state(db, owner.id) if s.field in district.NEED_KINDS]
    if room == "journey":
        rows = db.scalars(select(JourneyEntry).where(JourneyEntry.user_id == owner.id).order_by(JourneyEntry.happened_on.desc()).limit(6))
        return [{"label": f"{e.kind.capitalize()} · {e.happened_on.strftime('%b %Y')}", "value": e.title} for e in rows]
    if room == "progress":
        rows = db.scalars(select(Experiment).where(Experiment.user_id == owner.id).order_by(Experiment.started_on.desc()).limit(5))
        return [{"label": e.status.capitalize(), "value": e.title + (f" — learned: {e.learned}" if e.learned else "")} for e in rows]
    if room == "capabilities":
        return [{"label": c["dimension"], "value": c["insight"], "confidence": c["confidence"]}
                for c in district.capabilities(db, owner) if c["enough_evidence"]][:4]
    return []


def visible_profile(db: Session, viewer_id: uuid.UUID, owner: User) -> dict:
    rooms = visible_rooms(db, viewer_id, owner.id)
    return {room: _room_data(db, owner, room) for room, ok in rooms.items() if ok}


def visit(db: Session, viewer: User, owner_id: uuid.UUID) -> dict:
    owner = db.get(User, owner_id)
    if owner is None or owner.user_type != "founder" or owner.id == viewer.id:
        raise NotFound("That District isn't open to visit.")
    rooms = visible_rooms(db, viewer.id, owner.id)
    interactions.record(db, "district_visit", user_id=viewer.id, entity_type="user", entity_id=owner.id)
    db.commit()
    return {
        "id": str(owner.id),
        "person": person_card(db, owner).model_dump(),
        "relation": relation(db, viewer.id, owner.id),
        "shared": [r for r, ok in rooms.items() if ok],
        "private": [r for r, ok in rooms.items() if not ok],
        "rooms": {r: _room_data(db, owner, r) for r, ok in rooms.items() if ok},
    }


# ── Explore: a few Districts worth visiting this week ───────────────────


def explore(db: Session, viewer: User, limit: int = 4) -> dict:
    """Hand-picked by overlap with what you need, from what each member has made visible.
    The same picks all week (rotates on Mondays); never an endless feed."""
    mine = _state(db, viewer.id)
    my_needs = [s.value for s in mine if s.field in ("need", "problem", "goal")]
    my_work = _words(" ".join(s.value for s in mine if s.field == "project"))
    skip = connected_ids(db, viewer.id) | {viewer.id}
    week = utcnow().isocalendar()
    picks = []
    for u in db.scalars(select(User).where(User.user_type == "founder", User.onboarding_stage == "id_built")):
        if u.id in skip:
            continue
        seen = visible_profile(db, viewer.id, u)
        card = person_card(db, u)
        offers = [i["value"] for i in seen.get("needs", []) if i["label"] == VISITOR_LABEL["offer"]]
        # The best single pairing of one of their offers with one of your needs.
        best = max(
            ((len(_words(o) & _words(n)), o, n) for o in offers for n in my_needs),
            default=(0, "", ""),
        )
        shared_work = my_work & _words(card.building)
        if best[0] >= 2:
            reason = f"They offer “{best[1].rstrip('.')}”. You said: “{best[2].rstrip('.')}”."
            score = 2 + best[0]
        elif shared_work and len(shared_work) >= 2:
            reason = f"They're building close to you: {card.building.rstrip('.')}."
            score = 1 + len(shared_work)
        else:
            continue
        tie = hashlib.sha256(f"{week[0]}-{week[1]}-{viewer.id}-{u.id}".encode()).hexdigest()
        picks.append((score, tie, {"id": str(u.id), "person": card.model_dump(), "reason": reason, "shared": [r for r in seen]}))
    picks.sort(key=lambda p: (-p[0], p[1]))
    monday = (utcnow() - timedelta(days=utcnow().weekday())).date()
    return {"picks": [p[2] for p in picks[:limit]], "next_picks_on": (monday + timedelta(days=7)).isoformat()}


# ── Where your journeys could meet (AI, on visible data only) ───────────

MEET_SCHEMA = {
    "type": "object",
    "required": ["you_may_bring", "they_may_bring", "why_it_may_matter", "confidence", "rests_on"],
    "properties": {
        "you_may_bring": {"type": "string"},
        "they_may_bring": {"type": "string"},
        "why_it_may_matter": {"type": "string"},
        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
        "rests_on": {"type": "string"},
    },
}


def meet(db: Session, ai: AIClient, viewer: User, owner_id: uuid.UUID) -> dict:
    owner = db.get(User, owner_id)
    if owner is None or owner.user_type != "founder" or owner.id == viewer.id:
        raise NotFound("That District isn't open to visit.")
    mine = {s.field: s.value for s in _state(db, viewer.id)}
    theirs = visible_profile(db, viewer.id, owner)
    data = ai.run(
        purpose="meet",
        prompt_key="meet",
        variables={
            "you": json.dumps({"name": viewer.name, **mine}),
            "them_public_card": json.dumps(person_card(db, owner).model_dump()),
            "them_what_they_chose_to_share": json.dumps(theirs) if theirs else "(nothing beyond the public card)",
        },
        schema=MEET_SCHEMA,
        user_id=viewer.id,
        max_output_tokens=600,
    )
    confidence = data["confidence"] if data["confidence"] in ("low", "medium") else "medium"
    if not theirs:
        confidence = "low"
    return {
        "person": person_card(db, owner).model_dump(),
        "you_may_bring": data["you_may_bring"].strip(),
        "they_may_bring": data["they_may_bring"].strip(),
        "why_it_may_matter": data["why_it_may_matter"].strip(),
        "confidence": confidence,
        "rests_on": data["rests_on"].strip(),
        "relation": relation(db, viewer.id, owner.id),
    }


# ── Connection requests ─────────────────────────────────────────────────


def _req_out(db: Session, r: ConnectionRequest, viewer_id: uuid.UUID) -> dict:
    other = db.get(User, r.to_user_id if r.from_user_id == viewer_id else r.from_user_id)
    note = r.note
    if r.origin == "suggestion" and not note:
        # Never pass on why ID suggested it: that rests on the other person's private needs.
        note = "ID suggested you two might be useful to each other."
    return {"id": str(r.id), "person_id": str(other.id), "person": person_card(db, other).model_dump(), "note": note,
            "status": r.status, "direction": "sent" if r.from_user_id == viewer_id else "received", "sent_at": iso(r.created_at),
            "origin": r.origin}


def request_for_suggestion(db: Session, rec: Recommendation) -> dict:
    """After the founder accepts one of ID's suggestions. Idempotent per suggestion. If the other
    person has already asked to connect, that counts as both agreeing."""
    existing = db.scalar(select(ConnectionRequest).where(ConnectionRequest.recommendation_id == rec.id))
    if existing is None:
        crossing = _pending_between(db, rec.user_a_id, rec.user_b_id)
        if crossing is not None and crossing.to_user_id == rec.user_a_id:
            crossing.status = "accepted"
            crossing.responded_at = utcnow()
            convo = messaging.open_for(db, rec)
            db.commit()
            return {"conversation_id": convo.id, "request_id": crossing.id, "waiting_for_them": False}
        existing = ConnectionRequest(from_user_id=rec.user_a_id, to_user_id=rec.user_b_id, origin="suggestion", recommendation_id=rec.id)
        db.add(existing)
        db.flush()
        interactions.record(db, "connection_request", user_id=rec.user_a_id, entity_type="connection_request", entity_id=existing.id, origin="suggestion")
    convo = db.scalar(select(Conversation).where(Conversation.origin_recommendation_id == rec.id))
    db.commit()
    return {"conversation_id": convo.id if convo else None, "request_id": existing.id, "waiting_for_them": convo is None}


def request(db: Session, viewer: User, to_id: uuid.UUID, note: str, origin: str) -> dict:
    to = db.get(User, to_id)
    if to is None or to.id == viewer.id or to.user_type != "founder":
        raise NotFound("You can't send a request to that member.")
    if to_id in connected_ids(db, viewer.id):
        raise Conflict("You're already connected.")
    existing = _pending_between(db, viewer.id, to_id)
    if existing is not None:
        if existing.to_user_id == viewer.id:
            raise Conflict("They've already asked to connect with you. Accept their request instead.")
        return _req_out(db, existing, viewer.id)
    r = ConnectionRequest(from_user_id=viewer.id, to_user_id=to_id, note=note.strip(), origin=origin)
    db.add(r)
    db.flush()
    interactions.record(db, "connection_request", user_id=viewer.id, entity_type="connection_request", entity_id=r.id, origin=origin)
    db.commit()
    return _req_out(db, r, viewer.id)


def respond(db: Session, viewer: User, request_id: uuid.UUID, accept: bool) -> dict:
    r = db.get(ConnectionRequest, request_id)
    if r is None or r.to_user_id != viewer.id:
        raise NotFound("No such request for you.")
    if r.status != "pending":
        raise Conflict("That request has already been answered.")
    r.status = "accepted" if accept else "declined"
    r.responded_at = utcnow()
    conversation_id = None
    if accept:
        rec = db.get(Recommendation, r.recommendation_id) if r.recommendation_id else None
        conversation_id = (messaging.open_for(db, rec) if rec else messaging.open_for_request(db, r)).id
    interactions.record(db, f"connection_{r.status}", user_id=viewer.id, entity_type="connection_request", entity_id=r.id)
    db.commit()
    return {**_req_out(db, r, viewer.id), "conversation_id": str(conversation_id) if conversation_id else None}


def withdraw(db: Session, viewer: User, request_id: uuid.UUID) -> dict:
    r = db.get(ConnectionRequest, request_id)
    if r is None or r.from_user_id != viewer.id or r.status != "pending":
        raise NotFound("No pending request of yours with that id.")
    r.status = "withdrawn"
    r.responded_at = utcnow()
    interactions.record(db, "connection_withdrawn", user_id=viewer.id, entity_type="connection_request", entity_id=r.id)
    db.commit()
    return _req_out(db, r, viewer.id)


def _conversation_with(db: Session, a: uuid.UUID, b: uuid.UUID) -> Conversation | None:
    mine = select(ConversationParticipant.conversation_id).where(ConversationParticipant.user_id == a)
    return db.scalar(
        select(Conversation)
        .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
        .where(ConversationParticipant.user_id == b, Conversation.id.in_(mine))
        .order_by(Conversation.created_at.desc())
    )


def connections(db: Session, viewer: User) -> dict:
    week_ago = utcnow() - timedelta(days=7)
    connected, in_talks = [], []
    for uid in connected_ids(db, viewer.id):
        other = db.get(User, uid)
        convo = _conversation_with(db, viewer.id, uid)
        last = db.scalar(select(Message.sent_at).where(Message.conversation_id == convo.id).order_by(Message.sent_at.desc())) if convo else None
        row = {"person_id": str(uid), "person": person_card(db, other).model_dump(),
               "conversation_id": str(convo.id) if convo else None, "last_message_at": iso(last) if last else None}
        recent = last is not None and (last if last.tzinfo else last.replace(tzinfo=week_ago.tzinfo)) >= week_ago
        (in_talks if recent else connected).append(row)
    reqs = list(db.scalars(
        select(ConnectionRequest)
        .where(ConnectionRequest.status == "pending", or_(ConnectionRequest.from_user_id == viewer.id, ConnectionRequest.to_user_id == viewer.id))
        .order_by(ConnectionRequest.created_at.desc())
    ))
    return {
        "connected": connected,
        "in_talks": in_talks,
        "received": [_req_out(db, r, viewer.id) for r in reqs if r.to_user_id == viewer.id],
        "sent": [_req_out(db, r, viewer.id) for r in reqs if r.from_user_id == viewer.id],
    }


# ── Opportunities ───────────────────────────────────────────────────────


def _fit(opp: Opportunity, words: set[str]) -> str | None:
    tags = {t.strip().lower() for t in opp.tags.split(",") if t.strip()}
    hits = sorted(t for t in tags if t in words or any(w.startswith(t) for w in words))
    return ", ".join(hits[:3]) if hits else None


def _opp_out(db: Session, o: Opportunity, viewer_id: uuid.UUID, words: set[str], full: bool = False) -> dict:
    resp = db.scalar(select(OpportunityResponse).where(OpportunityResponse.opportunity_id == o.id, OpportunityResponse.user_id == viewer_id))
    fit = _fit(o, words)
    out = {"id": str(o.id), "kind": o.kind, "title": o.title, "posted_by": o.posted_by, "summary": o.summary,
           "closes_on": o.closes_on.isoformat() if o.closes_on else None, "saved": bool(resp and resp.saved),
           "interested": bool(resp and resp.interested_at), "for_you": fit is not None}
    if full:
        out.update({
            "what_they_need": o.what_they_need, "timeline": o.timeline, "how_to_respond": o.how_to_respond,
            "fit": None if fit is None else {"reason": f"It touches what's in your District: {fit}.", "confidence": "low",
                                              "rests_on": "Keywords in your District, not a full read"},
        })
    return out


def opportunities(db: Session, viewer: User) -> list[dict]:
    words = _words(" ".join(s.value for s in _state(db, viewer.id)))
    rows = list(db.scalars(select(Opportunity).where(Opportunity.archived_at.is_(None)).order_by(Opportunity.created_at.desc())))
    out = [_opp_out(db, o, viewer.id, words) for o in rows]
    out.sort(key=lambda o: not o["for_you"])
    return out


def _open_opp(db: Session, opp_id: uuid.UUID) -> Opportunity:
    o = db.get(Opportunity, opp_id)
    if o is None or o.archived_at is not None:
        raise NotFound("That opportunity has closed.")
    return o


def opportunity(db: Session, viewer: User, opp_id: uuid.UUID) -> dict:
    o = _open_opp(db, opp_id)
    return _opp_out(db, o, viewer.id, _words(" ".join(s.value for s in _state(db, viewer.id))), full=True)


def respond_opportunity(db: Session, viewer: User, opp_id: uuid.UUID, saved: bool | None, interested: bool | None, note: str | None) -> dict:
    o = _open_opp(db, opp_id)
    r = db.scalar(select(OpportunityResponse).where(OpportunityResponse.opportunity_id == o.id, OpportunityResponse.user_id == viewer.id))
    if r is None:
        r = OpportunityResponse(opportunity_id=o.id, user_id=viewer.id)
        db.add(r)
    if saved is not None:
        r.saved = saved
    if interested is not None:
        r.interested_at = utcnow() if interested else None
        if not interested:
            r.note = ""  # withdrawing takes your note back too
    if note is not None:
        r.note = note.strip()
    interactions.record(db, "opportunity_response", user_id=viewer.id, entity_type="opportunity", entity_id=o.id,
                        saved=r.saved, interested=r.interested_at is not None)
    db.commit()
    return opportunity(db, viewer, opp_id)


# ── Admin: opportunities ────────────────────────────────────────────────


def admin_opportunities(db: Session) -> list[dict]:
    out = []
    for o in db.scalars(select(Opportunity).order_by(Opportunity.created_at.desc())):
        interested = db.execute(
            select(User.name, OpportunityResponse.note, OpportunityResponse.interested_at)
            .join(User, User.id == OpportunityResponse.user_id)
            .where(OpportunityResponse.opportunity_id == o.id, OpportunityResponse.interested_at.is_not(None))
        )
        out.append({"id": str(o.id), "kind": o.kind, "title": o.title, "posted_by": o.posted_by, "summary": o.summary,
                    "closes_on": o.closes_on.isoformat() if o.closes_on else None, "archived": o.archived_at is not None,
                    "tags": o.tags, "interested": [{"name": n, "note": note, "at": iso(at)} for n, note, at in interested]})
    return out


def add_opportunity(db: Session, data: dict) -> dict:
    o = Opportunity(**{k: (v.strip() if isinstance(v, str) else v) for k, v in data.items()})
    db.add(o)
    db.commit()
    return {"id": str(o.id)}


def archive_opportunity(db: Session, opp_id: uuid.UUID) -> None:
    o = db.get(Opportunity, opp_id)
    if o is None:
        raise NotFound("No such opportunity.")
    o.archived_at = utcnow()
    db.commit()

