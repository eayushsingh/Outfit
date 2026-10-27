import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


@pytest.fixture
def client():
    # Ensure test environment uses test settings
    settings.DEMO_MODE = True
    settings.TRYON_PROVIDER = "mock"
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def admin_headers():
    return {"X-Admin-Token": settings.ADMIN_API_KEY}
