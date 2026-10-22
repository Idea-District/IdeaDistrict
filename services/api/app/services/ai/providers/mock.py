"""Offline provider: scripted, schema-shaped answers so the app runs end to end
with no API key. Used for local development, tests and as a demo fallback."""

import json

from app.services.ai.providers.base import ProviderRequest, ProviderResponse

FIXTURES: dict[str, dict] = {
    "ping": {"ok": True},
}


class MockProvider:
    name = "mock"

    def complete(self, request: ProviderRequest) -> ProviderResponse:
        payload = FIXTURES.get(request.purpose)
        if payload is None:
            raise LookupError(f"mock provider has no fixture for purpose '{request.purpose}'")
        text = json.dumps(payload)
        return ProviderResponse(
            text=text,
            model="mock-1",
            input_tokens=len(request.system + request.prompt) // 4,
            output_tokens=len(text) // 4,
        )
