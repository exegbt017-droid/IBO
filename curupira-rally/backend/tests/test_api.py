from fastapi.testclient import TestClient

from app.main import app


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200


def test_get_posto_expands_animals():
    with TestClient(app) as client:
        response = client.get("/api/postos/01")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "01"
        assert len(data["animais"]) == 3
        assert all("animal" in entry for entry in data["animais"])
        intruso = next(a for a in data["animais"] if not a["ocorre_no_local"])
        assert intruso["animal_id"] == "pinguim-imperador"


def test_get_posto_not_found():
    with TestClient(app) as client:
        response = client.get("/api/postos/99")
        assert response.status_code == 404


def test_list_animals():
    with TestClient(app) as client:
        response = client.get("/api/animals")
        assert response.status_code == 200
        assert len(response.json()) == 3


def test_progress_roundtrip():
    with TestClient(app) as client:
        post_response = client.post(
            "/api/progress",
            json={
                "participant_id": "device-abc",
                "posto_id": "01",
                "pontuacao": 100,
                "respostas": {"intruso": "pinguim-imperador"},
            },
        )
        assert post_response.status_code == 201

        get_response = client.get("/api/progress/device-abc")
        assert get_response.status_code == 200
        entries = get_response.json()
        assert any(e["posto_id"] == "01" and e["pontuacao"] == 100 for e in entries)
