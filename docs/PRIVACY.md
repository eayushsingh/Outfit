# VirtualFit AI — Customer Privacy & Data Protection Architecture

**Document Version:** 1.0.0  
**Effective Date:** October 27, 2026  
**Compliance Context:** Digital Personal Data Protection (DPDP) Act, 2023 (India) & Global Privacy Frameworks  

---

> [!IMPORTANT]
> **Legal Disclaimer:** This document reflects the technical privacy architecture of the VirtualFit AI software prototype. It does not constitute formal legal counsel. Prior to commercial deployment in physical retail stores or e-commerce environments, formal review by qualified legal counsel specialized in jurisdictional privacy law (including India's DPDP Act, EU GDPR, or US state laws) is required.

---

## 1. Privacy-By-Design Core Principles

VirtualFit AI was designed from the ground up under a strict **Zero-Surveillance, Zero-Retention** philosophy:
1. **Explicit Prior Consent:** The camera is never automatically activated upon loading the page. The customer must explicitly click "Start Trial Room Camera" and review the clear disclosure modal before any sensor access occurs.
2. **On-Device First (Mode A):** Real-time posture tracking, joint detection, and garment overlay occur **100% locally in the browser memory** using WebAssembly and WebGL. No video frames, coordinates, or biometric templates leave the customer's device.
3. **Transparent Cloud Delegation (Mode B):** When a user requests a high-fidelity diffusion fit, a single still frame is captured with explicit notice naming the inference provider.
4. **Immediate Ephemeral Cleanup:** The backend does not persist customer photographs to disk, database, or cloud object storage. Temporary files created for API transmission are wiped immediately after inference.
5. **Zero Ad Trackers or Third-Party Analytics:** The application contains zero tracking cookies, marketing pixels, fingerprinting scripts, or third-party telemetry.

---

## 2. Technical Architecture Comparison: Mode A vs. Mode B

| Privacy Dimension | Mode A: Live Preview Mirror | Mode B: Realistic Try-On |
| :--- | :--- | :--- |
| **Data Captured** | Live webcam video stream (30–60 FPS) | Single still image snapshot (JPEG) |
| **Processing Location** | **100% Client-Side** (In-Browser Wasm/WebGL) | FastAPI Backend -> Inference Adapter |
| **Network Transmission** | **0 bytes.** Verified: No network requests emitted during live feed. | 1 HTTPS POST request containing single frame |
| **Biometric Retention** | None. Landmarks exist only in transient JavaScript variables. | None. Frame processed in memory/temp file and wiped. |
| **Server Logs** | None. Backend has no visibility into live mirror sessions. | Timestamp and latency only; **zero customer image bytes logged**. |
| **Third-Party AI Service** | None. Local Google MediaPipe Tasks Vision model. | Hugging Face ZeroGPU (Research Space) or local Mock. |

---

## 3. Compliance Alignment with India's DPDP Act, 2023

Under India's Digital Personal Data Protection Act, 2023, webcam feeds containing recognizable facial or body imagery constitute digital personal data. VirtualFit AI adheres to key statutory duties:

1. **Notice & Consent (Section 5 & 6):**
   - The application presents an unskippable consent modal before camera activation describing the exact processing scope.
   - Separate consent is required before transmitting a still image to cloud AI inference.
2. **Purpose Limitation (Section 7):**
   - Captured frames are used solely for the immediate rendering of the selected apparel on the user's posture. No secondary profiling or training without explicit consent.
3. **Data Minimization & Erasure (Section 8(7)):**
   - Mode A performs zero data storage.
   - Mode B operates under strict zero-retention: temporary files are unlinked in Python `finally` blocks immediately upon completion.
4. **Security Safeguards (Section 8(5)):**
   - All backend API interactions enforce HTTPS encryption in transit.
   - Admin routes are protected with constant-time cryptographic token verification (`secrets.compare_digest`).

---

## 4. Verification Protocol

The privacy claims of VirtualFit AI were empirically validated during build-time testing:
- **Network Tab Audit:** A full browser session running Mode A was monitored via Chromium network inspection. Zero frame upload requests (`/api/tryon/generate`) occurred during active camera tracking.
- **Backend File System Audit:** Inspected `backend/data/temp/` following repeated Mode B inference requests. Confirmed zero residual customer images remain on disk.
- **Log Inspection:** Structured application logs verify that request bodies containing base64/binary image payloads are never printed to terminal or disk logs.
