"""Messaging. A conversation exists only because an introduction was accepted — no cold messages."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.base import iso, utcnow
from app.models import Conversation, ConversationParticipant, Message, Recommendation, User
from app.schemas.demo import ChatMessageOut, ConversationOut, ConversationSummaryOut
from app.services import interactions
from app.services.errors import NotFound
from app.services.people import person_card


def open_for(db: Session, rec: Recommendation) -> Conversation:
    """Idempotent: one conversation per accepted introduction."""
    existing = db.scalar(select(Conversation).where(Conversation.origin_recommendation_id == rec.id))
    if existing:
        return existing
    convo = Conversation(origin_recommendation_id=rec.id)
    db.add(convo)
    db.flush()
    for user_id in (rec.user_a_id, rec.user_b_id):
        db.add(ConversationParticipant(conversation_id=convo.id, user_id=user_id))
    interactions.record(db, "conversation_opened", user_id=rec.user_a_id, entity_type="conversation", entity_id=convo.id)
    return convo


def list_for(db: Session, founder_id: uuid.UUID) -> list[ConversationSummaryOut]:
    rows = db.execute(
        select(Conversation, ConversationParticipant)
        .join(ConversationParticipant, ConversationParticipant.conversation_id == Conversation.id)
        .where(ConversationParticipant.user_id == founder_id)
        .order_by(func.coalesce(Conversation.last_message_at, Conversation.created_at).desc())
    )
    out = []
    for convo, me in rows:
        rec = db.get(Recommendation, convo.origin_recommendation_id)
        last = db.scalar(select(Message).where(Message.conversation_id == convo.id).order_by(Message.sent_at.desc()))
        unread_q = select(func.count()).where(Message.conversation_id == convo.id, Message.sender_id != founder_id)
        if me.last_read_at:
            unread_q = unread_q.where(Message.sent_at > me.last_read_at)
        out.append(
            ConversationSummaryOut(
                id=convo.id,
                with_=person_card(db, _other(db, rec, founder_id)),
                origin=_origin(db, rec, founder_id),
                last_message=last.body if last else None,
                last_message_at=iso(last.sent_at) if last else None,
                unread=db.scalar(unread_q) or 0,
            )
        )
    return out


def read(db: Session, conversation_id: uuid.UUID, founder_id: uuid.UUID) -> ConversationOut:
    convo, me = _membership(db, conversation_id, founder_id)
    rec = db.get(Recommendation, convo.origin_recommendation_id)
    messages = db.scalars(select(Message).where(Message.conversation_id == convo.id).order_by(Message.sent_at))
    me.last_read_at = utcnow()
    db.commit()
    return ConversationOut(
        id=convo.id,
        with_=person_card(db, _other(db, rec, founder_id)),
        origin=_origin(db, rec, founder_id),
        introduced_at=iso(rec.responded_at or rec.created_at),
        messages=[_message_out(m, founder_id) for m in messages],
    )


def send(db: Session, conversation_id: uuid.UUID, founder_id: uuid.UUID, body: str) -> ChatMessageOut:
    convo, me = _membership(db, conversation_id, founder_id)
    message = Message(conversation_id=convo.id, sender_id=founder_id, body=body.strip())
    db.add(message)
    convo.last_message_at = message.sent_at = utcnow()
    me.last_read_at = message.sent_at
    db.flush()
    # Metadata only: message bodies are never mined for the ID without explicit consent.
    interactions.record(
        db, "message_sent", user_id=founder_id, entity_type="conversation", entity_id=convo.id, length=len(message.body)
    )
    db.commit()
    return _message_out(message, founder_id)


def _membership(db: Session, conversation_id: uuid.UUID, founder_id: uuid.UUID):
    convo = db.get(Conversation, conversation_id)
    me = db.scalar(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id, ConversationParticipant.user_id == founder_id
        )
    )
    if convo is None or me is None:
        raise NotFound("Conversation not found.")
    return convo, me


def _other(db: Session, rec: Recommendation, founder_id: uuid.UUID) -> User:
    return db.get(User, rec.user_b_id if rec.user_a_id == founder_id else rec.user_a_id)


def _origin(db: Session, rec: Recommendation, founder_id: uuid.UUID) -> str:
    # why_them was written for the founder who received the suggestion; the other side gets a neutral line.
    if rec.user_a_id == founder_id:
        return rec.why_them
    return f"{db.get(User, rec.user_a_id).name} asked to meet you · {rec.match_type}"


def _message_out(m: Message, founder_id: uuid.UUID) -> ChatMessageOut:
    return ChatMessageOut(id=m.id, from_me=m.sender_id == founder_id, body=m.body, sent_at=iso(m.sent_at))
