import json
import secrets

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status

from app.config import settings
from app.models.garment import GarmentCategory, GarmentCreate, GarmentResponse, GarmentUpdate
from app.services.catalog_service import catalog_service
from app.services.upload_service import UploadService

router = APIRouter(prefix="/admin", tags=["Admin"])


def verify_admin_token(x_admin_token: str | None = Header(None, alias="X-Admin-Token")) -> str:
    """
    Constant-time comparison against ADMIN_API_KEY to prevent timing attacks.
    """
    if not x_admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing 'X-Admin-Token' authentication header."
        )

    # Secure constant-time string comparison
    if not secrets.compare_digest(x_admin_token.encode("utf-8"), settings.ADMIN_API_KEY.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid administrative credentials."
        )

    return x_admin_token


@router.post("/auth/verify")
async def verify_auth(_token: str = Depends(verify_admin_token)):
    return {
        "authenticated": True,
        "message": "Administrative session authorized."
    }


@router.post("/catalog", response_model=GarmentResponse)
async def create_catalog_item(
    name: str = Form(..., min_length=1, max_length=120),
    category: GarmentCategory = Form(...),
    description: str = Form(""),
    anchor_hints: str | None = Form(None),
    image: UploadFile = File(..., description="High-resolution flat-lay garment photo"),
    cutout: UploadFile | None = File(None, description="Optional transparent PNG cutout for Mode A"),
    _token: str = Depends(verify_admin_token)
):
    # 1. Validate and save primary garment image
    image_bytes = await image.read()
    _, image_url = UploadService.save_upload(image_bytes, is_cutout=False)

    # 2. Validate and save transparent cutout if provided
    cutout_url = None
    if cutout:
        cutout_bytes = await cutout.read()
        _, cutout_url = UploadService.save_upload(cutout_bytes, is_cutout=True)

    # 3. Parse anchor hints
    hints_dict = {}
    if anchor_hints:
        try:
            hints_dict = json.loads(anchor_hints)
        except Exception:
            hints_dict = {"raw": anchor_hints}

    garment_data = GarmentCreate(
        name=name,
        category=category,
        description=description,
        anchor_hints=hints_dict
    )

    return catalog_service.create_garment(garment_data, image_url=image_url, cutout_url=cutout_url)


@router.put("/catalog/{garment_id}", response_model=GarmentResponse)
async def update_catalog_item(
    garment_id: str,
    name: str | None = Form(None),
    category: GarmentCategory | None = Form(None),
    description: str | None = Form(None),
    anchor_hints: str | None = Form(None),
    image: UploadFile | None = File(None),
    cutout: UploadFile | None = File(None),
    _token: str = Depends(verify_admin_token)
):
    image_url = None
    if image:
        img_bytes = await image.read()
        _, image_url = UploadService.save_upload(img_bytes, is_cutout=False)

    cutout_url = None
    if cutout:
        cutout_bytes = await cutout.read()
        _, cutout_url = UploadService.save_upload(cutout_bytes, is_cutout=True)

    hints_dict = None
    if anchor_hints:
        try:
            hints_dict = json.loads(anchor_hints)
        except Exception:
            hints_dict = {"raw": anchor_hints}

    update_data = GarmentUpdate(
        name=name,
        category=category,
        description=description,
        anchor_hints=hints_dict
    )

    updated = catalog_service.update_garment(
        garment_id, update_data, image_url=image_url, cutout_url=cutout_url
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Garment with ID '{garment_id}' was not found."
        )

    return updated


@router.delete("/catalog/{garment_id}")
async def delete_catalog_item(
    garment_id: str,
    _token: str = Depends(verify_admin_token)
):
    deleted = catalog_service.delete_garment(garment_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Garment with ID '{garment_id}' was not found."
        )
    return {"success": True, "message": f"Garment '{garment_id}' deleted successfully."}
