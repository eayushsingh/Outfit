# VirtualFit AI — Engineering Limitations & Technical Boundaries

**Document Status:** Approved & Transparent  
**Last Updated:** October 27, 2026  

---

## 1. Computer Vision & Garment Warping Limitations (Mode A)

1. **Planar 2D Approximation vs. 3D Body Surface:**
   - Mode A uses affine and perspective transforms anchored to 2D skeletal landmarks (shoulders, elbows, hips). It does not compute a full 3D parametric human body mesh (such as SMPL-X).
   - As a result, the garment appears flat when viewed from extreme oblique angles (> 45 degrees).
2. **Self-Occlusion Failure Cases:**
   - When a customer folds their arms across their chest, puts their hands in their pockets, or turns their back to the camera, the 2D garment layer draws over the forearms. True 3D depth-aware occlusion requires dense semantic person segmentation masks running in real time.
3. **Absence of Cloth Physics:**
   - The 2D overlay does not simulate cloth stiffness, fabric drape, stretch, or kinetic wrinkling during movement.
4. **Lighting & Contrast Sensitivity:**
   - MediaPipe Pose Landmarker relies on visual contrast. In dark retail environments or with customers wearing deep black clothing against a dark background, landmark confidence can degrade, causing the overlay to fade out.

---

## 2. Generative Diffusion Try-On Limitations (Mode B)

1. **Still Image Only (Not Video):**
   - Mode B produces a single high-resolution still snapshot. It is **not** a continuous video stream. Claims of "real-time video try-on" for diffusion models are technically false on current zero-cost architectures.
2. **Inference Latency & Cold Starts:**
   - Generating a photorealistic still via diffusion takes **8 to 35 seconds** on modern GPUs.
   - On free shared platforms (like Hugging Face ZeroGPU), peak traffic results in queue wait times of up to 60 seconds or sporadic rate limit rejections.
3. **Hallucination & Edge Artifacts:**
   - Diffusion inpainting models occasionally alter hair strands, neck jewelry, or background patterns immediately adjacent to the garment boundary.
4. **Tuck-in vs. Untucked Ambiguity:**
   - Unless specifically prompted or masked, diffusion models cannot reliably deduce whether a shirt should be tucked into trousers or worn untucked.

---

## 3. Licensing & Commercial Boundaries

1. **Non-Commercial Model Checkpoints:**
   - State-of-the-art open models (IDM-VTON, CatVTON, StableVITON, OOTDiffusion) are distributed under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0)**.
   - Running these weights directly to generate revenue in a commercial store violates copyright. Commercial deployment requires proprietary licensing from original authors or in-house training on permissive datasets (e.g., DeepFashion-Commercial).
2. **Vercel Hobby Restrictions:**
   - Deploying on Vercel's free Hobby plan for commercial operations violates Vercel's Fair Use terms. Cloudflare Pages is used instead.

---

## 4. Hardware & Environmental Dependencies

1. **Webcam Quality:**
   - Low-cost 720p webcams with heavy rolling-shutter or sensor noise induce landmark jitter. While VirtualFit AI implements an Exponential Moving Average (EMA) smoothing filter, high-framerate 1080p webcams yield significantly better tracking.
2. **Browser Sandbox Constraints:**
   - Client-side WebAssembly models cannot exceed the browser's 4 GB memory ceiling.
