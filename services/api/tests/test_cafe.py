"""The District Cafe: Daily Brew, Open Table, What's On, and the team's admin console."""

from datetime import timedelta

ADMIN = {"X-Admin-Token": "test-admin-token"}


def _founder(client, name="Abdul") -> str:
    return client.post("/v1/founders", json={"name": name}).json()["id"]


def _brew_today(client) -> str:
    r = client.post("/v1/admin/cafe/brews", json={"question": "What did a customer teach you this month?"}, headers=ADMIN)
    assert r.status_code == 200
    return r.json()["id"]


def test_admin_needs_the_token(client):
    assert client.get("/v1/admin/cafe").status_code == 401
    assert client.get("/v1/admin/cafe", headers={"X-Admin-Token": "wrong"}).status_code == 401
    assert client.get("/v1/admin/cafe", headers=ADMIN).status_code == 200


def test_daily_brew_answer_and_helpful(client):
    brew_id = _brew_today(client)
    a, b = _founder(client, "Abdul"), _founder(client, "Maya")

    brew = client.get("/v1/cafe/brew", params={"founder_id": a}).json()["brew"]
    assert brew["id"] == brew_id and brew["answer_count"] == 0 and brew["my_answer"] is None

    r = client.post(f"/v1/cafe/brews/{brew_id}/answer", json={"founder_id": a, "body": "Owners fear stock-outs more than cost.", "save_to_journey": True}).json()
    assert r["answer_count"] == 1 and r["my_answer"]["save_to_journey"] is True
    # Answering again edits, never duplicates.
    r = client.post(f"/v1/cafe/brews/{brew_id}/answer", json={"founder_id": a, "body": "Edited.", "save_to_journey": False}).json()
    assert r["answer_count"] == 1 and r["my_answer"]["body"] == "Edited."

    answers = client.get(f"/v1/cafe/brews/{brew_id}/answers", params={"founder_id": b}).json()
    assert answers[0]["author"]["name"] == "Abdul" and answers[0]["mine"] is False
    h = client.post(f"/v1/cafe/answers/{answers[0]['id']}/helpful", json={"founder_id": b, "on": True}).json()
    assert h == {"helpful_count": 1, "helpful_by_me": True}
    # You can't mark your own answer helpful.
    own = client.post(f"/v1/cafe/answers/{answers[0]['id']}/helpful", json={"founder_id": a, "on": True}).json()
    assert own["helpful_count"] == 1


def test_hidden_answers_disappear_for_founders(client):
    brew_id = _brew_today(client)
    a = _founder(client)
    client.post(f"/v1/cafe/brews/{brew_id}/answer", json={"founder_id": a, "body": "Something to hide"})
    answer_id = client.get(f"/v1/cafe/brews/{brew_id}/answers", params={"founder_id": a}).json()[0]["id"]
    assert client.post("/v1/admin/cafe/moderate", json={"kind": "answer", "id": answer_id}, headers=ADMIN).status_code == 200
    assert client.get(f"/v1/cafe/brews/{brew_id}/answers", params={"founder_id": a}).json() == []


def test_future_brews_are_not_open_yet(client):
    from app.services.cafe import cafe_today

    future = (cafe_today() + timedelta(days=3)).isoformat()
    bid = client.post("/v1/admin/cafe/brews", json={"question": "A question for later in the week?", "publish_on": future}, headers=ADMIN).json()["id"]
    a = _founder(client)
    assert client.get("/v1/cafe/brew", params={"founder_id": a}).json()["brew"] is None
    r = client.post(f"/v1/cafe/brews/{bid}/answer", json={"founder_id": a, "body": "Too early"})
    assert r.status_code == 409
    # Same day twice is refused.
    again = client.post("/v1/admin/cafe/brews", json={"question": "Another for the same day?", "publish_on": future}, headers=ADMIN)
    assert again.status_code == 409


def test_open_table_join_post_leave(client):
    tid = client.post("/v1/admin/cafe/tables", json={"title": "First 10 customers", "prompt": "How did you find them?"}, headers=ADMIN).json()["id"]
    a = _founder(client)
    tables = client.get("/v1/cafe/tables", params={"founder_id": a}).json()
    assert tables[0]["status"] == "open" and tables[0]["joined"] is False

    t = client.post(f"/v1/cafe/tables/{tid}/posts", json={"founder_id": a, "body": "WhatsApp groups worked for us."}).json()
    assert t["joined"] is True and t["seated_count"] == 1 and t["posts"][0]["mine"] is True

    left = client.post(f"/v1/cafe/tables/{tid}/leave", json={"founder_id": a}).json()
    assert left["joined"] is False and left["seated_count"] == 0

    client.post(f"/v1/admin/cafe/tables/{tid}/status", json={"status": "closed"}, headers=ADMIN)
    assert client.get(f"/v1/cafe/tables/{tid}", params={"founder_id": a}).status_code == 404


def test_scheduled_table_refuses_posts(client):
    from app.db.base import utcnow

    later = (utcnow() + timedelta(days=2)).isoformat()
    tid = client.post("/v1/admin/cafe/tables", json={"title": "Pricing", "prompt": "Bring your pricing page.", "starts_at": later}, headers=ADMIN).json()["id"]
    a = _founder(client)
    assert client.post(f"/v1/cafe/tables/{tid}/posts", json={"founder_id": a, "body": "Hello"}).status_code == 409


def test_whats_on_save_and_home(client):
    _brew_today(client)
    iid = client.post("/v1/admin/cafe/whats-on", json={"kind": "open_call", "title": "Pilot call", "detail": "20 members"}, headers=ADMIN).json()["id"]
    a = _founder(client)
    assert client.post(f"/v1/cafe/whats-on/{iid}/save", json={"founder_id": a, "on": True}).json()["saved"] is True
    home = client.get("/v1/cafe", params={"founder_id": a}).json()
    assert home["brew"]["question"] and home["whats_on"][0]["saved"] is True
    assert home["here_today"] >= 1
    client.delete(f"/v1/admin/cafe/whats-on/{iid}", headers=ADMIN)
    assert client.get("/v1/cafe/whats-on", params={"founder_id": a}).json() == []


def test_ai_drafts_brews_for_approval_only(client):
    r = client.post("/v1/admin/cafe/brews/draft", json={"count": 3}, headers=ADMIN).json()
    assert len(r["questions"]) == 3
    # Drafting publishes nothing.
    assert client.get("/v1/admin/cafe", headers=ADMIN).json()["brews"] == []


def test_walking_around_the_3d_cafe_is_logged(client, db):
    from app.models import Interaction

    fid = _founder(client)
    assert client.post("/v1/cafe/visit", json={"founder_id": fid, "spot": "counter"}).json() == {"ok": True}
    assert client.post("/v1/cafe/visit", json={"founder_id": fid, "spot": "kitchen"}).status_code == 422
    rows = db.query(Interaction).filter_by(event_type="cafe_spot_visited").all()
    assert [r.metadata_["spot"] for r in rows] == ["counter"]
