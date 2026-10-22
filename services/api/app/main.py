from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.services.ai.client import AIError
from app.services.errors import Conflict, NotFound


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AIError)
    async def ai_error(_: Request, exc: AIError) -> JSONResponse:
        # The real reason is in ai_calls.error; clients get a stable code to show a retry.
        return JSONResponse(status_code=503, content={"error": "ai_unavailable", "detail": str(exc)})

    @app.exception_handler(NotFound)
    async def not_found(_: Request, exc: NotFound) -> JSONResponse:
        return JSONResponse(status_code=404, content={"error": "not_found", "detail": str(exc)})

    @app.exception_handler(Conflict)
    async def conflict(_: Request, exc: Conflict) -> JSONResponse:
        return JSONResponse(status_code=409, content={"error": "conflict", "detail": str(exc)})

    app.include_router(api_router)
    return app


app = create_app()
