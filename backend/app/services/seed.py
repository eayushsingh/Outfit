import io

from PIL import Image, ImageDraw

from app.config import settings
from app.models.garment import GarmentCategory, GarmentCreate
from app.services.catalog_service import catalog_service


def create_sample_shirt_assets(color: tuple, style: str) -> tuple[bytes, bytes]:
    """
    Programmatically renders a realistic flat-lay apparel asset and matching
    transparent cutout PNG with collar, body, and arm contours.
    """
    size = (768, 1024)
    # 1. Render Transparent Cutout (Mode A)
    cutout = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(cutout)

    # Torso & Arms Polygon
    if style == "tshirt":
        # Short sleeves
        poly = [
            (290, 180), (478, 180),  # Neckline
            (570, 240), (670, 360), (590, 420), (520, 360), # Right sleeve
            (510, 800), (258, 800),  # Torso hem
            (248, 360), (178, 420), (98, 360), (198, 240)   # Left sleeve
        ]
        draw.polygon(poly, fill=color)
        # Crew neckline cut
        draw.chord([(300, 120), (468, 240)], start=0, end=180, fill=(0, 0, 0, 0))
        # Inner collar outline
        draw.arc([(300, 120), (468, 240)], start=0, end=180, fill=(40, 40, 40, 180), width=6)

    elif style == "jacket":
        # Denim / Outerwear jacket
        poly = [
            (280, 160), (488, 160),
            (600, 230), (710, 520), (620, 550), (530, 400), # Right long sleeve
            (520, 820), (248, 820), # Hem
            (238, 400), (148, 550), (58, 520), (168, 230)  # Left long sleeve
        ]
        draw.polygon(poly, fill=color)
        # Lapels & Center zip/seam
        draw.line([(384, 210), (384, 820)], fill=(30, 41, 59, 220), width=8)
        draw.polygon([(384, 210), (320, 300), (384, 380)], fill=(color[0] + 20, color[1] + 20, color[2] + 20, 255))
        draw.polygon([(384, 210), (448, 300), (384, 380)], fill=(color[0] + 15, color[1] + 15, color[2] + 15, 255))
        # Pockets
        draw.rounded_rectangle([(270, 420), (350, 520)], radius=6, outline=(20, 30, 45, 200), width=4)
        draw.rounded_rectangle([(418, 420), (498, 520)], radius=6, outline=(20, 30, 45, 200), width=4)

    elif style == "hoodie":
        # Hoodie with hood silhouette
        poly = [
            (270, 140), (498, 140),
            (620, 220), (700, 540), (610, 570), (525, 410),
            (515, 840), (253, 840),
            (243, 410), (158, 570), (68, 540), (148, 220)
        ]
        draw.polygon(poly, fill=color)
        # Draw hood contour
        draw.chord([(290, 80), (478, 230)], start=180, end=360, fill=color)
        # Kangaroo pouch pocket
        draw.polygon([(290, 600), (478, 600), (498, 730), (270, 730)], fill=(color[0] - 15, color[1] - 15, color[2] - 15, 255))
        # Drawstrings
        draw.line([(360, 210), (360, 360)], fill=(240, 240, 240, 230), width=5)
        draw.line([(408, 210), (408, 370)], fill=(240, 240, 240, 230), width=5)

    else:
        # Classic Oxford Shirt
        poly = [
            (290, 170), (478, 170),
            (590, 230), (690, 530), (605, 560), (520, 390),
            (510, 810), (258, 810),
            (248, 390), (163, 560), (78, 530), (178, 230)
        ]
        draw.polygon(poly, fill=color)
        # Oxford collar flaps
        draw.polygon([(384, 210), (310, 220), (330, 270), (384, 250)], fill=(245, 247, 250, 255))
        draw.polygon([(384, 210), (458, 220), (438, 270), (384, 250)], fill=(235, 240, 245, 255))
        # Button placket & pearl buttons
        draw.line([(384, 240), (384, 810)], fill=(210, 215, 225, 240), width=18)
        for by in range(300, 780, 80):
            draw.ellipse([(380, by - 4), (388, by + 4)], fill=(255, 255, 255, 255), outline=(180, 185, 195, 255), width=2)

    # 2. Render Full Flat-Lay Studio Image (Mode B)
    studio = Image.new("RGB", size, (248, 250, 252))  # Clean studio backdrop
    s_draw = ImageDraw.Draw(studio)
    # Subtle drop shadow behind garment
    s_draw.ellipse([(140, 780), (628, 860)], fill=(226, 232, 240))
    # Paste garment cutout
    studio.paste(cutout, (0, 0), cutout)

    out_cutout = io.BytesIO()
    cutout.save(out_cutout, format="PNG", optimize=True)

    out_studio = io.BytesIO()
    studio.save(out_studio, format="JPEG", quality=92, optimize=True)

    return out_studio.getvalue(), out_cutout.getvalue()


def seed_sample_catalog():
    """Seeds the catalog with curated, permissive sample garments if empty."""
    existing = catalog_service.list_garments()
    if existing:
        return

    upload_dir = settings.resolve_path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    samples = [
        {
            "name": "Classic Navy Oxford Button-Down",
            "category": GarmentCategory.SHIRT,
            "style": "shirt",
            "color": (30, 58, 110, 255),
            "desc": "Crisp 100% cotton Oxford shirt with buttoned collar and barrel cuffs.",
            "filename_base": "navy_oxford_shirt",
            "hints": {"shoulder_scale": 1.05, "torso_offset_y": 0.02, "aspect_ratio": 0.75}
        },
        {
            "name": "Essential Charcoal Crewneck T-Shirt",
            "category": GarmentCategory.TSHIRT,
            "style": "tshirt",
            "color": (51, 65, 85, 255),
            "desc": "Heavyweight combed cotton tee with tailored fit and reinforced seams.",
            "filename_base": "charcoal_crew_tee",
            "hints": {"shoulder_scale": 1.0, "torso_offset_y": 0.0, "aspect_ratio": 0.75}
        },
        {
            "name": "Vintage Washed Denim Trucker Jacket",
            "category": GarmentCategory.JACKET,
            "style": "jacket",
            "color": (70, 95, 133, 255),
            "desc": "Classic denim trucker jacket with brass hardware and dual chest flap pockets.",
            "filename_base": "denim_trucker_jacket",
            "hints": {"shoulder_scale": 1.12, "torso_offset_y": 0.04, "aspect_ratio": 0.75}
        },
        {
            "name": "Urban Stealth Heavyweight Hoodie",
            "category": GarmentCategory.HOODIE,
            "style": "hoodie",
            "color": (24, 24, 27, 255),
            "desc": "450 GSM French terry cotton hoodie with fleece lining and double-layered hood.",
            "filename_base": "stealth_black_hoodie",
            "hints": {"shoulder_scale": 1.15, "torso_offset_y": 0.03, "aspect_ratio": 0.75}
        },
        {
            "name": "Crimson Relaxed Athletic Tee",
            "category": GarmentCategory.TSHIRT,
            "style": "tshirt",
            "color": (185, 28, 28, 255),
            "desc": "Breathable moisture-wicking crimson tee designed for high mobility.",
            "filename_base": "crimson_athletic_tee",
            "hints": {"shoulder_scale": 1.0, "torso_offset_y": 0.0, "aspect_ratio": 0.75}
        }
    ]

    for item in samples:
        studio_bytes, cutout_bytes = create_sample_shirt_assets(item["color"], item["style"])

        img_fn = f"{item['filename_base']}.jpg"
        cut_fn = f"{item['filename_base']}_cutout.png"

        with open(upload_dir / img_fn, "wb") as f:
            f.write(studio_bytes)
        with open(upload_dir / cut_fn, "wb") as f:
            f.write(cutout_bytes)

        garment_data = GarmentCreate(
            name=item["name"],
            category=item["category"],
            description=item["desc"],
            anchor_hints=item["hints"]
        )

        catalog_service.create_garment(
            garment_data,
            image_url=f"/api/catalog/assets/{img_fn}",
            cutout_url=f"/api/catalog/assets/{cut_fn}"
        )

    print(f"Successfully seeded {len(samples)} permissive sample garments.")
