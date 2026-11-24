"""My District rooms: Journey, Business, Needs & Aspirations, Progress, Capabilities, Visibility."""

from tests.test_cafe import ADMIN
from tests.test_gap_probes import _founder_with_id


def test_journey_add_list_delete_and_saved_brews(client):
    fid = _founder_with_id(client)
    j = client.post("/v1/district/journey", json={"founder_id": fid, "kind": "decision", "title": "Ask five owners first",
                                                 "on": "2026-11-09", "learned": "Billing was one request, not a pattern."}).json()
    mine = [e for e in j if e["source"] == "you"]
    assert mine[0]["title"] == "Ask five owners first" and mine[0]["removable"] is True
    assert any(e["title"] == "Built your ID" for e in j)

    bid = client.post("/v1/admin/cafe/brews", json={"question": "What did a customer teach you?"}, headers=ADMIN).json()["id"]
    client.post(f"/v1/cafe/brews/{bid}/answer", json={"founder_id": fid, "body": "Owners fear stock-outs.", "save_to_journey": True})
    j = client.get("/v1/district/journey", params={"founder_id": fid}).json()
    assert any(e["source"] == "daily_brew" and e["learned"] == "Owners fear stock-outs." for e in j)

    j = client.delete(f"/v1/district/journey/{mine[0]['id']}", params={"founder_id": fid}).json()
    assert not any(e["source"] == "you" for e in j)


def test_someone_elses_entry_cannot_be_deleted(client):
    a, b = _founder_with_id(client), _founder_with_id(client)
    j = client.post("/v1/district/journey", json={"founder_id": a, "kind": "milestone", "title": "First pilot", "on": "2026-01-10"}).json()
    eid = next(e["id"] for e in j if e["source"] == "you")
    assert client.delete(f"/v1/district/journey/{eid}", params={"founder_id": b}).status_code == 404


def test_business_edit_replaces_and_is_remembered_for_rebuilds(client, db):
    fid = _founder_with_id(client)
    r = client.post("/v1/district/business", json={"founder_id": fid, "field": "stage", "value": "Three paying units"}).json()
    stages = [i for i in r["items"] if i["field"] == "stage"]
    assert len(stages) == 1 and stages[0]["value"] == "Three paying units" and stages[0]["source"] == "declared"

    from app.models import User
    from app.services.founders import founder_context

    ctx = founder_context(db, db.get(User, __import__("uuid").UUID(fid)))
    assert "Three paying units" in ctx["their_own_corrections"]


def test_needs_add_and_remove(client):
    fid = _founder_with_id(client)
    n = client.post("/v1/district/needs", json={"founder_id": fid, "kind": "need", "value": "Someone who has sold to small manufacturers"}).json()
    added = next(x for x in n["need"] if x["value"].startswith("Someone who has sold"))
    n = client.delete(f"/v1/district/state/{added['id']}", params={"founder_id": fid}).json()
    assert not any(x["id"] == added["id"] for x in n["need"])


def test_experiments_run_then_finish(client):
    fid = _founder_with_id(client)
    e = client.post("/v1/district/experiments", json={"founder_id": fid, "title": "Pricing test", "tried": "Rs 1,500 vs Rs 2,500 with six owners",
                                                     "started_on": "2026-11-02"}).json()
    assert e[0]["status"] == "running" and e[0]["ended_on"] is None
    e = client.post(f"/v1/district/experiments/{e[0]['id']}", json={"founder_id": fid, "status": "done",
                                                                   "happened": "Four chose the higher price", "learned": "Price was not the blocker"}).json()
    assert e[0]["status"] == "done" and e[0]["ended_on"] and e[0]["learned"] == "Price was not the blocker"


def test_visibility_defaults_and_change(client):
    fid = _founder_with_id(client)
    v = client.get("/v1/district/visibility", params={"founder_id": fid}).json()
    assert v["rooms"]["journey"] == "private" and v["rooms"]["business"] == "connections" and v["investors"] is False
    v = client.post("/v1/district/visibility", json={"founder_id": fid, "room": "journey", "audience": "community"}).json()
    assert v["rooms"]["journey"] == "community"


def test_capabilities_are_words_not_scores_and_overview(client):
    fid = _founder_with_id(client)
    caps = client.get("/v1/district/capabilities", params={"founder_id": fid}).json()
    assert caps and all("strength" not in c and c["confidence"] in ("low", "medium", "high") for c in caps)
    o = client.get("/v1/district", params={"founder_id": fid}).json()
    assert set(o["rooms"]) == {"journey", "business", "needs", "progress", "capabilities"}


def test_flying_around_the_3d_district_is_logged(client, db):
    from app.models import Interaction

    fid = client.post("/v1/founders", json={"name": "Riya"}).json()["id"]
    assert client.post("/v1/district/visit", json={"founder_id": fid, "spot": "business"}).json() == {"ok": True}
    assert client.post("/v1/district/visit", json={"founder_id": fid, "spot": "basement"}).status_code == 422
    rows = db.query(Interaction).filter_by(event_type="district_spot_visited").all()
    assert [r.metadata_["spot"] for r in rows] == ["business"]
