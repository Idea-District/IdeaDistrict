

def test_walking_the_3d_lantern_pier_is_logged(client, db):
    from app.models import Interaction

    fid = client.post("/v1/founders", json={"name": "Riya"}).json()["id"]
    assert client.post("/v1/conversations/visit", json={"founder_id": fid, "spot": "lantern"}).json() == {"ok": True}
    assert client.post("/v1/conversations/visit", json={"founder_id": fid, "spot": "lighthouse"}).status_code == 422
    rows = db.query(Interaction).filter_by(event_type="pier_spot_visited").all()
    assert [r.metadata_["spot"] for r in rows] == ["lantern"]
