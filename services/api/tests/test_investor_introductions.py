"""Investors are suggested only as funding introductions."""

import json

import pytest

from app.api.deps import get_ai
from app.main import app
from app.models import AiCall, IdAttribute, IdState, User
from app.services.ai.client import AIClient
from app.services.ai.providers.base import ProviderResponse


class Scripted:
    name = "scripted"

    def __init__(self, replies):
        self.replies, self.prompts = replies, []

    def complete(self, request):
        self.prompts.append(request.prompt)
        reply = self.replies.get(request.purpose)
        if isinstance(reply, list):
            reply = reply.pop(0)
        return ProviderResponse(text=json.dumps(reply), model="scripted")


SITUATION = {"dimension": "Decision making", "gap_question": "", "consequence": "", "why_asking": "Because.",
             "situation": "A situation.", "question": "What now?",
             "options": [{"id": x, "text": f"Option {x}", "signal": f"Signal {x}"} for x in "ABCD"]}
PERSON = {"headline": "You raise only when it counts.", "attributes": [
    {"dimension": "Risk", "insight": "x", "confidence": "low", "strength": 0.2, "evidence": "1", "facet": "primary"},
    {"dimension": "Delegation", "insight": "Not enough evidence yet to say.", "confidence": "low", "strength": 0.1,
     "evidence": "Never tested", "facet": "primary"}]}
STATE = {"state": [{"field": "need", "value": "Raising a seed round", "confidence": "high", "facet": "primary",
                    "source": "declared"}], "gaps": []}


def capital_match(match_type="NEED → CAPITAL"):
    return {"match": "M1", "match_type": match_type, "intent": "seek", "why_now": "You are raising now.",
            "why_them": "Lantern Ventures backs seed-stage SaaS.", "what_could_happen": "A first conversation about fit.",
            "confidence": "medium", "confidence_reason": "Fits stage; sector fit untested.", "no_match_reasons": []}


@pytest.fixture
def investor(db):
    ritu = User(name="Ritu Kapoor", organisation="Lantern Ventures", city="Bengaluru", user_type="investor")
    db.add(ritu)
    db.flush()
    db.add(IdState(user_id=ritu.id, field="project", value="Investing in B2B SaaS", confidence="high", source="declared"))
    db.add(IdState(user_id=ritu.id, field="stage", value="Investor · Seed", confidence="high", source="declared"))
    db.add(IdAttribute(user_id=ritu.id, dimension="Decision making", insight="Decides fast.", confidence="medium",
                       strength=0.5, evidence_summary="From conversations", version=1))
    db.commit()
    return ritu


def _run(client, db, match_replies):
    provider = Scripted({"situation": SITUATION, "build_person": PERSON, "build_state": STATE, "match": match_replies})
    app.dependency_overrides[get_ai] = lambda: AIClient(db, provider)
    try:
        fid = client.post("/v1/founders", json={"name": "Asha"}).json()["id"]
        client.post("/v1/discovery/context", json={"founder_id": fid, "working_on": "SaaS for clinics",
                                                   "hoping_for": "Raise a seed round", "in_the_way": "No investor network"})
        s = client.post("/v1/discovery/sessions", json={"founder_id": fid}).json()
        client.post(f"/v1/discovery/situations/{s['situation_id']}/choice", json={"founder_id": fid, "option_id": "A"})
        client.post("/v1/id/build", json={"founder_id": fid})
        return client.get("/v1/recommendations", params={"founder_id": fid}).json(), provider
    finally:
        app.dependency_overrides.pop(get_ai, None)


def test_investor_offered_for_a_funding_need(client, db, investor):
    rec, provider = _run(client, db, capital_match())
    assert rec["kind"] == "match" and rec["match_type"] == "NEED → CAPITAL"
    assert rec["person"]["role"] == "investor" and rec["person"]["name"] == "Ritu Kapoor"
    assert '"role": "investor"' in provider.prompts[-1]  # the model is told who is an investor


def test_investor_for_a_non_funding_need_is_rejected_and_retried(client, db, investor):
    rec, _ = _run(client, db, [capital_match("NEED → CAPABILITY"), {**capital_match(), "match": "NONE",
                                                                     "no_match_reasons": ["Nobody fits yet."]}])
    assert rec == {"kind": "none", "reasons": ["Nobody fits yet."]}
    failed = db.query(AiCall).filter_by(purpose="match", status="failed").one()
    assert "only be suggested as a funding" in failed.error


def test_investors_never_receive_suggestions(client, investor):
    rec = client.get("/v1/recommendations", params={"founder_id": str(investor.id)}).json()
    assert rec["kind"] == "none" and "Investors don't get suggestions" in rec["reasons"][0]


def test_no_match_after_passing_on_names_who_was_passed_on(client, db, investor):
    """Abdul's case: the founder declined the investor; the empty result must not pretend she doesn't exist."""
    none_reply = {**capital_match(), "match": "NONE", "no_match_reasons": ["No other investor backs this stage."]}
    rec, provider = _run(client, db, [capital_match(), none_reply])
    fid = db.query(User).filter_by(name="Asha").one().id
    app.dependency_overrides[get_ai] = lambda: AIClient(db, provider)
    try:
        client.post(f"/v1/recommendations/{rec['id']}/respond", json={"founder_id": str(fid), "response": "decline"})
        # Ritu was the only candidate, so the app answers without asking the model.
        again = client.get("/v1/recommendations", params={"founder_id": str(fid)}).json()
    finally:
        app.dependency_overrides.pop(get_ai, None)
    assert again == {"kind": "none", "reasons": ["You passed on Ritu Kapoor. Nobody else here fits as well yet."]}


def test_passed_on_people_are_named_to_the_model(client, db, investor):
    other = User(name="Vikram Shetty", city="Bengaluru")
    db.add(other)
    db.flush()
    db.add(IdAttribute(user_id=other.id, dimension="Execution", insight="Ships fast.", confidence="medium",
                       strength=0.5, evidence_summary="4 of 5", version=1))
    db.commit()
    none_reply = {**capital_match(), "match": "NONE", "no_match_reasons": ["Vikram doesn't back companies."]}
    rec, provider = _run(client, db, [capital_match(), none_reply])
    fid = db.query(User).filter_by(name="Asha").one().id
    app.dependency_overrides[get_ai] = lambda: AIClient(db, provider)
    try:
        client.post(f"/v1/recommendations/{rec['id']}/respond", json={"founder_id": str(fid), "response": "decline"})
        again = client.get("/v1/recommendations", params={"founder_id": str(fid)}).json()
    finally:
        app.dependency_overrides.pop(get_ai, None)
    assert 'already_passed_on: ["Ritu Kapoor"]' in provider.prompts[-1]
    assert again["reasons"] == ["You passed on Ritu Kapoor. Nobody else here fits as well yet.", "Vikram doesn't back companies."]
