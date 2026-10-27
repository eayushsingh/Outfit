from fastapi import APIRouter

from app.config import settings
from app.providers.factory import get_tryon_provider

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    provider = get_tryon_provider()
    return {
        "status": "healthy",
        "service": "VirtualFit AI Backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "demo_mode": settings.DEMO_MODE,
        "active_provider": {
            "name": provider.name,
            "display_name": provider.display_name,
            "is_demo": provider.is_demo,
            "license": provider.license_name,
            "is_commercial_allowed": provider.is_commercial_allowed
        }
    }
