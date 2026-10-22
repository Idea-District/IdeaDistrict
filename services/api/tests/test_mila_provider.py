"""Mila provider against a simulated gateway — no network, no key."""

import json

import httpx
import pytest

from app.core.config import Settings
from app.services.ai.providers.base import ProviderRequest
from app.services.ai.providers.mila import MilaError, MilaProvider, to_mila_schema

SCHEMA = {
    "type": "object",
    "properties": {"insight": {"type": "string"}, "tags": {"type": "array", "items": {"type": "string"}}},
    "required": ["insight"],
}


def provider(handler) -> MilaProvider:
    settings = Settings(ai_provider="mila", ai_api_key="test-key")
    return MilaProvider(settings, transport=httpx.MockTransport(handler))


def request() -> ProviderRequest:
    return ProviderRequest(purpose="t", system="sys", prompt="data", json_schema=SCHEMA, max_output_tokens=300)


def test_schema_types_are_upper_cased_recursively():
    out = to_mila_schema(SCHEMA)
    assert out["type"] == "OBJECT"
    assert out["properties"]["tags"]["items"]["type"] == "STRING"
    assert out["required"] == ["insight"]


def test_sends_auth_and_structured_request_and_reads_parsed_json():
    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["auth"] = req.headers["authorization"]
        seen["path"] = req.url.path
        seen["body"] = json.loads(req.content)
        return httpx.Response(
            200,
            json={
                "model": "mila-kronos",
                "choices": [{"message": {"content": "ignored"}, "finish_reason": "stop"}],
                "parsed_json": {"insight": "ok"},
                "usage": {"prompt_tokens": 12, "completion_tokens": 5},
            },
        )

    res = provider(handler).complete(request())
    assert seen["auth"] == "Bearer test-key"
    assert seen["path"] == "/v1/mila-evolve-text/completions"
    assert seen["body"]["systemInstruction"] == "sys"
    assert seen["body"]["responseSchema"]["type"] == "OBJECT"
    assert seen["body"]["max_tokens"] == 300
    assert json.loads(res.text) == {"insight": "ok"}
    assert (res.input_tokens, res.output_tokens) == (12, 5)
    assert res.stop_reason == "end"


def test_truncation_is_reported():
    def handler(_):
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"ins'}, "finish_reason": "length"}]})

    assert provider(handler).complete(request()).stop_reason == "max_tokens"


def test_error_envelope_is_surfaced():
    def handler(_):
        return httpx.Response(
            429, json={"error": {"code": "MILA_RATE_LIMIT_EXCEEDED", "message": "RPM quota exceeded"}}
        )

    with pytest.raises(MilaError, match="429 MILA_RATE_LIMIT_EXCEEDED: RPM quota exceeded"):
        provider(handler).complete(request())


def test_missing_key_fails_fast():
    with pytest.raises(MilaError, match="needs AI_API_KEY"):
        MilaProvider(Settings(ai_provider="mila", ai_api_key=""))
