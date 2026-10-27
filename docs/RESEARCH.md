# VirtualFit AI — Technology Research & Feasibility Evaluation

**Date of Research:** October 27, 2026  
**Investigator:** VirtualFit AI Autonomous Lead Architect & Principal Engineer  
**Operating Hardware:** Apple MacBook Air (M4, 2024) / Standard Consumer Webcams  
**Hard Constraints:** Rs 0 Budget | Zero Paid Subscriptions | Commercial Intent | Strict Honest Reporting  

---

## 1. Executive Summary & Feasibility Finding

A primary objective was investigating whether a **photorealistic, real-time (30+ fps) AI virtual try-on** can be built and run continuously at **Rs 0 budget**.

### Definitive Finding: INFEASIBLE AT ZERO COST
1. **Generative Diffusion Latency:** Modern virtual try-on diffusion models (IDM-VTON, CatVTON, OOTDiffusion) require between **8 to 40 seconds per single frame** on enterprise GPUs (Nvidia A100 / A10G / T4). Even bleeding-edge video diffusion research (Wan2.1-based MagicTryOn, SwiftTry) takes minutes per short clip and exhibits severe spatiotemporal flickering when applied to live feeds.
2. **Zero-Cost Compute Limits:** Free tiers on Hugging Face ZeroGPU, Colab, or Kaggle do not provide continuous dedicated GPU streaming. Google Colab and Kaggle expressly prohibit using their notebook runtimes as public web service backends.
3. **Licensing Obstacle:** Virtually every state-of-the-art academic diffusion try-on model is released under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** license. They **cannot be legally deployed for commercial exploitation** without proprietary re-licensing or in-house re-training on clean commercial datasets.

### The Strongest Honest Solution: The Two-Mode Hybrid Architecture
- **Mode A ("Live Preview — Approximate Fit"):** 
  - Runs **100% client-side in the browser** at 30–60 fps.
  - Powered by **Google MediaPipe Tasks Vision (Pose Landmarker)** under the permissive **Apache 2.0 License**.
  - Dynamic 2D mesh/affine garment warping anchored to shoulder, hip, and elbow landmarks with exponential smoothing filters.
  - **Zero server compute cost, zero cloud latency, and 100% privacy** (no frames ever leave the customer's device).
  - Explicitly labeled in the UI as: *"Live preview (approximate fit)"*.
- **Mode B ("Realistic Try-On — AI-Generated Still"):**
  - Triggered on-demand when the customer presses "Generate realistic fit".
  - Captures a single still frame with explicit customer consent, transmitting it to a modular backend adapter (`TryOnProvider`).
  - Connects to a Hugging Face Space (or a watermarked `MockProvider` when running in demo/offline mode).
  - Explicitly labeled in the UI as: *"AI-generated image (not live)"* with a before/after comparison slider and download capability.

---

## 2. Diffusion-Based Virtual Try-On Models Comparison

All models and model cards were checked against their official repositories on **October 27, 2026**.

| Model Candidate | Primary Mechanism | Inputs | Output | Verbatim License & URL | Commercial Use Allowed? | Latency (GPU) | Min Hardware | Free Demo / API Availability |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **IDM-VTON** (Choi et al.) | Diffusion model with TryonNet & garment-to-person cross-attention | Person photo, Garment photo, category prompt | 1024x768 photorealistic still | **CC BY-NC-SA 4.0**<br>[yisol/IDM-VTON](https://github.com/yisol/IDM-VTON) | **NO** (Strictly Non-Commercial) | 15–35s (A100) | 16 GB+ VRAM | Public HF Space (`yisol/IDM-VTON`) with ZeroGPU queue |
| **CatVTON** (Chong et al.) | Concatenation-based lightweight diffusion (899M params) | Person photo, Garment photo, agnostic mask | 1024x768 photorealistic still | **CC BY-NC-SA 4.0**<br>[Zheng-Chong/CatVTON](https://github.com/Zheng-Chong/CatVTON) | **NO** (Strictly Non-Commercial) | 8–18s (RTX 3060/L4) | 8 GB VRAM | Public HF Space (`zhengchong/CatVTON`) |
| **StableVITON** (Kim et al.) | Spatial-corresponded feature transfer via Stable Diffusion | Person photo, DensePose/agnostic mask, Garment | 1024x768 still | **CC BY-NC-SA 4.0**<br>[solvi/StableVITON](https://github.com/solvi/StableVITON) | **NO** (Strictly Non-Commercial) | 20–40s (T4) | 16 GB+ VRAM | Unofficial HF Spaces (frequently sleeping) |
| **OOTDiffusion** (Xu et al.) | Outfitting Over Time diffusion with category-specific UNets | Target person photo, Garment, category selector | 1024x768 still | **CC BY-NC-SA 4.0**<br>[levihsu/OOTDiffusion](https://github.com/levihsu/OOTDiffusion) | **NO** (Strictly Non-Commercial) | 12–25s (A10G) | 16 GB+ VRAM | Public HF Space (`levihsu/OOTDiffusion`) |
| **MagicTryOn / Wan2.1 Video** | Diffusion Transformer (DiT) with spatiotemporal cross-attention | Short video clip + Garment photo | 3–5 sec video | **Research / Custom**<br>[vivoCameraResearch/Magic-TryOn](https://github.com/vivoCameraResearch/Magic-TryOn) | **NO / UNCLEAR** | 2–8 minutes per clip (A100) | 80 GB A100/H100 | None available for public programmatic free calls |

### Legal Note for VirtualFit AI
Because **commercial intent** is central to VirtualFit AI, using IDM-VTON, CatVTON, or OOTDiffusion in a commercial production deployment without commercial agreements with the respective authors constitutes a **license violation**. In this project:
1. The backend implements a strict **Adapter Pattern** (`TryOnProvider`).
2. The prototype supports `HuggingFaceSpaceProvider` marked explicitly in UI and logs as **"Non-Commercial Research Evaluation"**.
3. A fully compliant `MockProvider` is provided for offline development and testing, returning clearly watermarked images (`DEMO MODE — NOT AI`).
4. A commercial upgrade roadmap is documented in `docs/ROADMAP.md` (e.g., in-house LoRA training on permissive datasets, 3D body-mesh fitting, or commercial API partners).

---

## 3. Hosting & Inference Infrastructure Analysis

| Platform / Service | Free Tier Resource Allocations | Queue / Latency Realities | Commercial Use Allowed? | Programmatic API Access? | Verdict & Risk Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hugging Face Spaces (ZeroGPU)** | Shared Nvidia A100/L40S dynamically allocated for up to 60s bursts | Congested during peak hours; anonymous calls rate-limited within 2–5 requests. Sleeps after 48h idle. | Allowed by HF platform, **but restricted by model weights license** | Yes, via `gradio_client` with HF personal access token | **Selected for Mode B Prototype** (with exponential backoff and timeout handling). |
| **Google Colab Free Tier** | 1x T4 GPU, interactive notebook session (~1–4 hrs) | Runtimes drop unpredictably; connection reset during long tasks | **STRICTLY PROHIBITED** for web service hosting | Prohibited via TOS (FAQ explicitly bans web services/ngrok) | **REJECTED**: Severe risk of account suspension and runtime kill. |
| **Kaggle Notebooks** | 30 GPU hrs/week, 12h session limit | Non-interactive background jobs must write to disk; no inbound HTTP listening | Prohibited for persistent public serving | No public webhook/ingress | **REJECTED**: Cannot serve live HTTP/FastAPI requests. |
| **Render.com Free Tier** | 512 MB RAM, 0.1 vCPU, 100 GB egress/mo | Spins down after 15 min inactivity; **50+ second cold start** on wakeup | **YES** | Yes (FastAPI web service) | **Viable for Backend Prototype**, but 50s cold start requires a keep-alive or user warning. |
| **Hugging Face Spaces (Docker CPU)** | 2 vCPU, 16 GB RAM, 50 GB persistent disk | Free CPU space sleeps after 48 hrs idle | **YES** | Yes (FastAPI web service) | **Recommended Backend Alternative**: Generous 16 GB RAM allows hosting the catalog & proxy without memory thrashing. |
| **Cloudflare Pages** | Unlimited bandwidth, 500 builds/mo, 20,000 files | Global CDN (<50ms latency globally) | **YES** (Permitted; raw credit card handling must use external gateway) | Yes | **SELECTED for Frontend Hosting**: 100% compliant with commercial intent. |
| **Vercel Hobby Plan** | 100 GB bandwidth, serverless functions | Fast global edge | **STRICTLY FORBIDDEN FOR COMMERCIAL USE** (Section 2.1 Fair Use) | Yes | **REJECTED for Commercial Release**: Vercel Hobby terms explicitly ban any commercial/financial gain use. |

---

## 4. Real-Time In-Browser Pose & Garment Warping Analysis

To satisfy the primary user experience (standing in front of a mirror/screen and seeing garments move in real time), we evaluated client-side computer vision frameworks.

### Framework Evaluation
1. **Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)**
   - **License:** Apache License 2.0 (commercially usable, no royalties).
   - **Model:** Pose Landmarker (Lite, Full, Heavy variants; lite is ~5.6 MB).
   - **Performance:** 30–60 FPS on Apple Silicon M4 / Intel Core i5 via WebAssembly with SIMD and WebGL acceleration.
   - **Landmarks:** 33 full-body 3D landmarks (including shoulders [11, 12], elbows [13, 14], wrists [15, 16], hips [23, 24]).
   - **Privacy Verification:** Pose inference executes entirely in the client browser's memory. No video frames are transmitted over the network.
   - **Verdict:** **Selected as the core tracking engine for Mode A.**

2. **Garment Warping Strategy for Mode A (Canvas 2D / WebGL)**
   - **Input:** Transparent PNG cutout of garment (flat-lay or ghost-mannequin).
   - **Anchor Points:**
     - Left Shoulder (Landmark 11) & Right Shoulder (Landmark 12) establish garment position, scale, and 2D rotation.
     - Left Hip (23) & Right Hip (24) determine torso length and torso distortion.
     - Elbows (13, 14) and Wrists (15, 16) provide arm rotation cues for long-sleeve apparel.
   - **Jitter Mitigation:** Exponential Moving Average (EMA) or One-Euro filter applied to landmark coordinates to eliminate webcam noise jitter.
   - **Fallback & Confidence:** When landmark confidence drops below 0.65 (e.g., person steps out of frame or turns around), the overlay smoothly fades out rather than glitching.

---

## 5. Garment Background Removal (`rembg` vs. Cutouts)

- **Library:** `rembg` (Python, MIT License) with `u2net` weights (**Apache License 2.0**).
- **Feasibility:** `rembg` takes ~250–500ms on an Apple M4 CPU for a 1024x1024 garment photo.
- **Decision:** Because `rembg` and `u2net` are both permissively licensed (MIT and Apache 2.0), background removal is commercially legal. In the app, admins can either upload pre-cut transparent PNGs or use the built-in server-side background removal tool.

---

## 6. Decision Memo

### Selected Architecture
1. **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS, hosted on **Cloudflare Pages** (commercially compliant free tier).
2. **Client-Side Tracking:** Google MediaPipe Tasks Vision Pose Landmarker (Apache 2.0) with Canvas 2D/WebGL affine/mesh warping and exponential smoothing filter for **Mode A Live Preview**.
3. **Backend:** Python 3.11 with FastAPI, Pydantic, Pillow, and SQLite for catalog storage, hosted via Docker on **Hugging Face Spaces (CPU)** or **Render.com**.
4. **Mode B Inference:** Decoupled `TryOnProvider` adapter pattern:
   - Default fallback: `MockProvider` with explicit "DEMO MODE — NOT AI" watermarking.
   - Live AI provider: `HuggingFaceSpaceProvider` targeting `zhengchong/CatVTON` or `yisol/IDM-VTON` via `gradio_client`, clearly labeled "Non-Commercial Research Evaluation".
   - Stubs for future real-time neural streaming endpoints.
5. **Storage:** Local SQLite database + static files directory with safe MIME sniffing and image dimension checks.

### Accepted Trade-offs
- **Mode A is 2D planar/piecewise warping:** It cannot simulate 3D self-occlusion (e.g., folding arms behind back) or natural cloth wrinkles. It is an *approximate live preview* mirror.
- **Mode B is a still image, not video:** Customers get high-resolution photorealism, but it takes 10–25 seconds of inference time and is a single captured snapshot.
- **Free GPU queues are non-deterministic:** Peak traffic on public Hugging Face spaces will result in queue timeouts. The UI must handle timeouts gracefully and offer retries.
- **Commercial deployment requires proprietary licensing or clean model weights:** The prototype will honestly disclose all CC BY-NC-SA 4.0 licenses.
