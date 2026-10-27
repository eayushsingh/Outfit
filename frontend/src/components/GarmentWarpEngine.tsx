import React, { useEffect, useRef } from 'react';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { Garment } from '../types';

interface GarmentWarpEngineProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: NormalizedLandmark[] | null;
  selectedGarment: Garment | null;
  isActive: boolean;
  showSkeletonDebug?: boolean;
}

interface SmoothedPose {
  cx: number;
  cy: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
}

export const GarmentWarpEngine: React.FC<GarmentWarpEngineProps> = ({
  videoRef,
  landmarks,
  selectedGarment,
  isActive,
  showSkeletonDebug = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const garmentImgRef = useRef<HTMLImageElement | null>(null);
  
  // Exponential filter state
  const poseState = useRef<SmoothedPose>({
    cx: 0,
    cy: 0,
    width: 0,
    height: 0,
    angle: 0,
    opacity: 0,
  });

  // Preload garment cutout image whenever selected garment changes
  useEffect(() => {
    if (!selectedGarment) {
      garmentImgRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    // Use cutout_url if available, else image_url
    img.src = selectedGarment.cutout_url || selectedGarment.image_url;
    img.onload = () => {
      garmentImgRef.current = img;
    };
  }, [selectedGarment]);

  // Main render loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Sync canvas dimensions with video
      if (video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isActive) {
        animId = requestAnimationFrame(render);
        return;
      }

      const vw = canvas.width;
      const vh = canvas.height;

      // Check landmark validity (Shoulders 11, 12 and Hips 23, 24)
      let targetPose: SmoothedPose | null = null;

      if (landmarks && landmarks.length >= 25) {
        const ls = landmarks[11]; // Left shoulder
        const rs = landmarks[12]; // Right shoulder
        const lh = landmarks[23]; // Left hip
        const rh = landmarks[24]; // Right hip

        const shoulderConfidence = ((ls.visibility || 0) + (rs.visibility || 0)) / 2;

        if (shoulderConfidence > 0.5) {
          // Convert normalized coordinates (0..1) to canvas pixels
          const lsX = ls.x * vw;
          const lsY = ls.y * vh;
          const rsX = rs.x * vw;
          const rsY = rs.y * vh;

          const lhX = lh.x * vw;
          const lhY = lh.y * vh;
          const rhX = rh.x * vw;
          const rhY = rh.y * vh;

          // Midpoints
          const shoulderMidX = (lsX + rsX) / 2;
          const shoulderMidY = (lsY + rsY) / 2;

          const hipMidX = (lhX + rhX) / 2;
          const hipMidY = (lhY + rhY) / 2;

          // Shoulder distance & Torso distance
          const dx = rsX - lsX;
          const dy = rsY - lsY;
          const shoulderDist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx); // Inclination angle

          const torsoDist = Math.sqrt(
            Math.pow(hipMidX - shoulderMidX, 2) + Math.pow(hipMidY - shoulderMidY, 2)
          );

          // Garment scaling hints
          const hints = selectedGarment?.anchor_hints || {};
          const shoulderScale = (hints.shoulder_scale as number) || 1.85;
          const torsoOffsetY = (hints.torso_offset_y as number) || 0.15;

          const width = shoulderDist * shoulderScale;
          const height = Math.max(torsoDist * 1.6, width * 1.25);

          // Center garment slightly below shoulder line
          const cx = shoulderMidX;
          const cy = shoulderMidY + torsoDist * torsoOffsetY + height * 0.22;

          targetPose = { cx, cy, width, height, angle, opacity: 1 };
        }
      }

      // Smooth state with Exponential Moving Average (EMA)
      const prev = poseState.current;
      const alpha = 0.35; // Smoothing factor (higher = more responsive, lower = smoother)

      if (targetPose) {
        prev.cx += (targetPose.cx - prev.cx) * alpha;
        prev.cy += (targetPose.cy - prev.cy) * alpha;
        prev.width += (targetPose.width - prev.width) * alpha;
        prev.height += (targetPose.height - prev.height) * alpha;
        // Smooth angle accounting for circular continuity
        let dAngle = targetPose.angle - prev.angle;
        while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
        while (dAngle < -Math.PI) dAngle += 2 * Math.PI;
        prev.angle += dAngle * alpha;
        prev.opacity += (1 - prev.opacity) * 0.15; // Smooth fade in
      } else {
        // Fade out gracefully when landmarks lose tracking
        prev.opacity += (0 - prev.opacity) * 0.2;
      }

      // Draw Garment Overlay
      const garmentImg = garmentImgRef.current;
      if (garmentImg && prev.opacity > 0.02) {
        ctx.save();
        ctx.globalAlpha = Math.min(Math.max(prev.opacity, 0), 0.96);

        // Apply affine translation and rotation
        ctx.translate(prev.cx, prev.cy);
        ctx.rotate(prev.angle);

        // Draw image centered at origin
        const drawX = -prev.width / 2;
        const drawY = -prev.height / 2;

        ctx.drawImage(garmentImg, drawX, drawY, prev.width, prev.height);
        ctx.restore();
      }

      // Optional Debug: Render tracking skeleton landmarks
      if (showSkeletonDebug && landmarks) {
        ctx.save();
        ctx.fillStyle = '#06b6d4';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;

        const keyIndices = [11, 12, 13, 14, 15, 16, 23, 24]; // Upper body joints
        keyIndices.forEach((idx) => {
          const pt = landmarks[idx];
          if (pt && (pt.visibility || 0) > 0.4) {
            ctx.beginPath();
            ctx.arc(pt.x * vw, pt.y * vh, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isActive, landmarks, selectedGarment, showSkeletonDebug, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      aria-label="Live garment overlay preview"
    />
  );
};
