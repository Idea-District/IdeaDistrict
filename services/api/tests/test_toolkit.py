"""Quick Breaks toolkit: Test an assumption, and Explore industries."""

from tests.test_cafe import ADMIN
from tests.test_gap_probes import _founder_with_id

TOPIC = {
    "title": "Pricing your first plan", "category": "business_model", "minutes": 3,
    "summary": "Per unit, per user or flat.", "tags": "pricing,customers",
    "sections": [{"heading": "Test, don't guess", "body": "Offer two prices to similar customers and watch who signs."}],
    "questions": ["What do they pay for the problem today?"],
}


def test_simulation_is_private_until_saved_to_journey(client):
    fid = _founder_with_id(client)
    assert client.get("/v1/toolkit/simulator/suggestions", params={"founder_id": fid}).json()

    sim = client.post("/v1/toolkit/simulator", json={"founder_id": fid, "assumption": "Other owners will pay for billing too"}).json()
    assert [p["key"] for p in sim["paths"]] == ["A", "B"]
    assert all(len(p["tradeoffs"]) == 3 for p in sim["paths"]) and sim["question"] and sim["chosen"] is None

    kept = client.post(f"/v1/toolkit/simulator/{sim['id']}/decide", json={"founder_id": fid, "chosen": "B", "reflection": "Five calls first."}).json()
    assert kept["chosen"] == "B" and kept["saved_to_journey"] is False
    journey = client.get("/v1/district/journey", params={"founder_id": fid}).json()
    assert not any(e["kind"] == "simulation" for e in journey)

    client.post(f"/v1/toolkit/simulator/{sim['id']}/decide", json={"founder_id": fid, "chosen": "B", "reflection": "Five calls first.", "save_to_journey": True})
    journey = client.get("/v1/district/journey", params={"founder_id": fid}).json()
    entry = next(e for e in journey if e["kind"] == "simulation")
    assert entry["title"] == "Other owners will pay for billing too" and "Ask five owners first" in entry["learned"]

    assert client.get("/v1/toolkit/simulator", params={"founder_id": fid}).json()[0]["id"] == sim["id"]


def test_simulations_are_not_shared(client):
    a, b = _founder_with_id(client), _founder_with_id(client)
    sim = client.post("/v1/toolkit/simulator", json={"founder_id": a, "assumption": "Customers will pay up front"}).json()
    assert client.get(f"/v1/toolkit/simulator/{sim['id']}", params={"founder_id": b}).status_code == 404
    assert client.post(f"/v1/toolkit/simulator/{sim['id']}/decide", json={"founder_id": b, "chosen": "A"}).status_code == 404


def test_industry_reads_admin_and_for_you(client):
    assert client.post("/v1/admin/topics", json=TOPIC).status_code == 401
    slug = client.post("/v1/admin/topics", json=TOPIC, headers=ADMIN).json()["slug"]
    assert client.post("/v1/admin/topics", json=TOPIC, headers=ADMIN).status_code == 409

    fid = _founder_with_id(client)
    client.post("/v1/district/needs", json={"founder_id": fid, "kind": "need", "value": "A clearer pricing model"})
    listing = client.get("/v1/toolkit/industries", params={"founder_id": fid}).json()
    assert listing[0]["slug"] == slug and listing[0]["for_you"] is True and "sections" not in listing[0]

    read = client.get(f"/v1/toolkit/industries/{slug}", params={"founder_id": fid}).json()
    assert read["sections"][0]["heading"] == "Test, don't guess" and read["questions"]

    client.delete(f"/v1/admin/topics/{slug}", headers=ADMIN)
    assert client.get(f"/v1/toolkit/industries/{slug}", params={"founder_id": fid}).status_code == 404
