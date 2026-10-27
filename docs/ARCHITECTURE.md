# VirtualFit AI — System Architecture & Component Design

**Document Version:** 1.0.0  
**Status:** Approved  
**Last Updated:** 2026-10-27  

---

## 1. System Overview

VirtualFit AI is structured as a privacy-first, hybrid virtual trial room composed of:
1. **A lightweight client-side application (React + TypeScript + WebAssembly)** handling real-time video capture, skeletal landmark tracking, and 2D garment warping at 30–60 FPS without sending any video data to the cloud.
2. **A lean FastAPI backend service (Python 3.11+)** managing the clothing catalog, secure image ingest with forensic validation, token-authenticated administrative management, and a pluggable inference adapter layer for diffusion-based still try-on.
3. **An external inference adapter layer** connecting to either a sandboxed mock generator or public/private Hugging Face diffusion spaces.

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
|  | - MIME & Dimension      |                           +-----------------------------+  |
|  |   Validation (Pillow)   |                                     |           |          |
|  | - Sanitized storage     |                                     |           |          |
|  +-------------------------+                                     |           |          |
+------------------------------------------------------------------+-----------+----------+
                                                                   |           |
                              +------------------------------------+           |
                              |                                                |
                              v                                                v
               +-----------------------------+                  +------------------------------+
               | MockProvider                |                  | HuggingFaceSpaceProvider     |
               | (Instant watermarked demo)  |                  | (CatVTON / IDM-VTON Spaces)  |
               +-----------------------------+                  +------------------------------+
```

---

## 2. Component Design

### 2.1 Frontend Architecture (`frontend/`)
- **Technology:** React 18, TypeScript (Strict Mode), Vite, Tailwind CSS.
- **Key Modules & Custom Hooks:**
  - `useCamera`: Wraps `navigator.mediaDevices.getUserMedia`. Manages explicit permission requests, camera device enumeration, resolution constraints, track lifecycle (clean track stopping when unmounted or paused), and error boundaries.
  - `usePoseLandmarker`: Instantiates Google MediaPipe `@mediapipe/tasks-vision`. Handles WebAssembly asset loading, GPU delegate fallbacks, and processes video frames via `detectForVideo`.
  - `GarmentWarpEngine`: High-performance Canvas 2D / WebGL rendering loop. Computes affine transform matrices from shoulder landmarks (points 11 and 12) and torso landmarks (points 23 and 24). Applies Exponential Moving Average (EMA) smoothing to coordinates to suppress webcam sensor noise.
  - `CatalogDrawer`: Kiosk-optimized touch-friendly clothing selector with search, category filters, and thumbnail previews.
  - `ModeBSwitcher`: Manages frame freeze, explicit privacy disclosure dialog, backend polling/SSE status, comparison slider (before vs. after), and client-side high-resolution download.

### 2.2 Backend Architecture (`backend/`)
- **Framework:** FastAPI with Uvicorn.
- **Layers:**
  - `app/api/`: REST endpoints for `/catalog` (public GET, admin POST/PUT/DELETE), `/tryon` (POST generation request), `/health`, and `/admin/auth`.
  - `app/models/`: Pydantic V2 schemas for request validation, error responses, and garment entity models.
  - `app/services/`:
    - `catalog_service.py`: CRUD operations backed by SQLite with thread-safe connection pooling.
    - `upload_service.py`: Strict file validation: verifies magic bytes (JPEG/PNG/WebP), protects against decompression bombs (`Image.MAX_IMAGE_PIXELS`), strips dangerous metadata (EXIF GPS), re-encodes images safely, and assigns collision-proof UUID filenames.
    - `background_removal_service.py`: Modular background removal utility (via `rembg` with Apache 2.0 `u2net` weights) to prepare transparent garment cutouts.
  - `app/providers/`:
    - `base.py`: Abstract Base Class `TryOnProvider` defining `generate(person_image_bytes, garment_image_bytes, category, options) -> bytes`.
    - `mock_provider.py`: Deterministic local generator that composites person and garment images with a prominent, unmistakable watermark: `"DEMO MODE — NOT AI"`.
    - `hf_space_provider.py`: Communicates with Hugging Face Spaces (e.g., `zhengchong/CatVTON` or `yisol/IDM-VTON`) using `gradio_client` with timeout safeguards and exponential backoff retry.
    - `realtime_stub_provider.py`: Documented architectural stub indicating how future ultra-low-latency WebRTC/gRPC diffusion streams or 3D Gaussian Splatting streams would plug in.

---

## 3. Data Flow & Zero-Retention Security

### 3.1 Mode A ("Live Preview")
1. Customer grants webcam permission.
2. Video frames stream directly into an HTML `<video>` element.
3. MediaPipe processes frames directly in browser memory.
4. Canvas overlays the warped garment onto the live video.
5. **Network transmission: 0 bytes. No images or landmark coordinates leave the browser.**

### 3.2 Mode B ("Realistic Try-On")
1. Customer clicks "Generate realistic fit".
2. UI displays explicit privacy disclosure naming the AI backend.
3. Customer clicks "Agree & Proceed".
4. Canvas extracts the current high-resolution video frame as JPEG.
5. Frame is transmitted via encrypted HTTPS POST to `/api/tryon/generate`.
6. Backend streams frame to chosen `TryOnProvider`.
7. Backend immediately deletes any temporary files created during inference from disk/memory.
8. Server returns generated image bytes to client and writes zero customer image data to disk or persistent databases.

---

## 4. Error Handling & State Machine

The client and server implement explicit, typed state machines:
- **Camera States:** `idle` -> `requesting_permission` -> `active` -> `permission_denied` -> `no_device_found` -> `track_error`.
- **Inference States:** `idle` -> `capturing` -> `uploading` -> `queued` -> `processing` -> `completed` -> `error` (with `timeout`, `quota_exceeded`, `unreachable` sub-states).
