from fastapi import APIRouter

from app.api.v1.routes import (
    admin,
    ask,
    cafe,
    connect,
    conversations,
    discovery,
    district,
    founder_id,
    founders,
    health,
    investor,
    me,
    outcomes,
    privacy,
    recommendations,
    toolkit,
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
api_router.include_router(ask.router)
api_router.include_router(cafe.router)
api_router.include_router(district.router)
api_router.include_router(admin.router)
api_router.include_router(admin.topics_router)
api_router.include_router(toolkit.router)
api_router.include_router(connect.router)
api_router.include_router(admin.opps_router)
api_router.include_router(me.router)
api_router.include_router(investor.router)

# Still to come: admin (human review of proposed matches) and auth (Supabase phone OTP
# replaces the demo's founder_id).
