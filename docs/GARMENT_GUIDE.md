# VirtualFit AI — Garment Photography & Ingestion Manual

**Audience:** Retail Store Managers, Merchandisers, and Catalog Administrators  
**Purpose:** Instructions for capturing apparel photography to achieve the highest visual realism in VirtualFit AI's virtual trial mirror.

---

## 1. Photography Specifications for Digital Garments

VirtualFit AI operates on a hybrid architecture:
- **Mode A (Live Mirror):** Uses a transparent PNG cutout to warp apparel dynamically across the customer's live motion stream.
- **Mode B (Realistic Still):** Uses a high-resolution studio photo to guide generative diffusion inpainting.

### 1.1 The Golden Rules of Garment Photography
1. **Front-Facing Symmetrical View:**
   - Place the garment perfectly flat or mount on a clear ghost mannequin directly facing the camera lens (perpendicular to optical axis).
   - Never take shots at an angle or perspective tilt.
2. **Spread Sleeves and Collar:**
   - Spread sleeves evenly at a natural 30-degree angle from the torso.
   - For button-downs, button the collar and placket straight. Smooth out wrinkles and fabric bunches.
3. **Neutral Studio Backdrop:**
   - Use a seamless white, light-gray, or high-contrast solid backdrop.
   - Avoid wooden tables, textured fabric, or store retail racks.
4. **Even, Diffused Studio Lighting:**
   - Use two softbox lights placed at 45-degree angles to illuminate both sides equally.
   - Eliminate harsh flash shadows behind the collar and hem.
5. **No Human Models in Catalog Photos:**
   - For Mode B, **never** photograph a garment being worn by a human model. Diffusion models confuse the model's body contours with the customer's body, causing double-body distortions.

---

## 2. File Format & Technical Guidelines

| Parameter | Recommended Specification | Hard System Limit |
| :--- | :--- | :--- |
| **File Format** | JPEG (Mode B studio photo), PNG with Alpha (Mode A cutout) | JPEG, PNG, WebP |
| **Max File Size** | 1 MB – 3 MB | 5 MB (`MAX_UPLOAD_SIZE_BYTES`) |
| **Resolution** | 1024 x 1365 px (3:4 ratio) or 768 x 1024 px | Min: 64x64 px, Max: 4096x4096px |
| **Color Profile** | sRGB | sRGB / RGB |
| **Background** | Transparent for Mode A; Pure White (#FFFFFF) for Mode B | Standard RGBA / RGB |

---

## 3. Step-by-Step: Adding New Garments via Admin Dashboard

1. **Access the Admin Panel:**
   - In the VirtualFit AI mirror header, click the **Admin** button (gear icon).
   - Enter your store's administrative key (defined in `ADMIN_API_KEY`).
   - Click **Unlock Dashboard**.
2. **Fill in Merchandising Information:**
   - **Garment Name:** Distinct retail product title (e.g., *"Vintage Washed Denim Trucker Jacket"*).
   - **Category:** Select from `Shirt`, `T-Shirt`, `Jacket`, `Hoodie`, `Sweater`, or `Other`.
   - **Description:** Fabric composition, fit style, or care instructions.
3. **Upload Photos:**
   - **Flat-Lay Photo (Required):** The clean studio photo used for Mode B realistic try-on.
   - **Transparent Cutout PNG (Recommended):** The isolated garment cutout with transparent background for Mode A real-time tracking.
4. **Tune Anchor Scale Controls:**
   - Adjust the **Mode A Shoulder Scale** slider (default 1.0x; increase to 1.15x for bulky winter outerwear, decrease to 0.95x for slim-fit shirts).
   - Adjust the **Mode A Torso Offset Y** slider to fine-tune vertical collar positioning.
5. **Verify and Save:**
   - Check the instant image preview thumbnail.
   - Click **Upload & Add to Catalog**. The new garment appears immediately in the store mirror catalog.

---

## 4. Troubleshooting Bad Virtual Fits

| Symptom | Root Cause | Fix |
| :--- | :--- | :--- |
| Mode A garment appears misaligned or rotated sideways | Garment was photographed tilted or sleeves were unevenly bunched | Re-shoot garment flat on a grid line ensuring symmetrical shoulder alignment. |
| Black borders around garment in live mirror | Image was saved as a transparent JPEG (which lacks alpha channels) | Export garment cutout strictly as a **PNG** with an active alpha channel. |
| Mode B diffusion produces blurred or distorted collar | Studio photo resolution was below 512px or had heavy digital compression | Upload photos with at least 1024px on the longest dimension. |
| Mode B creates strange neck/head artifacts | Photo contained a mannequin head or neck stand | Use ghost-mannequin techniques or digitally mask out mannequin necks before upload. |
