"""The AI, not a fixed order, chooses what discovery probes next."""

import json

import pytest

from app.api.deps import get_ai
from app.main import app
from app.models import AiCall, InformationGap, Interaction, Situation
from app.services.ai.client import AIClient
from app.services.ai.providers.base import ProviderResponse

OPTIONS = [{"id": x, "text": f"Option {x}", "signal": f"Signal {x}"} for x in "ABCD"]


def situation(dimension: str, gap_question: str = "") -> str:
    return json.dumps({
        "dimension": dimension, "gap_question": gap_question, "consequence": "Something happened.",
        "why_asking": "Because.", "situation": "A situation.", "question": "What now?", "options": OPTIONS,
    })


class ScriptedProvider:
    """Returns the queued replies in order and records what it was asked."""

    name = "scripted"

    def __init__(self, replies: list[str]):
        self.replies = replies
        self.prompts: list[str] = []

    def complete(self, request):
        self.prompts.append(request.prompt)
        return ProviderResponse(text=self.replies.pop(0), model="scripted")


@pytest.fixture
def scripted(db):
    def use(replies):
        provider = ScriptedProvider(replies)
        app.dependency_overrides[get_ai] = lambda: AIClient(db, provider)
        return provider

    yield use
    app.dependency_overrides.pop(get_ai, None)


def _founder(client) -> str:
    founder_id = client.post("/v1/founders", json={"name": "Abdul"}).json()["id"]
    client.post("/v1/discovery/context", json={"founder_id": founder_id, "working_on": "Idea District",
                                               "hoping_for": "50 founders", "in_the_way": "No CTO"})
    return founder_id


def _answer(client, founder_id, s):
    client.post(f"/v1/discovery/situations/{s['situation_id']}/choice", json={"founder_id": founder_id, "option_id": "A"})


def test_ai_can_skip_the_priority_order(client, db, scripted):
    provider = scripted([situation("Risk orientation")])  # a priority-2 gap, chosen first
    founder_id = _founder(client)
    s = client.post("/v1/discovery/sessions", json={"founder_id": founder_id}).json()

    assert s["dimension"] == "Risk orientation"
    sent = provider.prompts[0]
    assert '"dimension": "Decision making"' in sent and '"priority": 1' in sent  # it saw every open gap
    statuses = {g.dimension: g.status for g in db.query(InformationGap).all()}
    assert statuses["Risk orientation"] == "probing" and statuses["Decision making"] == "open"
    shown = db.query(Interaction).filter_by(event_type="situation_shown").one()
    assert shown.metadata_["topic_chosen_from"] == "open_gap"
    assert db.query(Situation).one().prompt_version.startswith("situation@")


def test_ai_can_raise_a_new_gap(client, db, scripted):
    scripted([situation("Decision making"), situation("Need for control", "How much control you need over the product.")])
    founder_id = _founder(client)
    first = client.post("/v1/discovery/sessions", json={"founder_id": founder_id}).json()
    _answer(client, founder_id, first)
    second = client.post(f"/v1/discovery/sessions/{first['session_id']}/next", json={}).json()

    assert second["dimension"] == "Need for control"
    new_gap = db.query(InformationGap).filter_by(dimension="Need for control").one()
    assert new_gap.question == "How much control you need over the product." and new_gap.status == "probing"
    assert db.query(Interaction).filter_by(event_type="situation_shown").all()[-1].metadata_["topic_chosen_from"] == "new_gap"


def test_same_topic_twice_in_a_row_is_retried(client, db, scripted):
    scripted([situation("Decision making"), situation("Decision making"), situation("Conflict handling")])
    founder_id = _founder(client)
    first = client.post("/v1/discovery/sessions", json={"founder_id": founder_id}).json()
    _answer(client, founder_id, first)
    second = client.post(f"/v1/discovery/sessions/{first['session_id']}/next", json={}).json()

    assert second["dimension"] == "Conflict handling"
    failed = db.query(AiCall).filter_by(status="failed").one()
    assert "twice in a row" in failed.error


def test_new_topic_without_a_question_is_retried(client, db, scripted):
    scripted([situation("Something vague"), situation("Execution vs learning")])
    founder_id = _founder(client)
    s = client.post("/v1/discovery/sessions", json={"founder_id": founder_id}).json()
    assert s["dimension"] == "Execution vs learning"
    assert "needs a gap_question" in db.query(AiCall).filter_by(status="failed").one().error
