"""Privacy, "rings true", messaging opened by an introduction, and outcomes reaching VALIDATED."""

import pytest

from app.core.config import get_settings
from app.models import IdAttribute, IdState, Signal, User


@pytest.fixture
def founder_with_match(client, db):
    """A founder who has built an ID and been matched with Vikram."""
    vikram = User(name="Vikram Shetty", city="Bengaluru")
    db.add(vikram)
    db.flush()
    db.add(IdState(user_id=vikram.id, field="project", value="AI tools for CA firms", confidence="high", source="declared"))
    db.add(IdAttribute(user_id=vikram.id, dimension="Execution", insight="Ships fast.", confidence="medium",
                       strength=0.5, evidence_summary="4 of 5", version=1))
    db.commit()

    founder_id = client.post("/v1/founders", json={"name": "Abdul"}).json()["id"]
    client.post("/v1/discovery/context", json={"founder_id": founder_id, "working_on": "Idea District",
                                               "hoping_for": "50 founders", "in_the_way": "No CTO"})
    situation = client.post("/v1/discovery/sessions", json={"founder_id": founder_id}).json()
    client.post(f"/v1/discovery/situations/{situation['situation_id']}/choice",
                json={"founder_id": founder_id, "option_id": "B"})
    client.post("/v1/id/build", json={"founder_id": founder_id})
    rec = client.get("/v1/recommendations", params={"founder_id": founder_id}).json()
    assert rec["kind"] == "match"
    return founder_id, rec, vikram


def test_rings_true_is_saved_on_the_id(client, founder_with_match):
    founder_id, _, _ = founder_with_match
    assert client.get("/v1/id", params={"founder_id": founder_id}).json()["rings_true"] is None
    client.post("/v1/id/rings-true", json={"founder_id": founder_id, "answer": "partly"})
    client.post("/v1/id/rings-true", json={"founder_id": founder_id, "answer": "yes"})
    assert client.get("/v1/id", params={"founder_id": founder_id}).json()["rings_true"] == "yes"


def test_privacy_defaults_and_pausing_introductions(client, founder_with_match):
    founder_id, _, _ = founder_with_match
    privacy = client.get("/v1/privacy", params={"founder_id": founder_id}).json()
    assert privacy == {"id_visible_to_investors": False, "state_visible_to_investors": False,
                       "allow_introductions": True}

    updated = client.post("/v1/privacy", json={"founder_id": founder_id, "allow_introductions": False}).json()
    assert updated["allow_introductions"] is False and updated["id_visible_to_investors"] is False
    rec = client.get("/v1/recommendations", params={"founder_id": founder_id}).json()
    assert rec["kind"] == "none" and "paused introductions" in rec["reasons"][0]


def test_paused_members_are_never_suggested(client, db, founder_with_match):
    founder_id, rec, vikram = founder_with_match
    client.post(f"/v1/recommendations/{rec['id']}/respond", json={"founder_id": founder_id, "response": "decline"})
    client.post("/v1/privacy", json={"founder_id": str(vikram.id), "allow_introductions": False})
    # Vikram is both declined and paused; nobody else exists.
    assert client.get("/v1/recommendations", params={"founder_id": founder_id}).json()["kind"] == "none"


def test_accepted_introduction_opens_a_conversation(client, founder_with_match):
    founder_id, rec, vikram = founder_with_match
    convo_id = client.post(f"/v1/recommendations/{rec['id']}/respond",
                           json={"founder_id": founder_id, "response": "accept"}).json()["conversation_id"]
    # Retrying the accept returns the same conversation.
    again = client.post(f"/v1/recommendations/{rec['id']}/respond",
                        json={"founder_id": founder_id, "response": "accept"}).json()
    assert again["conversation_id"] == convo_id

    listing = client.get("/v1/conversations", params={"founder_id": founder_id}).json()
    assert len(listing) == 1 and listing[0]["with"]["name"] == "Vikram Shetty"
    assert listing[0]["origin"] == rec["why_them"] and listing[0]["last_message"] is None

    sent = client.post(f"/v1/conversations/{convo_id}/messages",
                       json={"founder_id": founder_id, "body": "Hi Vikram — free Thursday?"}).json()
    assert sent["from_me"] is True

    # Vikram sees it as unread, with a neutral origin line (not the text written for Abdul).
    theirs = client.get("/v1/conversations", params={"founder_id": str(vikram.id)}).json()[0]
    assert theirs["unread"] == 1 and theirs["origin"].startswith("Abdul asked to meet you")
    thread = client.get(f"/v1/conversations/{convo_id}", params={"founder_id": str(vikram.id)}).json()
    assert [m["from_me"] for m in thread["messages"]] == [False]
    assert client.get("/v1/conversations", params={"founder_id": str(vikram.id)}).json()[0]["unread"] == 0

    stranger = client.post("/v1/founders", json={"name": "Stranger"}).json()["id"]
    assert client.get(f"/v1/conversations/{convo_id}", params={"founder_id": stranger}).status_code == 404


def test_outcome_survey_validates_evidence(client, db, founder_with_match, monkeypatch):
    founder_id, rec, _ = founder_with_match
    client.post(f"/v1/recommendations/{rec['id']}/respond", json={"founder_id": founder_id, "response": "accept"})

    # Not due yet with the real 12-day delay.
    assert client.get("/v1/outcomes/pending", params={"founder_id": founder_id}).json() == []
    monkeypatch.setattr(get_settings(), "outcome_survey_delay_days", 0)
    pending = client.get("/v1/outcomes/pending", params={"founder_id": founder_id}).json()
    assert [p["recommendation_id"] for p in pending] == [rec["id"]]

    result = client.post(f"/v1/recommendations/{rec['id']}/outcome", json={
        "founder_id": founder_id, "did_meet": True, "was_useful": "very", "will_talk_again": "already"}).json()
    assert result["validated"] is True and "validated by a real meeting" in result["what_changed"]
    assert db.query(Signal).filter_by(signal_type="validated").count() == 1

    assert client.get("/v1/outcomes/pending", params={"founder_id": founder_id}).json() == []
    dup = client.post(f"/v1/recommendations/{rec['id']}/outcome", json={"founder_id": founder_id, "did_meet": False})
    assert dup.status_code == 409


def test_no_meeting_is_not_counted(client, founder_with_match, monkeypatch):
    founder_id, rec, _ = founder_with_match
    client.post(f"/v1/recommendations/{rec['id']}/respond", json={"founder_id": founder_id, "response": "accept"})
    monkeypatch.setattr(get_settings(), "outcome_survey_delay_days", 0)
    result = client.post(f"/v1/recommendations/{rec['id']}/outcome",
                         json={"founder_id": founder_id, "did_meet": False}).json()
    assert result == {"validated": False, "what_changed": "No meeting yet, so we won't count it either way."}


def test_after_accepting_the_next_suggestion_is_someone_new(client, db, founder_with_match):
    founder_id, rec, vikram = founder_with_match
    farah = User(name="Farah Siddiqui", city="Bengaluru")
    db.add(farah)
    db.flush()
    db.add(IdAttribute(user_id=farah.id, dimension="Ops", insight="Runs field teams.", confidence="medium",
                       strength=0.5, evidence_summary="3 of 5", version=1))
    db.commit()
    client.post(f"/v1/recommendations/{rec['id']}/respond", json={"founder_id": founder_id, "response": "accept"})

    nxt = client.get("/v1/recommendations", params={"founder_id": founder_id}).json()
    assert nxt["kind"] == "match" and nxt["person"]["name"] == "Farah Siddiqui"  # Vikram is already introduced
    assert len(client.get("/v1/conversations", params={"founder_id": founder_id}).json()) == 1
