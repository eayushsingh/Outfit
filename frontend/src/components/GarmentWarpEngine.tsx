import React, { useEffect, useRef, useState } from 'react';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { Garment } from '../types';
import {
  landmarkToCanvas,
  assessFraming,
  FramingAssessment,
  CanvasDimensions,
} from '../utils/coordinates';

interface GarmentWarpEngineProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: NormalizedLandmark[] | null;
  selectedGarment: Garment | null;
  isActive: boolean;
  showSkeletonDebug?: boolean;
  onFramingChange?: (assessment: FramingAssessment) => void;
  onFpsUpdate?: (fps: number) => void;
}

interface SmoothedPose {
  cx: number;
  cy: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
}

// MediaPipe upper body skeleton connections: [startIdx, endIdx, color]
const SKELETON_CONNECTIONS: [number, number, string][] = [
  // Shoulders & Torso
  [11, 12, '#38bdf8'], // Left shoulder to Right shoulder
  [11, 23, '#06b6d4'], // Left shoulder to Left hip
  [12, 24, '#06b6d4'], // Right shoulder to Right hip
  [23, 24, '#38bdf8'], // Left hip to Right hip
  // Left Arm
  [11, 13, '#a855f7'], // Left shoulder to Left elbow
  [13, 15, '#c084fc'], // Left elbow to Left wrist
  // Right Arm
  [12, 14, '#a855f7'], // Right shoulder to Right elbow
  [14, 16, '#c084fc'], // Right elbow to Right wrist
];

export const GarmentWarpEngine: React.FC<GarmentWarpEngineProps> = ({
  videoRef,
  landmarks,
  selectedGarment,
  isActive,
  showSkeletonDebug = false,
  onFramingChange,
  onFpsUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const garmentImgRef = useRef<HTMLImageElement | null>(null);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);

  // EMA filter state
  const poseState = useRef<SmoothedPose>({
    cx: 0,
    cy: 0,
    width: 0,
    height: 0,
    angle: 0,
    opacity: 0,
  });

  // FPS tracking
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const currentFpsRef = useRef<number>(0);

  // Preload and verify transparent PNG garment image
  useEffect(() => {
    setImageLoadError(null);
    if (!selectedGarment) {
      garmentImgRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const sourceUrl = selectedGarment.cutout_url || selectedGarment.image_url;
    img.src = sourceUrl;

    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        garmentImgRef.current = img;
        setImageLoadError(null);
      } else {
        garmentImgRef.current = null;
        setImageLoadError('Garment image has invalid dimensions.');
      }
    };

    img.onerror = () => {
      // Fallback attempt to client-side public assets if backend relative URL failed
      const filename = sourceUrl.split('/').pop();
      if (filename && !sourceUrl.startsWith('/garments/')) {
        img.src = `/garments/${filename}`;
        return;
      }
      garmentImgRef.current = null;
      setImageLoadError('Failed to load apparel cutout asset.');
    };
  }, [selectedGarment]);

  // Main Render Loop
  useEffect(() => {
    let animId: number;

    const render = (now: number) => {
      // FPS measurement
      frameCountRef.current++;
      if (now - lastFpsTimeRef.current >= 1000) {
        currentFpsRef.current = Math.round(
          (frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)
        );
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
        if (onFpsUpdate) onFpsUpdate(currentFpsRef.current);
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video || video.readyState < 2) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Keep canvas resolution synced to video intrinsic resolution
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isActive) {
        animId = requestAnimationFrame(render);
        return;
      }

      const dims: CanvasDimensions = { width: vw, height: vh };

      // Evaluate framing & shoulder visibility
      const framing = assessFraming(landmarks, 0.5);
      if (onFramingChange) onFramingChange(framing);

      let targetPose: SmoothedPose | null = null;

      if (framing.isValid && landmarks && landmarks.length >= 25) {
        // Map landmarks with mirror X-flip (true) so they align with CSS-mirrored video
        const pLS = landmarkToCanvas(landmarks[11], dims, true); // Raw left shoulder -> mirrored screen right
        const pRS = landmarkToCanvas(landmarks[12], dims, true); // Raw right shoulder -> mirrored screen left
        const pLH = landmarkToCanvas(landmarks[23], dims, true); // Left hip
        const pRH = landmarkToCanvas(landmarks[24], dims, true); // Right hip

        // Midpoints
        const shoulderMidX = (pLS.x + pRS.x) / 2;
        const shoulderMidY = (pLS.y + pRS.y) / 2;
        const hipMidX = (pLH.x + pRH.x) / 2;
        const hipMidY = (pLH.y + pRH.y) / 2;

        // Shoulder span and inclination angle
        // In mirrored canvas: pRS is on screen-left, pLS on screen-right
        const dx = pLS.x - pRS.x;
        const dy = pLS.y - pRS.y;
        const shoulderDist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const torsoDist = Math.sqrt(
          Math.pow(hipMidX - shoulderMidX, 2) + Math.pow(hipMidY - shoulderMidY, 2)
        );

        // Garment sizing calibration:
        // In our 800x1000 PNG cutouts, shoulder span occupies ~54% of image width (430 / 800)
        // Collar dip is ~16% from the top
        const hints = selectedGarment?.anchor_hints || {};
        const shoulderScale = (hints.shoulder_scale as number) || 1.05;
        const torsoOffsetY = (hints.torso_offset_y as number) || 0.05;

        // Calibrate target width so the garment's shoulder seam matches shoulderDist
        const naturalShoulderRatio = 0.54;
        const targetWidth = (shoulderDist / naturalShoulderRatio) * shoulderScale;
        const targetHeight = targetWidth * 1.25; // 800x1000 aspect ratio = 1.25

        // Center garment: collar sits at shoulderMid, so center is below by (0.5 - 0.16) * height
        const collarOffsetFromCenter = (0.5 - 0.16) * targetHeight;
        const cx = shoulderMidX;
        const cy = shoulderMidY + collarOffsetFromCenter + torsoDist * torsoOffsetY;

        targetPose = {
          cx,
          cy,
          width: targetWidth,
          height: targetHeight,
          angle,
          opacity: 1,
        };
      }

      // Smooth motion with Exponential Moving Average (EMA)
      const prev = poseState.current;
      const alpha = 0.35; // Smoothing factor (responsive yet stable)

      if (targetPose) {
        prev.cx += (targetPose.cx - prev.cx) * alpha;
        prev.cy += (targetPose.cy - prev.cy) * alpha;
        prev.width += (targetPose.width - prev.width) * alpha;
        prev.height += (targetPose.height - prev.height) * alpha;

        // Circular angle smoothing
        let dAngle = targetPose.angle - prev.angle;
        while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
        while (dAngle < -Math.PI) dAngle += 2 * Math.PI;
        prev.angle += dAngle * alpha;

        prev.opacity += (1 - prev.opacity) * 0.2;
      } else {
        // Smoothly fade out when out of frame or low confidence
        prev.opacity += (0 - prev.opacity) * 0.25;
      }

      // Render Garment (Only if image is verified loaded and opacity is visible)
      const garmentImg = garmentImgRef.current;
      if (
        garmentImg &&
        garmentImg.complete &&
        garmentImg.naturalWidth > 0 &&
        prev.opacity > 0.02
      ) {
        ctx.save();
        ctx.globalAlpha = Math.min(Math.max(prev.opacity, 0), 0.98);

        // Affine positioning & rotation
        ctx.translate(prev.cx, prev.cy);
        ctx.rotate(prev.angle);

        // Draw garment centered at (0, 0)
        ctx.drawImage(
          garmentImg,
          -prev.width / 2,
          -prev.height / 2,
          prev.width,
          prev.height
        );

        ctx.restore();
      }

      // Render Debug Skeleton & Connections (if enabled)
      if (showSkeletonDebug && landmarks && landmarks.length >= 25) {
        ctx.save();

        // 1. Draw Skeleton Bones
        for (const [startIdx, endIdx, color] of SKELETON_CONNECTIONS) {
          const ptA = landmarks[startIdx];
          const ptB = landmarks[endIdx];

          if (
            ptA &&
            ptB &&
            (ptA.visibility ?? 1) > 0.35 &&
            (ptB.visibility ?? 1) > 0.35
          ) {
            const cA = landmarkToCanvas(ptA, dims, true);
            const cB = landmarkToCanvas(ptB, dims, true);

            ctx.beginPath();
            ctx.moveTo(cA.x, cA.y);
            ctx.lineTo(cB.x, cB.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.stroke();
          }
        }

        // 2. Draw Keypoint Joints
        const activeJoints = [11, 12, 13, 14, 15, 16, 23, 24];
        for (const idx of activeJoints) {
          const pt = landmarks[idx];
          if (pt && (pt.visibility ?? 1) > 0.35) {
            const cp = landmarkToCanvas(pt, dims, true);

            // Outer glow
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#06b6d4';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.fill();

            // Inner white dot
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 2.5, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          }
        }

        // 3. Render In-Canvas FPS & Tracking Overlay
        ctx.shadowBlur = 0;
        ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(16, 16, 170, 36);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`FPS: ${currentFpsRef.current} | Landm: 33`, 26, 40);

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    isActive,
    landmarks,
    selectedGarment,
    showSkeletonDebug,
    videoRef,
    onFramingChange,
    onFpsUpdate,
  ]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
        }}
        aria-label="Mode A Garment Overlay"
      />
      {imageLoadError && (
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 30,
          }}
        >
          {imageLoadError}
        </div>
      )}
    </>
  );
};
