"""The admin's Users & data pages: behind the admin token, complete, but never message text."""

from tests.test_cafe import ADMIN
from tests.test_gap_probes import _founder_with_id
from tests.test_me_and_investor import _intro, _investor


def test_users_and_data_need_the_admin_token(client):
    assert client.get("/v1/admin/data/summary").status_code == 401
    assert client.get("/v1/admin/data/founders", headers={"X-Admin-Token": "wrong"}).status_code == 401


def test_summary_founder_and_investor_details(client, db):
    inv = _investor(client)
    fid = _founder_with_id(client)
    rid = _intro(db, fid, inv)
    done = client.post(f"/v1/investor/introductions/{rid}/respond", json={"investor_id": inv, "accept": True}).json()
    secret = "Our runway is four months, please keep this between us"
    client.post(f"/v1/conversations/{done['conversation_id']}/messages", json={"founder_id": fid, "body": secret})

    s = client.get("/v1/admin/data/summary", headers=ADMIN).json()
    assert s["users"]["founders"] >= 1 and s["users"]["investors"] >= 1
    assert s["investors"]["introductions_accepted"] >= 1 and s["investors"]["with_thesis"] >= 1
    assert s["connections"]["conversations"] >= 1

    founders = client.get("/v1/admin/data/founders", headers=ADMIN).json()
    row = next(f for f in founders if f["id"] == fid)
    assert row["id_built"] is True and row["connections"] == 1

    f = client.get(f"/v1/admin/data/founders/{fid}", headers=ADMIN).json()
    assert f["profile"]["name"] and f["reads"] and f["told_us"]
    assert f["connections"][0]["with"]["id"] == inv and f["connections"][0]["status"] == "accepted"
    assert f["conversations"][0]["messages"] >= 1
    assert secret not in str(f)  # who they talk to and how much, never what they wrote

    investors = client.get("/v1/admin/data/investors", headers=ADMIN).json()
    assert next(i for i in investors if i["id"] == inv)["accepted"] == 1
    i = client.get(f"/v1/admin/data/investors/{inv}", headers=ADMIN).json()
    assert i["thesis"]["sectors"] == ["inventory", "supply chain"] and i["pipeline"][0]["founder"]["id"] == fid
    assert secret not in str(i)
    assert client.get(f"/v1/admin/data/investors/{fid}", headers=ADMIN).status_code == 404
