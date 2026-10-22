from fastapi import APIRouter

from app.api.v1.routes import (
    conversations,
    discovery,
    founder_id,
    founders,
    health,
    outcomes,
    privacy,
    recommendations,
)

api_router = APIRouter(prefix="/v1")
api_router.include_router(health.router)
api_router.include_router(founders.router)
api_router.include_router(discovery.router)
api_router.include_router(founder_id.router)
api_router.include_router(recommendations.router)
api_router.include_router(outcomes.router)
api_router.include_router(conversations.router)
api_router.include_router(privacy.router)

# Still to come: admin (human review of proposed matches) and auth (Supabase phone OTP
# replaces the demo's founder_id).
