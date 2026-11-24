"""Ask ID: answers from the founder's District, says what it rests on, never a score."""

from tests.test_gap_probes import _founder_with_id


def test_ask_id_answers_with_what_it_rests_on(client):
    fid = _founder_with_id(client)
    r = client.post("/v1/ask", json={"founder_id": fid, "message": "Should I build billing for one customer?",
                                     "history": [{"role": "founder", "text": "Hi"}, {"role": "id", "text": "Hello"}]})
    assert r.status_code == 200
    body = r.json()
    assert body["reply"] and body["rests_on"]
    assert body["strength"] in ("low", "medium", "high")
    assert len(body["suggestions"]) <= 3


def test_ask_id_rejects_unknown_founder(client):
    r = client.post("/v1/ask", json={"founder_id": "00000000-0000-0000-0000-000000000000", "message": "Hello there"})
    assert r.status_code == 404
