import base64
import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.config import settings
from app.models.tryon import ProviderStatusResponse, TryOnResponse
from app.providers.factory import get_tryon_provider
from app.services.catalog_service import catalog_service
from app.services.upload_service import UploadService

router = APIRouter(prefix="/tryon", tags=["Try-On"])


@router.get("/provider-status", response_model=ProviderStatusResponse)
async def get_provider_status():
    provider = get_tryon_provider()
    return ProviderStatusResponse(
        current_provider=provider.display_name,
        demo_mode=provider.is_demo,
        is_commercial_ready=provider.is_commercial_allowed,
        active_license=provider.license_name,
        supported_categories=["upper_body", "lower_body", "dresses"],
        timeout_seconds=settings.TRYON_TIMEOUT_SECONDS
    )


@router.post("/generate", response_model=TryOnResponse)
async def generate_tryon(
    person_image: UploadFile = File(..., description="Captured camera frame of user"),
    garment_id: str | None = Form(None, description="Existing garment ID from catalog"),
    garment_image: UploadFile | None = File(None, description="Optional custom garment image"),
    category: str = Form("upper_body", description="Clothing category tag")
):
    if not garment_id and not garment_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify either an existing 'garment_id' or upload a 'garment_image'."
        )

    # 1. Read and validate customer photo
    person_raw = await person_image.read()
    person_bytes, _, _ = UploadService.validate_and_process_image(person_raw, filename_hint="person.jpg")

    # 2. Read and validate garment photo
    garment_bytes: bytes
    if garment_id:
        garment = catalog_service.get_garment(garment_id)
        if not garment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Garment with ID '{garment_id}' does not exist in catalog."
            )
        # Extract filename from image_url (e.g., /api/catalog/assets/xyz.jpg)
        filename = garment.image_url.split("/")[-1]
        garment_path = settings.resolve_path(settings.UPLOAD_DIR) / filename
        if not garment_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Garment image file '{filename}' was not found on server."
            )
        with open(garment_path, "rb") as gf:
            garment_bytes = gf.read()
    else:
        raw_garment = await garment_image.read()
        garment_bytes, _, _ = UploadService.validate_and_process_image(
            raw_garment, filename_hint="garment.png", is_cutout=True
        )

    # 3. Execute virtual try-on via adapter
    provider = get_tryon_provider()
    start_time = time.perf_counter()

    try:
        result_bytes = await provider.generate(
            person_image_bytes=person_bytes,
            garment_image_bytes=garment_bytes,
            category=category
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(e)}"
        )

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    b64_image = base64.b64encode(result_bytes).decode("utf-8")

    return TryOnResponse(
        success=True,
        image_base64=b64_image,
        content_type="image/jpeg",
        provider=provider.display_name,
        latency_ms=latency_ms,
        is_demo=provider.is_demo,
        license_notice=f"License: {provider.license_name}. URL: {provider.license_url}",
        disclaimer=(
            "DEMO MODE — SYNTHETIC LOCAL RESULT"
            if provider.is_demo else
            "AI-generated still image (Mode B). Not a live video try-on. "
            "Non-commercial research evaluation only."
        ),
        metadata={
            "provider_type": provider.name,
            "commercial_use_allowed": provider.is_commercial_allowed,
            "latency_ms": latency_ms
        }
    )
