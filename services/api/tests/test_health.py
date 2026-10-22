from app.models import AiCall


def test_health(client):
    res = client.get("/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_ai_round_trip_is_logged(client, db):
    res = client.post("/v1/health/ai")
    assert res.status_code == 200
    assert res.json() == {"ok": True}
    call = db.query(AiCall).one()
    assert call.purpose == "ping"
    assert call.status == "ok"
    assert call.prompt_version == "ping@file"
