from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from m4_agent_host.domain.models import MeetingSignals


@pytest.fixture()
def client() -> TestClient:
    from m4_agent_host.entrypoints.api import app

    return TestClient(app)


def test_health_returns_ok(client: TestClient) -> None:
    # Act
    response = client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ingest_meeting_returns_signals(client: TestClient) -> None:
    # Arrange
    expected = MeetingSignals()
    with patch(
        "m4_agent_host.entrypoints.api._ingest_service.ingest_meeting",
        new_callable=AsyncMock,
        return_value=expected,
    ):
        # Act
        response = client.post(
            "/ingest/meeting",
            json={"transcript": "Hello world", "filename": "2024-01-15-test.md"},
        )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "entities" in data
    assert "risks" in data
    assert "tasks" in data


def test_ingest_meeting_returns_500_on_error(client: TestClient) -> None:
    # Arrange
    with patch(
        "m4_agent_host.entrypoints.api._ingest_service.ingest_meeting",
        new_callable=AsyncMock,
        side_effect=RuntimeError("service failure"),
    ):
        # Act
        response = client.post(
            "/ingest/meeting",
            json={"transcript": "Hello", "filename": "test.md"},
        )

    # Assert
    assert response.status_code == 500
    assert response.json()["detail"] == "Ingest failed"
