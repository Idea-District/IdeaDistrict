import uuid

from fastapi import APIRouter

from app.api.deps import DB
from app.schemas.demo import PrivacyIn, PrivacyOut
from app.services import privacy
from app.services.founders import get_founder

router = APIRouter(prefix="/privacy", tags=["privacy"])


@router.get("", response_model=PrivacyOut)
def read_privacy(founder_id: uuid.UUID, db: DB) -> PrivacyOut:
    get_founder(db, founder_id)
    return privacy.read(db, founder_id)


@router.post("", response_model=PrivacyOut)
def update_privacy(data: PrivacyIn, db: DB) -> PrivacyOut:
    get_founder(db, data.founder_id)
    return privacy.update(db, data)
