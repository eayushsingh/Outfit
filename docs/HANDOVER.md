# VirtualFit AI — Engineering Handover Guide

**Welcome to the VirtualFit AI codebase!** This document provides everything an incoming engineer needs to run, maintain, extend, and deploy the system.

---

## 1. Codebase Organization

```
/Users/ayush/Desktop/outfit/
├── README.md               # Primary developer entry point & quick start
├── .env.example            # Canonical environment variable specification
├── .gitignore              # Ignores venvs, dist, uploads, sqlite dbs, node_modules
├── backend/                # Python 3.11+ FastAPI service
│   ├── app/
│   │   ├── api/            # Endpoints: catalog, tryon, admin, health
│   │   ├── models/         # Pydantic v2 schemas: garment, tryon
│   │   ├── providers/      # Adapter layer: TryOnProvider, mock, hf_space, realtime_stub
│   │   ├── services/       # Catalog SQLite CRUD, forensic upload validation, sample seed
│   │   ├── config.py       # Pydantic BaseSettings
│   │   └── main.py         # App lifespan, CORS, error handling
│   ├── tests/              # 17 automated tests (upload forensic, auth, catalog, provider)
│   ├── requirements.txt    # Pinned production backend dependencies
│   └── pyproject.toml      # Ruff linter & Pytest configurations
├── frontend/               # React 18 + TypeScript + Vite kiosk application
│   ├── public/
│   │   ├── models/         # Pre-downloaded pose_landmarker_lite.task (offline capable)
│   │   └── wasm/           # MediaPipe WebAssembly engine assets
│   ├── src/
│   │   ├── api/            # Typed ApiClient
│   │   ├── components/     # WarpEngine, CatalogDrawer, ModeBOverlay, Modals
│   │   ├── hooks/          # useCamera (track lifecycle), usePoseLandmarker (MediaPipe)
│   │   ├── types/          # Domain TypeScript interfaces
│   │   ├── index.css       # Design system tokens, glassmorphism, kiosk CSS
│   │   └── App.tsx         # Main kiosk layout & state coordination
│   ├── package.json        # Dependencies (MediaPipe, Lucide, Vitest)
│   └── vite.config.ts      # Proxy to backend (:8000) and vitest setup
├── docs/                   # Full documentation suite
│   ├── RESEARCH.md         # Model comparison, verified licenses, hosting analysis
│   ├── ARCHITECTURE.md     # Component design, data flow diagrams, zero-retention
│   ├── PROGRESS.md         # Living checklist with verified statuses
│   ├── PRIVACY.md          # DPDP Act alignment, data boundaries, non-legal advice note
│   ├── DEPLOYMENT.md       # Free tier setup for Cloudflare Pages + HF Spaces/Render
│   ├── TESTING.md          # Real test logs, browser verification, manual checklist
│   ├── LIMITATIONS.md      # Honest list of technical trade-offs & approximations
│   ├── ROADMAP.md          # Future commercial path (SMPL-X 3D mesh, edge GPUs)
│   ├── GARMENT_GUIDE.md    # Photography manual for store catalog managers
│   └── screenshots/        # Real browser verification screenshots
└── scripts/
    └── verify_app_browser.mjs # Automated Puppeteer real browser verification runner
```

---

## 2. How to Run Locally

### Terminal 1: Backend
```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/api/health`

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
- Web Kiosk: `http://127.0.0.1:5173/`

---

## 3. How to Run Tests & Quality Linters

Run all checks from the workspace root or individual directories:

```bash
# 1. Backend automated tests (17 passed)
cd backend && PYTHONPATH=. .venv/bin/pytest -v

# 2. Backend Ruff linter
cd backend && .venv/bin/ruff check .

# 3. Frontend Vitest suite (10 passed)
cd frontend && npm test

# 4. Frontend TypeScript strict check
cd frontend && npm run typecheck

# 5. Frontend ESLint
cd frontend && npm run lint

# 6. Frontend production build
cd frontend && npm run build

# 7. Real browser verification (Headless Chrome)
node scripts/verify_app_browser.mjs
```

---

## 4. How to Swap or Add a New Try-On Provider

The virtual try-on inference backend uses an **Adapter Pattern** (`backend/app/providers/base.py`).

### Step 1: Create Provider Class
Create `backend/app/providers/your_provider.py` inheriting from `TryOnProvider`:
```python
from app.providers.base import TryOnProvider

class YourCustomProvider(TryOnProvider):
    @property
    def name(self) -> str:
        return "custom_ai"

    @property
    def display_name(self) -> str:
        return "Custom Enterprise Provider"

    @property
    def is_demo(self) -> bool:
        return False

    @property
    def license_name(self) -> str:
        return "Commercial Proprietary"

    @property
    def license_url(self) -> str:
        return "https://example.com/license"

    @property
    def is_commercial_allowed(self) -> bool:
        return True

    async def generate(self, person_image_bytes, garment_image_bytes, category="upper_body", options=None) -> bytes:
        # Call your custom inference endpoint
        # Return JPEG bytes
        ...
```

### Step 2: Register in Factory
In `backend/app/providers/factory.py`:
```python
elif provider_type == "custom_ai":
    return YourCustomProvider()
```

### Step 3: Configure Environment
In `.env`:
```env
TRYON_PROVIDER=custom_ai
DEMO_MODE=false
```

---

## 5. Known Quirks & Immediate Next Tasks

1. **Camera Permissions on macOS Chrome:** When running outside headless mode, macOS requires granting camera permission to Google Chrome in *System Settings -> Privacy & Security -> Camera*.
2. **MediaPipe WASM Fallback:** The frontend is configured to load WASM assets from `/wasm` first, falling back to CDN if local files are missing.
3. **Next Recommended Tasks:**
   - Integrate Cloudflare R2 object storage for uploads when deploying to ephemeral containers (Render Free).
   - Implement client-side self-occlusion mask using MediaPipe Selfie Segmentation.
   - Train custom commercial LoRA weights on licensed e-commerce clothing imagery.
