from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class GarmentCategory(str, Enum):
    SHIRT = "shirt"
    TSHIRT = "tshirt"
    JACKET = "jacket"
    HOODIE = "hoodie"
    SWEATER = "sweater"
    OTHER = "other"


class GarmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    category: GarmentCategory
    description: str | None = Field(default="", max_length=500)
    anchor_hints: dict[str, Any] | None = Field(
        default_factory=lambda: {
            "shoulder_scale": 1.0,
            "torso_offset_y": 0.0,
            "aspect_ratio": 1.0
        }
    )


class GarmentCreate(GarmentBase):
    pass


class GarmentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    category: GarmentCategory | None = None
    description: str | None = Field(None, max_length=500)
    anchor_hints: dict[str, Any] | None = None


class GarmentResponse(GarmentBase):
    id: str
    image_url: str
    cutout_url: str | None = None
    created_at: str
    updated_at: str
