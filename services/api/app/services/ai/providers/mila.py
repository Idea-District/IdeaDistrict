"""Mila Evolve (Kyma Media Group) — https://mila-evolve.com

Uses the native text endpoint because it supports structured JSON
(responseSchema) and thinking levels. Every call is stateless: we never use
Mila's server-side sessions, because the founder's history lives in our own
database as evidence and must not depend on any one AI vendor.
"""

import json

import httpx

from app.core.config import Settings
from app.services.ai.providers.base import ProviderRequest, ProviderResponse

DEFAULT_BASE_URL = "https://mila-evolve.com"
DEFAULT_MODEL = "mila-kronos"
COMPLETIONS_PATH = "/v1/mila-evolve-text/completions"

# Finish reasons that mean the output was cut off.
TRUNCATED = {"length", "max_tokens", "MAX_TOKENS"}


class MilaError(RuntimeError):
    pass


def to_mila_schema(schema: dict) -> dict:
    """JSON Schema → Mila's native responseSchema, which uses upper-case types (OBJECT, STRING…)."""
    out: dict = {}
    for key, value in schema.items():
        if key == "type" and isinstance(value, str):
            out[key] = value.upper()
        elif key == "properties" and isinstance(value, dict):
            out[key] = {name: to_mila_schema(prop) for name, prop in value.items()}
        elif key == "items" and isinstance(value, dict):
            out[key] = to_mila_schema(value)
        else:
            out[key] = value
    return out


class MilaProvider:
    name = "mila"

    def __init__(self, settings: Settings, transport: httpx.BaseTransport | None = None):
        if not settings.ai_api_key:
            raise MilaError("AI_PROVIDER=mila needs AI_API_KEY in services/api/.env")
        self.model = settings.ai_model or DEFAULT_MODEL
        self.thinking_level = settings.ai_thinking_level
        self.http = httpx.Client(
            base_url=settings.ai_base_url or DEFAULT_BASE_URL,
            headers={"Authorization": f"Bearer {settings.ai_api_key}"},
            timeout=settings.ai_timeout_seconds,
            transport=transport,
        )

    def complete(self, request: ProviderRequest) -> ProviderResponse:
        body: dict = {
            "model": request.model or self.model,
            "systemInstruction": request.system,
            "prompt": request.prompt,
            "thinkingLevel": request.metadata.get("thinking_level", self.thinking_level),
            "temperature": request.metadata.get("temperature", 0.4),
            "max_tokens": request.max_output_tokens,
        }
        # A schema with only "required" (e.g. the health ping) still asks for JSON, just unconstrained.
        body["responseMimeType"] = "application/json"
        if "properties" in request.json_schema:
            body["responseSchema"] = to_mila_schema(request.json_schema)

        res = self.http.post(COMPLETIONS_PATH, json=body)
        if res.status_code >= 400:
            raise MilaError(_describe_error(res))

        data = res.json()
        choice = (data.get("choices") or [{}])[0]
        # Prefer the gateway's own parsed copy; fall back to the raw text.
        parsed = data.get("parsed_json")
        text = json.dumps(parsed) if parsed is not None else (choice.get("message") or {}).get("content") or ""
        usage = data.get("usage") or {}

        return ProviderResponse(
            text=text,
            model=data.get("model") or body["model"],
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            stop_reason="max_tokens" if choice.get("finish_reason") in TRUNCATED else "end",
        )


def _describe_error(res: httpx.Response) -> str:
    """Mila returns a JSON error envelope; surface its code and message, not a generic failure."""
    try:
        err = res.json().get("error", {})
        if isinstance(err, dict):
            return f"Mila {res.status_code} {err.get('code', '')}: {err.get('message', '')}".strip()
        return f"Mila {res.status_code}: {err}"
    except ValueError:
        return f"Mila {res.status_code}: {res.text[:200]}"
