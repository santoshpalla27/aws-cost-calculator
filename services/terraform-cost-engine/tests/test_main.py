from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_estimate_without_auth():
    """Test that estimate endpoint requires authentication"""
    response = client.post("/estimate", json={
        "source": "files",
        "terraformFiles": {}
    })
    # Should return 401 or validation error
    assert response.status_code in [400, 401]

def test_invalid_source_type():
    """Test validation for invalid source type"""
    response = client.post("/estimate", json={
        "source": "invalid_source"
    })
    assert response.status_code == 400