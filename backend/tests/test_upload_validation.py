import io

import pytest
from fastapi import HTTPException
from PIL import Image

from app.config import settings
from app.services.upload_service import UploadService


def create_test_image(width=300, height=300, fmt="JPEG", color="blue"):
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def test_valid_jpeg_upload():
    raw = create_test_image(400, 500, "JPEG")
    sanitized, filename, mime = UploadService.validate_and_process_image(raw)
    assert mime == "image/jpeg"
    assert filename.endswith(".jpg")
    assert len(sanitized) > 0


def test_valid_png_cutout_upload():
    img = Image.new("RGBA", (200, 200), (255, 0, 0, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()

    sanitized, filename, mime = UploadService.validate_and_process_image(raw, is_cutout=True)
    assert mime == "image/png"
    assert filename.endswith(".png")


def test_empty_file_rejected():
    with pytest.raises(HTTPException) as exc:
        UploadService.validate_and_process_image(b"")
    assert exc.value.status_code == 400
    assert "empty" in exc.value.detail.lower()


def test_disguised_file_rejected():
    # File named .jpg but containing plain text or random binary bytes
    fake_image = b"This is not a real image file, just plain text."
    with pytest.raises(HTTPException) as exc:
        UploadService.validate_and_process_image(fake_image)
    assert exc.value.status_code == 415
    assert "unsupported" in exc.value.detail.lower()


def test_oversize_file_rejected():
    # Temporarily set max size to 1 KB to test boundary condition
    orig_max = settings.MAX_UPLOAD_SIZE_BYTES
    settings.MAX_UPLOAD_SIZE_BYTES = 1024
    try:
        raw = create_test_image(500, 500, "JPEG")
        with pytest.raises(HTTPException) as exc:
            UploadService.validate_and_process_image(raw)
        assert exc.value.status_code == 413
    finally:
        settings.MAX_UPLOAD_SIZE_BYTES = orig_max


def test_dimension_too_small_rejected():
    raw = create_test_image(32, 32, "JPEG")  # Below MIN_IMAGE_DIMENSION (64)
    with pytest.raises(HTTPException) as exc:
        UploadService.validate_and_process_image(raw)
    assert exc.value.status_code == 400
    assert "below minimum threshold" in exc.value.detail.lower()
