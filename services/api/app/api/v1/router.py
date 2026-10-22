from fastapi import APIRouter

from app.api.v1.routes import health

api_router = APIRouter(prefix="/v1")
api_router.include_router(health.router)

# Feature routers are added here as they are built:
#   discovery        — context answers, situations, choices        (demo)
#   id               — Person, State, Gaps for the signed-in user  (demo)
#   recommendations  — intersections, no-match, Tell me more       (demo)
#   admin            — human review of proposed matches
#   conversations    — messaging opened by accepted introductions
