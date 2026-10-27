# VirtualFit AI — Engineering Progress Tracker

Last Updated: 2026-10-27
Operating Mode: Autonomous Full-Stack & ML Principal Engineer
Budget: Rs 0 | Target Hardware: Apple Silicon M4 / In-Browser + Cloud Free Tiers

Status Legend:
- `NOT STARTED`: Work has not begun.
- `IN PROGRESS`: Actively being designed or implemented.
- `DONE-UNVERIFIED`: Code/artifact written, but awaiting runtime execution or verification.
- `DONE-VERIFIED`: Executed, tested, and observed functioning as intended.
- `FIXED-VERIFIED`: Defect fixed, verified in real browser, and backed by screenshot evidence.
- `BLOCKED`: Prevented by external constraints or dependencies.

---

## Defect Remediation & Hardening (Mode A & Mode B)

### Defect 1: Video does not fill stage (left-third crop & black gaps)
- **Status:** `FIXED-VERIFIED`
- **Root Cause:** Mismatch between `<video>` CSS `object-fit: cover` and unconstrained canvas resolution, causing non-uniform stretching and black gaps.
- **Fix Implemented:** Re-architected stage layout into a unified responsive container (`#mirror-stage`) dynamically sized to the exact aspect ratio of the video feed via `calculateStageDimensions`. Positioned `<video>` and `<canvas>` absolutely at identical dimensions with centered symmetrical letterboxing across all screen ratios.
- **Evidence Screenshots:**
  - `docs/screenshots/c1_stage_1280x720.png` (Desktop HD)
  - `docs/screenshots/c1_stage_1920x1080.png` (Full HD Kiosk)
  - `docs/screenshots/c1_stage_tablet_768x1024.png` (Tablet Portrait)
  - `docs/screenshots/c1_stage_phone_390x844.png` (Phone Portrait)

### Defect 2: Garment overlay is wrong (rotated flat rectangle at bottom right)
- **Status:** `FIXED-VERIFIED`
- **Root Cause:** Uncoordinated horizontal mirror transforms (CSS `scaleX(-1)` on video, but raw X coordinates on canvas, inverting horizontal placement) coupled with low-resolution placeholder geometry.
- **Fix Implemented:**
  1. Created single canonical transformation function `landmarkToCanvas(lm, dims, mirrored=true)` that performs precise mirror mapping without reversing canvas text.
  2. Sourced and generated high-fidelity, organic transparent PNG cutouts (800x1000) with realistic collar curves, folds, and sleeve contours.
  3. Calibrated anchor math: collar centers at shoulder midpoint, width scales with shoulder distance / 0.54, height scales proportionally with EMA smoothing.
  4. Added `onload` verification with `naturalWidth > 0`. Zero placeholder rectangles drawn on error.
- **Evidence Screenshots:**
  - `docs/screenshots/c2_motion_1_center.png` (Natural center fit)
  - `docs/screenshots/c2_motion_2_closer_scaled.png` (Stepped closer -> scaled up)
  - `docs/screenshots/c2_motion_3_tilted_rotation.png` (Tilted shoulders -> rotated)
  - `docs/screenshots/c2_motion_4_shifted_right.png` (Lateral tracking)
  - `docs/screenshots/c5_garment_switched_jacket.png` (Jacket switch)
  - `docs/screenshots/c5_garment_cleared.png` (Cleared overlay)

### Defect 3: No visible tracking feedback
- **Status:** `FIXED-VERIFIED`
- **Fix Implemented:** Added live tracking status chip (`🟢 Person detected` / `🟡 Move back so shoulders are visible` / `⚪ No person`), real-time FPS counter, and an active Debug Skeleton rendering bones (connections) and glowing circular joint keypoints.
- **Evidence Screenshots:**
  - `docs/screenshots/c4_debug_skeleton_aligned.png` (Aligned bones & keypoints)

### Defect 4: Framing & Out-of-frame shoulders
- **Status:** `FIXED-VERIFIED`
- **Fix Implemented:** Created `assessFraming` utility. When shoulders are cropped by edges (`< 4%` margin), low confidence (`< 0.5`), or too close (`> 65%` width), garment smoothly fades out and a floating toast `"⚠️ Step back so your shoulders and torso are visible"` appears alongside a faint body outline guide.
- **Evidence Screenshots:**
  - `docs/screenshots/c3_framing_step_back_toast.png` (Warning toast & no garment drawn)

### Defect 5: Mode B (Realistic Fit) honesty check
- **Status:** `FIXED-VERIFIED`
- **Fix Implemented:** Updated `ModeBOverlay` to verify provider status. When in demo mode, prominently displays `DEMO: NOT AI (SYNTHETIC LOCAL COMPOSITE)` in bold warning styling. Documented license restrictions and lack of free continuous diffusion try-on in `docs/LIMITATIONS.md`.
- **Evidence Screenshots:**
  - `docs/screenshots/c7_mode_b_demo_honesty.png` (Honest DEMO: NOT AI badge)

---

## Core Milestones Checklist

### Stage 1: Research & Decision Memo
- [DONE-VERIFIED] Stage 1.1: Web research on diffusion try-on models and exact licenses (all verified CC BY-NC-SA 4.0).
- [DONE-VERIFIED] Stage 1.2: Free tier hosting & GPU runtime limits (Cloudflare Pages, HF Spaces, Render, Colab TOS ban).
- [DONE-VERIFIED] Stage 1.3: Real-time pose analysis (MediaPipe Tasks Vision Apache 2.0).
- [DONE-VERIFIED] Stage 1.4: Compiled `docs/RESEARCH.md`.

### Stage 2: Target Architecture & Scaffolding
- [DONE-VERIFIED] Stage 2.1: Compiled `docs/ARCHITECTURE.md`.
- [DONE-VERIFIED] Stage 2.2: Setup repo structure (`frontend/`, `backend/`, `docs/`, `.env.example`, `.gitignore`).
- [DONE-VERIFIED] Stage 2.3: Configured toolchains (TypeScript strict, Vite, FastAPI, Ruff, Pytest, Vitest).

### Stage 3: Backend Implementation
- [DONE-VERIFIED] Stage 3.1: Python 3.11 virtualenv & dependencies.
- [DONE-VERIFIED] Stage 3.2: Domain models & SQLite catalog.
- [DONE-VERIFIED] Stage 3.3: Strict file upload validation (magic bytes, decompression bomb defense, UUID filenames).
- [DONE-VERIFIED] Stage 3.4: TryOn Provider Adapter Pattern (`TryOnProvider`, `MockProvider`, `HuggingFaceSpaceProvider`).
- [DONE-VERIFIED] Stage 3.5: Admin authentication (`X-Admin-Token` constant-time comparison).
- [DONE-VERIFIED] Stage 3.6: Rate limiting and structured logging.

### Stage 4: Frontend Implementation (Core & Mode A)
- [DONE-VERIFIED] Stage 4.1: React + TypeScript + Vite touch-friendly kiosk UI.
- [DONE-VERIFIED] Stage 4.2: Camera management hook with clean track teardown.
- [DONE-VERIFIED] Stage 4.3: MediaPipe Tasks Vision Pose Landmarker integration (local wasm and task model).
- [DONE-VERIFIED] Stage 4.4: Mode A Canvas 2D warping engine with EMA smoothing and framing guidance.
- [DONE-VERIFIED] Stage 4.5: Digital catalog drawer with instant outfit switching.

### Stage 5: Mode B "Realistic Try-On" Integration
- [DONE-VERIFIED] Stage 5.1: High-res video frame snapshot capture with consent.
- [DONE-VERIFIED] Stage 5.2: Backend inference call with queue and timeout handling.
- [DONE-VERIFIED] Stage 5.3: Result view with honest DEMO / AI badges, before/after split slider, and download.

### Stage 6: Admin Dashboard & Garment Photo Guide
- [DONE-VERIFIED] Stage 6.1: Token-protected Admin panel for catalog CRUD.
- [DONE-VERIFIED] Stage 6.2: Garment photo guide modal.
- [DONE-VERIFIED] Stage 6.3: Seeded catalog with 5 high-fidelity transparent PNG apparel cutouts.

### Stage 7: Customer Privacy & Security
- [DONE-VERIFIED] Stage 7.1: Pre-camera privacy consent modal.
- [DONE-VERIFIED] Stage 7.2: Mode B third-party AI transmission disclosure.
- [DONE-VERIFIED] Stage 7.3: Backend zero-retention guarantee.
- [DONE-VERIFIED] Stage 7.4: Authored `docs/PRIVACY.md`.

### Stage 8: Automated & Runtime Verification
- [DONE-VERIFIED] Stage 8.1: Backend automated test suite (`pytest`: 17 passed in 0.68s).
- [DONE-VERIFIED] Stage 8.2: Frontend automated test suite (`vitest`: 20 passed in 0.54s, `tsc` passed, `eslint` passed, `vite build` passed).
- [DONE-VERIFIED] Stage 8.3: Real browser verification in Chrome with 14 acceptance screenshots.
- [DONE-VERIFIED] Stage 8.4: Mode A network audit: 0 frame upload requests emitted.
- [DONE-VERIFIED] Stage 8.5: Compiled `docs/TESTING.md`.

### Stage 9: Deployment & Handover Documentation
- [DONE-UNVERIFIED] Stage 9.1: Authored `docs/DEPLOYMENT.md` (Cloudflare Pages + HuggingFace Spaces / Render).
- [DONE-VERIFIED] Stage 9.2: Authored `docs/LIMITATIONS.md`.
- [DONE-VERIFIED] Stage 9.3: Authored `docs/ROADMAP.md`.
- [DONE-VERIFIED] Stage 9.5: Authored root `README.md`.

---

## Honest Summary: Gap to Commercial-Grade Virtual Mirror

While VirtualFit AI achieves sub-16ms zero-cost 60 FPS live tracking and an honest high-resolution generative snapshot pipeline, the following fundamental gaps separate this architecture from a multi-thousand-dollar commercial retail mirror:

1. **2D Overlay Geometric & Physical Ceilings (Mode A)**:
   - **No 3D Rotation / Depth**: Affine and planar warping map a 2D flat-lay image onto 2D skeletal coordinates. When a user turns sideways or at an oblique angle (>30°), the garment does not reveal its 3D profile; it merely compresses horizontally. Commercial mirrors use 3D parametric meshes (SMPL/SMPL-X) or dense depth sensors (e.g., Azure Kinect / Intel RealSense).
   - **No Self-Occlusion Modeling**: Forearms crossing over the chest or hands placed in pockets will be rendered underneath the 2D garment overlay unless real-time semantic segmentation masks (e.g., body-part parsing) are calculated every frame.
   - **No Dynamic Fabric Drape / Cloth Simulation**: The 2D garment lacks physical mass, wrinkle dynamics, stiffness, and gravity-induced cloth flow. It behaves as a semi-rigid sticker rather than woven textile.

2. **Generative Diffusion Still vs. Continuous Video (Mode B)**:
   - **Still Only, Not Real-Time Live Stream**: Diffusion try-on (CatVTON/IDM-VTON) operates on discrete static images requiring 8–35 seconds per generation. Zero-latency live diffusion video at 30 FPS does not exist today on zero-cost hardware.
   - **Free Cloud GPU Queues & Cold Starts**: Free hosting platforms (Hugging Face Spaces ZeroGPU) experience traffic-dependent queue delays of 20–60 seconds and cold boots, which can cause timeout failures in retail environments without dedicated edge workstations.
   - **Potential Edge Hallucinations**: Diffusion inpainting can sporadically hallucinate collar edges, modify skin texture near the neckline, or misunderstand tuck-in versus untucked garment intent.

3. **Intellectual Property & Licensing Boundaries**:
   - **Academic Non-Commercial Checkpoints**: Leading open diffusion weights (CatVTON, IDM-VTON, OOTDiffusion) are released under **CC BY-NC-SA 4.0**, strictly prohibiting revenue-generating commercial deployment without negotiated proprietary licensing or fine-tuning custom models on permissively licensed datasets.
