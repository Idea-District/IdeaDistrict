import pytest

from app.models import AiCall
from app.services.ai.client import AIClient, AIError, extract_json
from app.services.ai.providers.base import ProviderResponse


def test_extract_json_ignores_surrounding_prose():
    assert extract_json('Sure! {"a": {"b": 1}} hope that helps') == {"a": {"b": 1}}


class FlakyProvider:
    """Truncated first, valid second — the client must retry once and succeed."""

    name = "flaky"

    def __init__(self):
        self.calls = 0

    def complete(self, request):
        self.calls += 1
        if self.calls == 1:
            return ProviderResponse(text='{"ok": tr', model="m", stop_reason="max_tokens")
        return ProviderResponse(text='{"ok": true}', model="m")


class BrokenProvider:
    name = "broken"

    def complete(self, request):
        return ProviderResponse(text="no json here", model="m")


def run(client):
    return client.run(purpose="ping", prompt_key="ping", variables={}, schema={"required": ["ok"]})


def test_retries_once_after_truncation(db):
    assert run(AIClient(db, FlakyProvider())) == {"ok": True}
    statuses = [c.status for c in db.query(AiCall).order_by(AiCall.created_at)]
    assert statuses == ["failed", "retried"]


def test_raises_real_error_after_retry(db):
    with pytest.raises(AIError, match="no JSON object"):
        run(AIClient(db, BrokenProvider()))
    assert db.query(AiCall).count() == 2
