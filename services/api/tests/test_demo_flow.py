"""The whole demo journey through the HTTP API, on the offline AI provider."""

from app.models import Choice, IdState, Interaction, NoMatchLog, Recommendation, Signal, User


def _start(client) -> str:
    founder = client.post("/v1/founders", json={"name": "Abdul"}).json()
    res = client.post(
        "/v1/discovery/context",
        json={
            "founder_id": founder["id"],
            "working_on": "Idea District, a community manager for founders in Bengaluru",
            "hoping_for": "Launch to 50 founders and prove the introductions are useful",
            "in_the_way": "No technical co-founder and a small budget",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert [k["source"] for k in body["known"]] == ["declared"] * 3
    assert len(body["unknown"]) == 5
    return founder["id"]


def test_full_discovery_build_and_recommendation(client, db):
    founder_id = _start(client)

    situation = client.post("/v1/discovery/sessions", json={"founder_id": founder_id}).json()
    assert situation["sequence_no"] == 1 and situation["total"] == 5
    assert situation["consequence"] is None
    assert [o["id"] for o in situation["options"]] == ["A", "B", "C", "D", "E"]
    assert situation["options"][-1]["text"] == "Something else."

    for n in range(1, 6):
        # Prefetching twice must not create two situations.
        if n > 1:
            again = client.post(f"/v1/discovery/sessions/{situation['session_id']}/next", json={}).json()
            assert again["situation_id"] == situation["situation_id"]
        result = client.post(
            f"/v1/discovery/situations/{situation['situation_id']}/choice",
            json={"founder_id": founder_id, "option_id": "B", "why": "Evidence first", "response_time_ms": 4200},
        ).json()
        assert result["signal"]["confidence"] == 0.35
        assert result["done"] is (n == 5)
        if n < 5:
            situation = client.post(f"/v1/discovery/sessions/{situation['session_id']}/next", json={}).json()
            assert situation["sequence_no"] == n + 1
            assert situation["consequence"]  # the story moves on

    # Discovery is complete: no sixth situation.
    assert client.post(f"/v1/discovery/sessions/{situation['session_id']}/next", json={}).status_code == 409

    choice = db.query(Choice).filter_by(user_id=db.get(User, _uuid(founder_id)).id).first()
    assert choice.response_time_ms == 4200 and len(choice.not_chosen) == 4
    known = client.get("/v1/discovery/known", params={"founder_id": founder_id}).json()
    assert sum(k["source"] == "observed" for k in known["known"]) == 5
    assert known["unknown"] == []  # every gap has been probed

    built = client.post("/v1/id/build", json={"founder_id": founder_id}).json()
    assert built["decisions"] == 5 and built["headline"] and built["built_at"]
    assert any(p["evidence"] == "Never tested" for p in built["person"])
    assert {s["source"] for s in built["state"]} == {"declared", "inferred"}
    assert built["gaps"] and built["overall_confidence"] == "developing"

    # No other founders yet: an honest no-match, logged.
    rec = client.get("/v1/recommendations", params={"founder_id": founder_id}).json()
    assert rec["kind"] == "none" and rec["reasons"]
    assert db.query(NoMatchLog).count() == 1

    # Tell me more adds a secondary facet, and the ID change makes recommendations re-run.
    after = client.post(
        "/v1/id/tell-me-more", json={"founder_id": founder_id, "text": "I'm also a brand designer."}
    ).json()
    assert any(s["facet"] == "secondary" and s["source"] == "declared" for s in after["state"])
    assert db.query(Signal).filter_by(source_type="tell_me_more").count() == 1

    events = {e.event_type for e in db.query(Interaction).all()}
    assert {"founder_created", "context_answered", "choice_made", "id_built", "no_match", "tell_me_more"} <= events


def test_match_with_another_founder_and_respond(client, db):
    other = User(name="Vikram Shetty", city="Bengaluru")
    db.add(other)
    db.flush()
    db.add(IdState(user_id=other.id, field="project", value="AI tools for CA firms", confidence="high", source="declared"))
    db.add(IdState(user_id=other.id, field="stage", value="Pre-seed", confidence="high", source="declared"))
    from app.models import IdAttribute

    db.add(IdAttribute(user_id=other.id, dimension="Execution", insight="Ships fast.", confidence="medium",
                       strength=0.5, evidence_summary="4 of 5", version=1))
    db.commit()

    founder_id = _start(client)
    situation = client.post("/v1/discovery/sessions", json={"founder_id": founder_id}).json()
    client.post(f"/v1/discovery/situations/{situation['situation_id']}/choice",
                json={"founder_id": founder_id, "option_id": "A"})
    client.post("/v1/id/build", json={"founder_id": founder_id})

    rec = client.get("/v1/recommendations", params={"founder_id": founder_id}).json()
    assert rec["kind"] == "match"
    assert rec["person"] == {"name": "Vikram Shetty", "building": "AI tools for CA firms", "stage": "Pre-seed", "city": "Bengaluru"}
    # Asking again without an ID change reuses the answer instead of another AI call.
    assert client.get("/v1/recommendations", params={"founder_id": founder_id}).json()["id"] == rec["id"]

    assert client.post(f"/v1/recommendations/{rec['id']}/respond",
                       json={"founder_id": founder_id, "response": "accept"}).json() == {"ok": True}
    assert db.get(Recommendation, _uuid(rec["id"])).status == "accepted"


def test_errors_are_clear(client):
    missing = "00000000-0000-0000-0000-000000000000"
    res = client.post("/v1/discovery/sessions", json={"founder_id": missing})
    assert res.status_code == 404 and res.json()["error"] == "not_found"

    founder_id = _start(client)
    res = client.get("/v1/recommendations", params={"founder_id": founder_id})
    assert res.status_code == 409 and "Build your ID" in res.json()["detail"]


def _uuid(value: str):
    import uuid

    return uuid.UUID(value)
