import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import admin_router, catalog_router, health_router, tryon_router
from app.config import settings
from app.services.seed import seed_sample_catalog

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("virtualfit")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure upload and temp directories exist
    upload_dir = settings.resolve_path(settings.UPLOAD_DIR)
    temp_dir = settings.resolve_path(settings.TEMP_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    temp_dir.mkdir(parents=True, exist_ok=True)

    # Seed sample garments if catalog is empty
    try:
        seed_sample_catalog()
    except Exception as e:
        logger.error(f"Catalog seeding failed: {e}")

    logger.info("VirtualFit AI Backend initialized.")
    logger.info(f"Demo Mode: {settings.DEMO_MODE} | Provider: {settings.TRYON_PROVIDER}")
    yield
    logger.info("VirtualFit AI Backend shutting down.")


app = FastAPI(
    title="VirtualFit AI API",
    description="Virtual Trial Room Backend API with Hybrid Live/Diffusion Try-On",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."}
    )

# Include routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(tryon_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=(settings.ENVIRONMENT == "development")
    )
