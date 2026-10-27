/**
 * Coordinate mapping utilities for VirtualFit AI.
 * Maps MediaPipe normalized landmarks (0..1) to canvas pixel coordinates,
 * handling video aspect ratio scaling, mirroring, and boundary checks.
 */

export interface NormalizedPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

/**
 * Transforms a normalized MediaPipe landmark (0..1) to canvas pixel space.
 * 
 * @param landmark Normalized point (x: 0..1, y: 0..1)
 * @param dimensions Canvas width and height in pixels
 * @param mirrored If true, mirrors X axis (x -> 1 - x) to match horizontal mirror flip
 * @returns CanvasPoint in pixel coordinates
 */
export function landmarkToCanvas(
  landmark: NormalizedPoint,
  dimensions: CanvasDimensions,
  mirrored: boolean = true
): CanvasPoint {
  const { width, height } = dimensions;
  
  // Safe clamp to avoid extreme off-canvas coordinates
  const rawX = landmark.x;
  const rawY = landmark.y;

  const targetX = mirrored ? (1 - rawX) * width : rawX * width;
  const targetY = rawY * height;

  return {
    x: Math.round(targetX * 10) / 10,
    y: Math.round(targetY * 10) / 10,
  };
}

/**
 * Calculates stage container dimensions that preserve video aspect ratio
 * and fill the available viewport area with symmetrical, centered letterboxing.
 */
export function calculateStageDimensions(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number
): { width: number; height: number; scale: number } {
  if (!containerWidth || !containerHeight || !videoWidth || !videoHeight) {
    return { width: containerWidth || 640, height: containerHeight || 480, scale: 1 };
  }

  const containerAspect = containerWidth / containerHeight;
  const videoAspect = videoWidth / videoHeight;

  let width: number;
  let height: number;

  if (containerAspect > videoAspect) {
    // Stage is wider than video: fit to height, center horizontally
    height = containerHeight;
    width = containerHeight * videoAspect;
  } else {
    // Stage is taller than video: fit to width, center vertically
    width = containerWidth;
    height = containerWidth / videoAspect;
  }

  const scale = width / videoWidth;

  return {
    width: Math.floor(width),
    height: Math.floor(height),
    scale,
  };
}

/**
 * Evaluates whether shoulders and upper torso are sufficiently in-frame
 * and visible to compute a stable garment fit.
 */
export interface FramingAssessment {
  isValid: boolean;
  message: string | null;
  status: 'optimal' | 'step_back' | 'too_far' | 'no_person';
  confidence: number;
}

export function assessFraming(
  landmarks: NormalizedPoint[] | null,
  minVisibility: number = 0.5
): FramingAssessment {
  if (!landmarks || landmarks.length < 25) {
    return {
      isValid: false,
      message: 'No person detected. Please step in front of the camera.',
      status: 'no_person',
      confidence: 0,
    };
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const leftVis = leftShoulder.visibility ?? 1;
  const rightVis = rightShoulder.visibility ?? 1;
  const avgVis = (leftVis + rightVis) / 2;

  if (avgVis < minVisibility) {
    return {
      isValid: false,
      message: 'Low visibility. Please step back so your shoulders are clearly visible.',
      status: 'step_back',
      confidence: avgVis,
    };
  }

  // Check if shoulders are cut off by the frame edges (too close or cropped)
  const margin = 0.04; // 4% edge threshold
  const isOutOfHorizontalFrame =
    leftShoulder.x < margin ||
    leftShoulder.x > 1 - margin ||
    rightShoulder.x < margin ||
    rightShoulder.x > 1 - margin;

  const isTooCloseToTop =
    leftShoulder.y < margin || rightShoulder.y < margin;

  if (isOutOfHorizontalFrame || isTooCloseToTop) {
    return {
      isValid: false,
      message: 'You are too close. Step back so your entire shoulders and torso are in frame.',
      status: 'step_back',
      confidence: avgVis,
    };
  }

  // Check shoulder width ratio (if shoulders occupy > 65% of frame width, person is way too close)
  const shoulderWidthNorm = Math.abs(rightShoulder.x - leftShoulder.x);
  if (shoulderWidthNorm > 0.65) {
    return {
      isValid: false,
      message: 'Step back to allow full upper-body apparel fitting.',
      status: 'step_back',
      confidence: avgVis,
    };
  }

  // If shoulders occupy < 8% of frame, person is too far away
  if (shoulderWidthNorm < 0.08) {
    return {
      isValid: false,
      message: 'You are too far. Step slightly closer to the mirror.',
      status: 'too_far',
      confidence: avgVis,
    };
  }

  return {
    isValid: true,
    message: null,
    status: 'optimal',
    confidence: avgVis,
  };
}
