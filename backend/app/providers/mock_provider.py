import asyncio
import io
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from app.providers.base import TryOnProvider


class MockProvider(TryOnProvider):
    @property
    def name(self) -> str:
        return "mock"

    @property
    def display_name(self) -> str:
        return "Local Mock Provider (Demo Mode)"

    @property
    def is_demo(self) -> bool:
        return True

    @property
    def license_name(self) -> str:
        return "MIT License (VirtualFit AI Internal)"

    @property
    def license_url(self) -> str:
        return "https://opensource.org/licenses/MIT"

    @property
    def is_commercial_allowed(self) -> bool:
        return True

    async def generate(
        self,
        person_image_bytes: bytes,
        garment_image_bytes: bytes,
        category: str = "upper_body",
        options: dict[str, Any] | None = None
    ) -> bytes:
        """
        Generates a deterministic local composite with an unmistakable watermark.
        Simulates brief processing time (300ms) for UI responsiveness testing.
        """
        await asyncio.sleep(0.3)

        try:
            person_img = Image.open(io.BytesIO(person_image_bytes)).convert("RGBA")
            garment_img = Image.open(io.BytesIO(garment_image_bytes)).convert("RGBA")
        except Exception as e:
            raise ValueError(f"Failed to decode input images in MockProvider: {e}")

        pw, ph = person_img.size

        # Scale garment to roughly 55% of person width
        target_gw = int(pw * 0.55)
        aspect = garment_img.height / max(garment_img.width, 1)
        target_gh = int(target_gw * aspect)
        resized_garment = garment_img.resize((target_gw, target_gh), Image.Resampling.LANCZOS)

        # Center on upper torso
        pos_x = (pw - target_gw) // 2
        pos_y = int(ph * 0.28)

        # Composite garment onto person
        person_img.alpha_composite(resized_garment, (pos_x, pos_y))

        # Render prominent watermark overlay
        overlay = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Banner at top & center
        banner_height = max(int(ph * 0.08), 36)
        draw.rectangle([(0, 0), (pw, banner_height)], fill=(220, 38, 38, 220))  # Crimson warning banner

        watermark_text = "DEMO MODE — NOT AI (SYNTHETIC LOCAL COMPOSITE)"
        sub_text = "Commercial evaluation requires model upgrade or in-house weights"
        
        # Draw text using basic font with fallback
        try:
            font_title = ImageFont.load_default()
        except Exception:
            font_title = None

        draw.text((pw // 2, banner_height // 2 - 6), watermark_text, fill=(255, 255, 255, 255), anchor="mm", font=font_title)
        draw.text((pw // 2, banner_height // 2 + 8), sub_text, fill=(254, 226, 226, 255), anchor="mm", font=font_title)

        # Center translucent watermark badge
        badge_w, badge_h = int(pw * 0.6), int(ph * 0.12)
        bx0 = (pw - badge_w) // 2
        by0 = int(ph * 0.75)
        draw.rounded_rectangle([(bx0, by0), (bx0 + badge_w, by0 + badge_h)], radius=12, fill=(15, 23, 42, 210), outline=(239, 68, 68, 255), width=2)
        draw.text((pw // 2, by0 + badge_h // 2 - 8), "MOCK PREVIEW ONLY", fill=(248, 113, 113, 255), anchor="mm", font=font_title)
        draw.text((pw // 2, by0 + badge_h // 2 + 8), "VirtualFit AI Architecture Test", fill=(203, 213, 225, 255), anchor="mm", font=font_title)

        # Merge overlay
        final_img = Image.alpha_composite(person_img, overlay).convert("RGB")

        out_io = io.BytesIO()
        final_img.save(out_io, format="JPEG", quality=92, optimize=True)
        return out_io.getvalue()
