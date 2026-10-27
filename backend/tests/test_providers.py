import io

import pytest
from PIL import Image

from app.providers.mock_provider import MockProvider


def create_dummy_image(w=400, h=600, color="gray"):
    img = Image.new("RGB", (w, h), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_mock_provider_output():
    provider = MockProvider()
    assert provider.name == "mock"
    assert provider.is_demo is True

    person_bytes = create_dummy_image(400, 600, "white")
    garment_bytes = create_dummy_image(200, 300, "blue")

    result = await provider.generate(person_bytes, garment_bytes)
    assert len(result) > 0

    # Ensure output is a valid decodable image
    out_img = Image.open(io.BytesIO(result))
    assert out_img.size == (400, 600)


def test_tryon_generate_endpoint_mock(client):
    catalog_res = client.get("/api/catalog")
    items = catalog_res.json()
    first_id = items[0]["id"]

    person_bytes = create_dummy_image(400, 600, "gray")

    response = client.post(
        "/api/tryon/generate",
        files={"person_image": ("webcam.jpg", person_bytes, "image/jpeg")},
        data={"garment_id": first_id, "category": "upper_body"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["is_demo"] is True
    assert "image_base64" in data
    assert len(data["image_base64"]) > 100
    assert "DEMO" in data["disclaimer"]


def test_provider_status_endpoint(client):
    res = client.get("/api/tryon/provider-status")
    assert res.status_code == 200
    data = res.json()
    assert "current_provider" in data
    assert "demo_mode" in data
    assert data["demo_mode"] is True
