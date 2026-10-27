import os

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.config import settings
from app.models.garment import GarmentCategory, GarmentResponse
from app.services.catalog_service import catalog_service

router = APIRouter(prefix="/catalog", tags=["Catalog"])


@router.get("", response_model=list[GarmentResponse])
async def list_catalog(
    category: GarmentCategory | None = Query(None, description="Filter by garment category"),
    search: str | None = Query(None, description="Search garment name or description")
):
    return catalog_service.list_garments(category=category, query=search)


@router.get("/{garment_id}", response_model=GarmentResponse)
async def get_garment(garment_id: str):
    garment = catalog_service.get_garment(garment_id)
    if not garment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Garment with ID '{garment_id}' was not found in catalog."
        )
    return garment


@router.get("/assets/{filename}")
async def serve_asset(filename: str):
    """
    Secure static asset serving with strict path sanitization.
    Prevents path traversal attacks.
    """
    # Sanitize filename: strictly allow only alphanumeric, dashes, dots, and underscores
    clean_name = os.path.basename(filename)
    if clean_name != filename or ".." in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid asset path.")

    upload_dir = settings.resolve_path(settings.UPLOAD_DIR)
    file_path = upload_dir / clean_name

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")

    suffix = file_path.suffix.lower()
    media_type = "image/jpeg"
    if suffix == ".png":
        media_type = "image/png"
    elif suffix == ".webp":
        media_type = "image/webp"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"}
    )
