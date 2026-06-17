import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestTriageEndpoint:
    def test_safety_override(self, client):
        response = client.post(
            "/api/v1/analyze/triage",
            json={"symptoms": "Patient is not breathing"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["triage_level"] == "immediate"
        assert "Safety override" in data.get("reason", "")

    def test_immediate_keyword(self, client):
        response = client.post(
            "/api/v1/analyze/triage",
            json={"symptoms": "severe chest pain radiating to arm"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["triage_level"] == "immediate"

    def test_urgent_keyword(self, client):
        response = client.post(
            "/api/v1/analyze/triage",
            json={"symptoms": "Patient has high fever of 103"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["triage_level"] == "urgent"

    def test_non_urgent_keyword(self, client):
        response = client.post(
            "/api/v1/analyze/triage",
            json={"symptoms": "Mild cough and runny nose"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["triage_level"] == "non-urgent"

    def test_unknown_keyword_falls_to_biobert_default(self, client):
        with patch("app.triage.biobert_triage.biobert_triage") as mock_bio:
            mock_bio.return_value = {
                "triage_level": "non-urgent",
                "method": "biobert",
                "confidence": 0.12,
            }
            response = client.post(
                "/api/v1/analyze/triage",
                json={"symptoms": "Stubbed toe, minor discomfort"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["triage_level"] == "non-urgent"

    def test_includes_age_in_request(self, client):
        response = client.post(
            "/api/v1/analyze/triage",
            json={"symptoms": "cough", "age": 65},
        )
        assert response.status_code == 200

    def test_empty_symptoms_returns_error(self, client):
        response = client.post(
            "/api/v1/analyze/triage",
            json={"symptoms": ""},
        )
        assert response.status_code == 422

    def test_missing_symptoms_field(self, client):
        response = client.post(
            "/api/v1/analyze/triage",
            json={},
        )
        assert response.status_code == 422
