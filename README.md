# VirtualFit AI — Virtual Trial Room & In-Store Smart Mirror

[![Tests](https://img.shields.io/badge/backend_tests-17_passed-success?style=flat-square)](docs/TESTING.md)
[![Frontend](https://img.shields.io/badge/frontend_tests-10_passed-success?style=flat-square)](docs/TESTING.md)
[![License](https://img.shields.io/badge/core_license-MIT-blue?style=flat-square)](LICENSE)
[![Budget](https://img.shields.io/badge/budget-Rs_0-green?style=flat-square)](docs/RESEARCH.md)
[![Privacy](https://img.shields.io/badge/privacy-100%25_on--device_Mode_A-emerald?style=flat-square)](docs/PRIVACY.md)

VirtualFit AI is a privacy-first, hybrid virtual trial room designed for physical retail clothing stores and digital kiosks. A customer stands in front of a standard webcam and sees their live reflection wearing digital garments that dynamically track body motion in real time, with the option to generate photorealistic diffusion-based still try-on snapshots on demand.

---

## Key Features

- **Hybrid Two-Mode Architecture:**
  - **Mode A: "Live Preview (approximate fit)"**: In-browser client-side tracking running at 30–60 FPS powered by Google MediaPipe Tasks Vision (Apache 2.0). 2D garment affine warping anchored to shoulders, hips, and elbows with exponential smoothing filters (EMA). **100% on-device: 0 video frames uploaded to the cloud.**
  - **Mode B: "Realistic Try-On (AI-generated still)"**: On-demand single frame capture with explicit consent, transmitting to a decoupled backend adapter (`TryOnProvider`) to generate a photorealistic diffusion still with an interactive before/after split comparison slider and high-resolution download.
- **Strict Privacy-by-Design:**
  - Explicit "Start Camera" consent modal; camera tracks are never auto-started.
  - Zero-retention server architecture: customer images are wiped immediately after inference.
  - Aligned with India's Digital Personal Data Protection (DPDP) Act, 2023 principles.
- **Forensic Upload Validation:**
  - Real MIME sniffing via magic bytes (not trusting file extensions).
  - Decompression-bomb defense (`Image.MAX_IMAGE_PIXELS = 10_000_000`).
  - Automatic EXIF metadata stripping and collision-proof UUID filenames.
- **Protected Administrative Dashboard:**
  - Constant-time cryptographic token authentication (`X-Admin-Token`).
  - Ingest new garments, adjust shoulder scale and torso offset sliders, upload transparent cutouts, and manage inventory.
- **Kiosk-Optimized UI:**
  - Large touch targets (>= 44px) for interactive retail screens.
  - Glassmorphic futuristic aesthetic with dark mode and high-contrast typography.

---

## System Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                       |
|                                                                                         |
|  +--------------------+       +------------------------------------------------------+  |
|  |  Webcam Feed       | ----> | Google MediaPipe Tasks Vision (Pose Landmarker Wasm) |  |
|  |  (MediaDevices)    |       +------------------------------------------------------+  |
|  +--------------------+                                   |                             |
|            |                                              v (33 Pose Landmarks)         |
|            |                           +---------------------------------------------+  |
|            +-------------------------> | Canvas 2D/WebGL Warping Engine               |  |
|                                        | - Exponential Smoothing Filter (Jitter-free)|  |
|                                        | - Anchor: Shoulders (11,12) & Hips (23,24)  |  |
|                                        | - Dynamic Scale, Rotation & Fit             |  |
|                                        +---------------------------------------------+  |
|                                                               |                         |
|                                                               v                         |
|                                              [MODE A: LIVE PREVIEW (30-60 FPS)]         |
|                                                                                         |
|  [Mode B Trigger: "Generate realistic fit"]                                             |
|        |                                                                                |
|        v (High-Res Frame Capture + Explicit User Consent)                               |
+--------+--------------------------------------------------------------------------------+
         |
         | HTTP POST /api/tryon/generate (Multipart: Person Frame + Garment ID)
         v
+-----------------------------------------------------------------------------------------+
|                                   FASTAPI BACKEND                                       |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | API Router: /api/catalog, /api/tryon, /api/admin                                  |  |
|  +-----------------------------------------------------------------------------------+  |
|            |                                                      |                     |
|            v                                                      v                     |
|  +-------------------------+                           +-----------------------------+  |
|  | Catalog & Asset Service |                           | TryOn Provider Adapter      |  |
|  | - SQLite metadata DB    |                           | [TryOnProvider Interface]   |  |
|  | - Forensic Validation   |                           +-----------------------------+  |
|  +-------------------------+                                     |           |          |
|                                                                  v           v          |
|                                                     +---------------+ +---------------+ |
|                                                     | MockProvider  | | HF Space      | |
|                                                     | (Watermarked) | | (CatVTON)     | |
|                                                     +---------------+ +---------------+ |
+-----------------------------------------------------------------------------------------+
```

---

## AI Model & License Compliance Table

All models, licenses, and hosting platforms were verified at build time (**October 27, 2026**):

| Component / Model | Purpose | Verbatim License | Commercial Use Allowed? | Reference |
| :--- | :--- | :--- | :--- | :--- |
| **MediaPipe Pose Landmarker** | Client-side 33-point real-time skeletal tracking (Mode A) | **Apache License 2.0** | **YES** | [MediaPipe Model Card](https://github.com/google-ai-edge/mediapipe) |
| **rembg / U²-Net** | Background removal for garment cutouts | **MIT** (rembg) / **Apache 2.0** (U²-Net) | **YES** | [rembg Repo](https://github.com/danielgatis/rembg) |
| **CatVTON** | Lightweight diffusion try-on (Mode B) | **CC BY-NC-SA 4.0** | **NO** (Research / Eval Only) | [CatVTON Space](https://huggingface.co/spaces/zhengchong/CatVTON) |
| **IDM-VTON** | High-fidelity diffusion try-on (Mode B) | **CC BY-NC-SA 4.0** | **NO** (Research / Eval Only) | [IDM-VTON Repo](https://github.com/yisol/IDM-VTON) |
| **VirtualFit MockProvider** | Deterministic synthetic local preview with watermarking | **MIT License** | **YES** | Built-in |

> **Commercial Intent Rule:** Because CatVTON and IDM-VTON are licensed under CC BY-NC-SA 4.0, any commercial deployment requires proprietary licensing from the original authors or in-house models trained on clean commercial datasets. See [docs/ROADMAP.md](docs/ROADMAP.md) for the commercial training pathway.

---

## Quick Start (macOS Apple Silicon M1/M2/M3/M4)

### 1. Prerequisites
- macOS Apple Silicon
- Python 3.11+ (`brew install python@3.11`)
- Node.js v20+ and npm (`brew install node`)

### 2. Clone & Configure Environment
```bash
git clone https://github.com/your-org/virtualfit-ai.git
cd virtualfit-ai

# Copy environment variables
cp .env.example .env
```

### 3. Start Backend Server
```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run FastAPI backend (seeds sample clothing catalog automatically on first run)
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 4. Start Frontend Web Kiosk
In a second terminal:
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
- Web Kiosk Application: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

---

## Running Automated Verification & Tests

```bash
# 1. Run Backend Automated Tests (17 tests covering validation, auth, CRUD, adapters)
cd backend && PYTHONPATH=. .venv/bin/pytest -v

# 2. Run Backend Code Quality Linter
cd backend && .venv/bin/ruff check .

# 3. Run Frontend Automated Unit Tests (10 tests covering client, camera, catalog)
cd frontend && npm test

# 4. Run Frontend TypeScript Strict Typecheck
cd frontend && npm run typecheck

# 5. Run Frontend ESLint
cd frontend && npm run lint

# 6. Run Frontend Production Bundle Build
cd frontend && npm run build

# 7. Run Real Browser Verification Test (Headless Chrome + Fake Camera Stream)
node scripts/verify_app_browser.mjs
```

---

## Documentation Directory

Comprehensive technical and operational documentation is located in [`docs/`](docs/):

- [`docs/RESEARCH.md`](docs/RESEARCH.md) — Comprehensive model benchmark, verified licenses, free-tier hosting limits, and decision memo.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Technical component design, data flow diagrams, and zero-retention policy.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — Living progress tracker with verified completion statuses.
- [`docs/PRIVACY.md`](docs/PRIVACY.md) — Customer privacy architecture, on-device boundaries, and India DPDP Act alignment.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Step-by-step deployment guide for Cloudflare Pages (Frontend) and Hugging Face / Render (Backend).
- [`docs/TESTING.md`](docs/TESTING.md) — Automated test logs, live API verification results, and 20-point manual testing checklist.
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — Transparent list of technical trade-offs, 2D approximations, and licensing boundaries.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Strategic pathway from prototype to commercial 3D/neural real-time store installation.
- [`docs/HANDOVER.md`](docs/HANDOVER.md) — Complete onboarding guide for incoming developers.
- [`docs/GARMENT_GUIDE.md`](docs/GARMENT_GUIDE.md) — Photography manual for merchandising and catalog administrators.

---

## License

The VirtualFit AI application code and adapter scaffolding are distributed under the **MIT License**. Third-party models and libraries adhere to their respective upstream licenses as detailed in [`docs/RESEARCH.md`](docs/RESEARCH.md).
