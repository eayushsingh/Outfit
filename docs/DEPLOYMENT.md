# VirtualFit AI — Free-Tier Deployment & Production Setup Guide

**Document Status:** Complete (Deployment Steps: `DONE-UNVERIFIED` — Awaiting Cloud Credentials)  
**Budget:** Rs 0  
**Target Platforms:** Cloudflare Pages (Frontend) + Hugging Face Spaces / Render.com (Backend)  

---

> [!IMPORTANT]
> **HTTPS Obligation for Webcams:** Modern browsers (Chrome, Safari, Firefox, Edge) **strictly prohibit** access to the camera via `navigator.mediaDevices.getUserMedia` over unencrypted HTTP (except on `localhost` or `127.0.0.1`). Any public deployment must be served over valid HTTPS. Both Cloudflare Pages and Render/Hugging Face Spaces provide free automatic SSL certificates.

---

## 1. Frontend Deployment: Cloudflare Pages (Recommended)

### Why Cloudflare Pages?
- **Commercial Use Allowed:** Unlike Vercel's Hobby tier (which strictly forbids any commercial activity), Cloudflare Pages allows commercial applications on its Free plan.
- **Limits:** Unlimited bandwidth, 500 builds/month, global low-latency CDN.

### Step-by-Step Deployment:
1. Push your repository to GitHub or GitLab.
2. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** -> **Create application** -> **Pages**.
3. Connect your repository and configure the build settings:
   - **Project Name:** `virtualfit-mirror`
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Build Output Directory:** `dist`
4. Set Environment Variables in Cloudflare Pages:
   - `VITE_API_BASE_URL`: `https://your-backend-service.onrender.com` (or your Hugging Face Space URL)
5. Deploy. Cloudflare will assign a live URL like `https://virtualfit-mirror.pages.dev` with free SSL.

---

## 2. Backend Deployment Option A: Hugging Face Spaces (Docker CPU)

### Why HF Spaces (Docker)?
- **Generous Free Resources:** 2 vCPU, 16 GB RAM, 50 GB persistent storage volume.
- **Sleep Behavior:** Free Spaces sleep after 48 hours of inactivity and wake up upon inbound HTTP request.

### Step-by-Step Deployment:
1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Choose **Docker** as the Space SDK and select **Blank**.
3. Create a `Dockerfile` at the root of your backend:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=7860
EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
```
4. Set Environment Variables in Space Settings:
   - `ENVIRONMENT`: `production`
   - `ADMIN_API_KEY`: Strong random secret token
   - `CORS_ORIGINS`: `https://virtualfit-mirror.pages.dev`
   - `DEMO_MODE`: `true` (or `false` with `TRYON_PROVIDER=hf_space` and `HF_API_TOKEN`)

---

## 3. Backend Deployment Option B: Render.com Free Web Service

### Specifications & Caveats:
- **Free Tier:** 512 MB RAM, 0.1 CPU, 100 GB egress/month.
- **Cold-Start Warning:** Free instances spin down after 15 minutes of inactivity. The first request after sleep will take **50–60 seconds** to wake up.
- **Ephemeral Filesystem:** Any files uploaded to `data/uploads` on Render Free will be erased whenever the instance spins down or redeploys. For permanent catalog assets in production, use Cloudflare R2 (10 GB free object storage).

### Render Deployment Steps:
1. Log in to [Render](https://dashboard.render.com/) and click **New Web Service**.
2. Connect your Git repository.
3. Configure settings:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   - `ADMIN_API_KEY`: Strong random secret
   - `CORS_ORIGINS`: `https://virtualfit-mirror.pages.dev`
   - `DEMO_MODE`: `true`

---

## 4. Local Development Deployment (macOS Apple Silicon)

To run the entire system locally without any cloud hosting:

### Prerequisites:
- macOS with Apple Silicon (M1/M2/M3/M4)
- Python 3.11+
- Node.js v20+ and npm

### Terminal 1: Backend
```bash
cd /Users/ayush/Desktop/outfit/backend
/opt/homebrew/bin/python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2: Frontend
```bash
cd /Users/ayush/Desktop/outfit/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Open `http://localhost:5173/` in Google Chrome or Safari.
