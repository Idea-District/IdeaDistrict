import uuid
from typing import Literal

from fastapi import APIRouter

from app.api.deps import DB
from app.schemas.demo import (
    ChatMessageOut,
    ConversationOut,
    ConversationSummaryOut,
    FounderRef,
    SendMessageIn,
)
from app.services import interactions, messaging
from app.services.founders import get_founder

router = APIRouter(prefix="/conversations", tags=["messaging"])


class PierVisitIn(FounderRef):
    spot: Literal["lantern", "letterbox"]


@router.post("/visit")
def pier_visit(data: PierVisitIn, db: DB) -> dict:
    """The 3D Lantern Pier: the founder walked out to a lantern (a conversation) or the letterbox."""
    founder = get_founder(db, data.founder_id)
    interactions.record(db, "pier_spot_visited", user_id=founder.id, spot=data.spot)
    db.commit()
    return {"ok": True}


@router.get("", response_model=list[ConversationSummaryOut])
def list_conversations(founder_id: uuid.UUID, db: DB) -> list[ConversationSummaryOut]:
    get_founder(db, founder_id)
    return messaging.list_for(db, founder_id)


@router.get("/{conversation_id}", response_model=ConversationOut)
def read_conversation(conversation_id: uuid.UUID, founder_id: uuid.UUID, db: DB) -> ConversationOut:
    return messaging.read(db, conversation_id, founder_id)


@router.post("/{conversation_id}/messages", response_model=ChatMessageOut)
def send_message(conversation_id: uuid.UUID, data: SendMessageIn, db: DB) -> ChatMessageOut:
    return messaging.send(db, conversation_id, data.founder_id, data.body)
