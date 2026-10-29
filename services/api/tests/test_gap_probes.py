"""Tapping an unknown: one optional situation on exactly that topic."""


def _founder_with_id(client) -> str:
    fid = client.post("/v1/founders", json={"name": "Abdul"}).json()["id"]
    client.post("/v1/discovery/context", json={"founder_id": fid, "working_on": "Idea District",
                                               "hoping_for": "50 founders", "in_the_way": "No CTO"})
    s = client.post("/v1/discovery/sessions", json={"founder_id": fid}).json()
    client.post(f"/v1/discovery/situations/{s['situation_id']}/choice", json={"founder_id": fid, "option_id": "A"})
    client.post("/v1/id/build", json={"founder_id": fid})
    return fid


def test_unknowns_carry_ids_and_reasons(client):
    fid = client.post("/v1/founders", json={"name": "Asha"}).json()["id"]
    body = client.post("/v1/discovery/context", json={"founder_id": fid, "working_on": "x x",
                                                      "hoping_for": "y y", "in_the_way": "z z"}).json()
    assert all(u["id"] and u["why_it_matters"] for u in body["unknown"])


def test_tapping_a_gap_gives_one_situation_on_that_topic(client):
    fid = _founder_with_id(client)
    gap = client.get("/v1/id", params={"founder_id": fid}).json()["gaps"][0]

    s = client.post(f"/v1/discovery/gaps/{gap['id']}/probe", json={"founder_id": fid}).json()
    assert s["kind"] == "probe" and s["total"] == 1 and s["dimension"] == gap["dimension"]
    assert s["consequence"] is None

    r = client.post(f"/v1/discovery/situations/{s['situation_id']}/choice",
                    json={"founder_id": fid, "option_id": "C"}).json()
    assert r["done"] is True
    assert r["signal"]["still_unclear"]  # what this one answer can't tell us
    assert r["signal"]["decisions_so_far"] == 2  # one from discovery, one from the probe

    # The probe doesn't hijack the main discovery session.
    again = client.post("/v1/discovery/sessions", json={"founder_id": fid}).json()
    assert again["kind"] == "discovery"

    # Rebuilding the ID now draws on both decisions.
    assert client.post("/v1/id/build", json={"founder_id": fid}).json()["decisions"] == 2


def test_someone_elses_gap_is_refused(client):
    fid = _founder_with_id(client)
    other = _founder_with_id(client)
    gap = client.get("/v1/id", params={"founder_id": other}).json()["gaps"][0]
    assert client.post(f"/v1/discovery/gaps/{gap['id']}/probe", json={"founder_id": fid}).status_code == 404
