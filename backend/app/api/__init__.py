from .admin import router as admin_router
from .catalog import router as catalog_router
from .health import router as health_router
from .tryon import router as tryon_router

__all__ = [
    "catalog_router",
    "tryon_router",
    "admin_router",
    "health_router",
]
