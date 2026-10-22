from fastapi import APIRouter

from app.api.deps import DB
from app.models import User, UserPrivacySettings
from app.schemas.demo import FounderIn, FounderOut
from app.services import interactions

router = APIRouter(tags=["founders"])


@router.post("/founders", response_model=FounderOut)
def create_founder(data: FounderIn, db: DB) -> FounderOut:
    """Demo only: no login yet — a founder is created by name and the client keeps the id."""
    founder = User(name=data.name.strip(), city="Bengaluru", country="India", onboarding_stage="context")
    db.add(founder)
    db.flush()
    db.add(UserPrivacySettings(user_id=founder.id))  # investor visibility off by default
    interactions.record(db, "founder_created", user_id=founder.id)
    db.commit()
    return FounderOut(id=founder.id, name=founder.name)
