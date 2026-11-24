"""People: visiting a District respects room settings, requests need both people, opportunities."""

import uuid

from tests.test_cafe import ADMIN
from tests.test_gap_probes import _founder_with_id


def _built(client) -> str:
    fid = _founder_with_id(client)
    return fid


def test_visitor_sees_only_rooms_shared_with_them(client, db):
    from app.models import User

    viewer, owner = _built(client), _built(client)
    db.get(User, uuid.UUID(owner)).onboarding_stage = "id_built"
    db.commit()
    # Defaults: business/needs/capabilities → connections only; journey/progress → private.
    v = client.get(f"/v1/people/{owner}/district", params={"founder_id": viewer}).json()
    assert v["relation"] == "none" and v["shared"] == [] and v["rooms"] == {}

    client.post("/v1/district/visibility", json={"founder_id": owner, "room": "needs", "audience": "community"})
    client.post("/v1/district/journey", json={"founder_id": owner, "kind": "decision", "title": "Private decision", "on": "2026-11-01"})
    v = client.get(f"/v1/people/{owner}/district", params={"founder_id": viewer}).json()
    assert v["shared"] == ["needs"] and "journey" not in v["rooms"]
    assert "Private decision" not in str(v)


def test_request_accept_opens_conversation_and_shares_connection_rooms(client):
    a, b = _built(client), _built(client)
    r = client.post("/v1/connections/requests", json={"founder_id": a, "to_user_id": b, "note": "Compare notes?"}).json()
    assert r["status"] == "pending" and r["direction"] == "sent"
    # Asking twice returns the same pending request; the other side can't send a crossing one.
    assert client.post("/v1/connections/requests", json={"founder_id": a, "to_user_id": b}).json()["id"] == r["id"]
    assert client.post("/v1/connections/requests", json={"founder_id": b, "to_user_id": a}).status_code == 409
    # Only the recipient can answer.
    assert client.post(f"/v1/connections/requests/{r['id']}/respond", json={"founder_id": a, "accept": True}).status_code == 404

    c = client.get("/v1/connections", params={"founder_id": b}).json()
    assert c["received"][0]["note"] == "Compare notes?"

    done = client.post(f"/v1/connections/requests/{r['id']}/respond", json={"founder_id": b, "accept": True}).json()
    assert done["status"] == "accepted" and done["conversation_id"]
    convos = client.get("/v1/conversations", params={"founder_id": a}).json()
    assert convos[0]["id"] == done["conversation_id"] and "both of you agreed" in convos[0]["origin"]

    # Now connected: "connections" rooms (business by default) are visible.
    v = client.get(f"/v1/people/{b}/district", params={"founder_id": a}).json()
    assert v["relation"] == "connected" and "business" in v["shared"]
    assert client.post("/v1/connections/requests", json={"founder_id": a, "to_user_id": b}).status_code == 409


def test_decline_and_withdraw(client):
    a, b, c = _built(client), _built(client), _built(client)
    r1 = client.post("/v1/connections/requests", json={"founder_id": a, "to_user_id": b}).json()
    assert client.post(f"/v1/connections/requests/{r1['id']}/respond", json={"founder_id": b, "accept": False}).json()["conversation_id"] is None
    r2 = client.post("/v1/connections/requests", json={"founder_id": a, "to_user_id": c}).json()
    assert client.post(f"/v1/connections/requests/{r2['id']}/withdraw", json={"founder_id": a}).json()["status"] == "withdrawn"
    assert client.get("/v1/connections", params={"founder_id": c}).json()["received"] == []


def test_meet_uses_low_confidence_when_little_is_shared(client):
    a, b = _built(client), _built(client)
    m = client.get(f"/v1/people/{b}/meet", params={"founder_id": a}).json()
    assert m["confidence"] == "low" and m["you_may_bring"] and m["rests_on"]


def test_explore_skips_self_and_connections(client):
    a = _built(client)
    e = client.get("/v1/people/explore", params={"founder_id": a}).json()
    assert all(p["id"] != a for p in e["picks"]) and e["next_picks_on"]


def test_opportunities_admin_respond_and_interest(client):
    assert client.post("/v1/admin/opportunities", json={}).status_code == 401
    oid = client.post("/v1/admin/opportunities", headers=ADMIN, json={
        "kind": "pilot_call", "title": "Inventory pilot", "posted_by": "An association",
        "summary": "Twenty units want to pilot an inventory tool.", "tags": "inventory,idea"}).json()["id"]
    a = _built(client)
    listing = client.get("/v1/opportunities", params={"founder_id": a}).json()
    assert listing[0]["id"] == oid
    d = client.post(f"/v1/opportunities/{oid}/respond", json={"founder_id": a, "interested": True, "note": "We do this", "saved": True}).json()
    assert d["interested"] is True and d["saved"] is True and "what_they_need" in d
    admin = client.get("/v1/admin/opportunities", headers=ADMIN).json()
    assert admin[0]["interested"][0]["note"] == "We do this"
    client.delete(f"/v1/admin/opportunities/{oid}", headers=ADMIN)
    assert client.get(f"/v1/opportunities/{oid}", params={"founder_id": a}).status_code == 404


def test_sailing_around_the_3d_archipelago_is_logged(client, db):
    from app.models import Interaction

    fid = client.post("/v1/founders", json={"name": "Riya"}).json()["id"]
    assert client.post("/v1/people/visit", json={"founder_id": fid, "spot": "harbour"}).json() == {"ok": True}
    assert client.post("/v1/people/visit", json={"founder_id": fid, "spot": "volcano"}).status_code == 422
    rows = db.query(Interaction).filter_by(event_type="people_spot_visited").all()
    assert [r.metadata_["spot"] for r in rows] == ["harbour"]
