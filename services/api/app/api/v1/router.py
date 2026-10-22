from fastapi import APIRouter

from app.api.v1.routes import discovery, founder_id, founders, health, recommendations

api_router = APIRouter(prefix="/v1")
api_router.include_router(health.router)
api_router.include_router(founders.router)
api_router.include_router(discovery.router)
api_router.include_router(founder_id.router)
api_router.include_router(recommendations.router)

# Still to come: admin (human review of proposed matches), conversations (opened by accepted
# introductions), auth (Supabase phone OTP replaces the demo's founder_id).
