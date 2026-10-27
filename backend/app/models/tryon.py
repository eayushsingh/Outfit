from typing import Any

from pydantic import BaseModel, Field


class TryOnRequestOptions(BaseModel):
    category: str = "upper_body"
    denoise_steps: int | None = Field(default=30, ge=10, le=50)
    seed: int | None = Field(default=42)
    guidance_scale: float | None = Field(default=2.5, ge=1.0, le=7.5)


class TryOnResponse(BaseModel):
    success: bool
    image_base64: str
    content_type: str = "image/jpeg"
    provider: str
    latency_ms: float
    is_demo: bool
    license_notice: str
    disclaimer: str = (
        "AI-generated still image. Not a live video try-on. "
        "Intended for visual estimation only."
    )
    metadata: dict[str, Any] | None = None


class ProviderStatusResponse(BaseModel):
    current_provider: str
    demo_mode: bool
    is_commercial_ready: bool
    active_license: str
    supported_categories: list[str]
    timeout_seconds: int
