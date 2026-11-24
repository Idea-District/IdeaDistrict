"""Me (profile, avatar, export, delete) and the investor side, with its privacy rules."""

import uuid

from app.models import ConnectionRequest, User
from app.services.investor import sector_hits
from tests.test_gap_probes import _founder_with_id


def test_profile_avatar_export_and_delete(client, db):
    fid = _founder_with_id(client)
    p = client.post("/v1/me", json={"founder_id": fid, "one_line": "Inventory for small food units", "city": "Bengaluru"}).json()
    assert p["one_line"] == "Inventory for small food units" and p["avatar"] is None
    bad = client.post("/v1/me/avatar", json={"founder_id": fid, "role": "wizard", "personality": "calm", "style": "flat", "colour": "forest"})
    assert bad.status_code == 409
    p = client.post("/v1/me/avatar", json={"founder_id": fid, "role": "builder", "personality": "calm", "style": "flat", "colour": "forest"}).json()
    assert p["avatar"] == {"role": "builder", "personality": "calm", "style": "flat", "colour": "forest"}

    data = client.get("/v1/me/export", params={"founder_id": fid}).json()
    assert data["profile"]["one_line"] and data["your_answers"] and data["how_we_read_you"]

    assert client.post("/v1/me/delete", json={"founder_id": fid, "confirm": "nope"}).status_code == 422
    assert client.post("/v1/me/delete", json={"founder_id": fid, "confirm": "DELETE"}).json() == {"ok": True}
    assert client.get("/v1/me", params={"founder_id": fid}).status_code == 404


def _investor(client) -> str:
    inv = client.post("/v1/investor", json={"name": "Priya Nair", "firm": "Northgate Seed (sample)"}).json()
    client.post("/v1/investor/thesis", json={"investor_id": inv["id"], "firm": "Northgate Seed (sample)",
                                             "sectors": ["inventory", "supply chain"], "stages": ["seed"], "cheque": "50L-2Cr", "geography": "India"})
    return inv["id"]


def _intro(db, founder_id: str, investor_id: str) -> str:
    r = ConnectionRequest(from_user_id=uuid.UUID(founder_id), to_user_id=uuid.UUID(investor_id), origin="explore", note="Raising our seed round.")
    db.add(r)
    db.commit()
    return str(r.id)


def test_investor_sees_nothing_until_introduced_and_opted_in(client, db):
    inv = _investor(client)
    fid = _founder_with_id(client)
    # Not introduced: nothing at all.
    assert client.get(f"/v1/investor/founders/{fid}", params={"investor_id": inv}).status_code == 404

    _intro(db, fid, inv)
    v = client.get(f"/v1/investor/founders/{fid}", params={"investor_id": inv}).json()
    assert v["opted_in"] is False and v["shared"] == [] and v["rooms"] == {}

    # Ticking a room is not enough while the founder hasn't opted in to investors.
    client.post("/v1/district/visibility/investors", json={"founder_id": fid, "room": "business", "on": True})
    assert client.get(f"/v1/investor/founders/{fid}", params={"investor_id": inv}).json()["shared"] == []

    client.post("/v1/privacy", json={"founder_id": fid, "id_visible_to_investors": True})
    v = client.get(f"/v1/investor/founders/{fid}", params={"investor_id": inv}).json()
    assert v["shared"] == ["business"] and "needs" in v["not_shared"] and "needs" not in v["rooms"]


def test_investor_intro_accept_opens_conversation_and_pipeline(client, db):
    inv = _investor(client)
    fid = _founder_with_id(client)
    rid = _intro(db, fid, inv)
    home = client.get("/v1/investor/home", params={"investor_id": inv}).json()
    assert home["introductions"][0]["request_id"] == rid and home["has_thesis"] is True

    done = client.post(f"/v1/investor/introductions/{rid}/respond", json={"investor_id": inv, "accept": True}).json()
    assert done["conversation_id"]
    p = client.get("/v1/investor/pipeline", params={"investor_id": inv}).json()
    assert p["conversation"][0]["founder_id"] == fid
    p = client.post(f"/v1/investor/pipeline/{fid}", json={"investor_id": inv, "stage": "diligence", "note": "Call on Friday"}).json()
    assert p["diligence"][0]["note"] == "Call on Friday"
    assert client.get("/v1/conversations", params={"founder_id": fid}).json()[0]["id"] == done["conversation_id"]


def test_founders_are_not_investors_and_insights_are_anonymous(client, db):
    fid = _founder_with_id(client)
    assert client.get("/v1/investor/home", params={"investor_id": fid}).status_code == 404
    inv = _investor(client)
    ins = client.get("/v1/investor/insights", params={"investor_id": inv}).json()
    names = {u.name for u in db.query(User).all()}
    assert not any(t["theme"] in {n.lower() for n in names} for t in ins["top_needs"])
    assert "at least 3" in ins["rule"]


def test_investor_posts_opportunity_and_sees_interest(client):
    inv = _investor(client)
    oid = client.post("/v1/investor/opportunities", json={"investor_id": inv, "kind": "circle", "title": "Office hours",
                                                         "summary": "Thirty minutes on your round."}).json()["id"]
    fid = _founder_with_id(client)
    o = client.get(f"/v1/opportunities/{oid}", params={"founder_id": fid}).json()
    assert o["posted_by"] == "Northgate Seed (sample)"
    client.post(f"/v1/opportunities/{oid}/respond", json={"founder_id": fid, "interested": True, "note": "Raising in Jan"})
    mine = client.get("/v1/investor/opportunities", params={"investor_id": inv}).json()
    assert mine[0]["interested"][0]["note"] == "Raising in Jan"


def test_thesis_fit_understands_related_words():
    riya = "Scheduling and billing software for physiotherapy clinics in Bengaluru Six free pilot clinics onboarded"
    assert sector_hits({"healthtech", "saas"}, riya) == ["healthtech", "saas"]
    assert sector_hits({"fintech", "d2c", "climate"}, riya) == []
    assert sector_hits({"agritech"}, "Cold storage for dairy farmers") == ["agritech"]
    # A sector the investor typed in themselves still matches on its own name.
    assert sector_hits({"insurtech"}, "Insurtech for two-wheeler owners") == ["insurtech"]
