from fastapi.testclient import TestClient

from app.main import create_app


def test_curriculum_preserves_ids_and_does_not_expose_answer_keys():
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/curriculum/units")
        unit = client.get("/api/v1/curriculum/units/u1")
        missing = client.get("/api/v1/curriculum/units/does-not-exist")

    assert response.status_code == 200, response.text
    assert [row["id"] for row in response.json()] == [f"u{number}" for number in range(1, 10)]
    assert unit.status_code == 200, unit.text
    assert unit.json() == response.json()[0]
    assert unit.json()["lessons"][0]["id"] == "u1-quantum-foundations"
    assert unit.json()["lessons"][0]["type"] == "Concept"
    assert response.json()[8]["lessons"][0]["type"] == "Lab"
    assert "tone" not in unit.json()["lessons"][0]["sections"][0]
    assert unit.json()["content_version"] == 1
    assert unit.json()["review_status"] == "pending"
    assert response.json()[3]["is_placeholder"] is True
    assert missing.status_code == 404
    assert '"answer"' not in response.text
    assert '"explanation"' not in response.text
    assert all(
        set(checkpoint) == {"id", "prompt", "options"}
        for row in response.json()
        for lesson in row["lessons"]
        for checkpoint in lesson["checkpoints"]
    )
