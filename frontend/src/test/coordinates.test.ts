import { describe, it, expect } from 'vitest';
import {
  landmarkToCanvas,
  calculateStageDimensions,
  assessFraming,
  NormalizedPoint,
} from '../utils/coordinates';

describe('landmarkToCanvas Coordinate Transformation', () => {
  const dimensions1280x720 = { width: 1280, height: 720 };
  const dimensions1920x1080 = { width: 1920, height: 1080 };
  const dimensions640x480 = { width: 640, height: 480 };

  it('transforms non-mirrored coordinates correctly', () => {
    const point: NormalizedPoint = { x: 0.25, y: 0.5 };
    const result = landmarkToCanvas(point, dimensions1280x720, false);
    expect(result.x).toBe(320);
    expect(result.y).toBe(360);
  });

  it('transforms mirrored coordinates correctly (x -> 1 - x)', () => {
    // When person is on raw-left (x=0.2), in mirrored preview they appear on right (x=0.8)
    const point: NormalizedPoint = { x: 0.2, y: 0.5 };
    const result = landmarkToCanvas(point, dimensions1280x720, true);
    expect(result.x).toBe(1024); // (1 - 0.2) * 1280 = 1024
    expect(result.y).toBe(360);
  });

  it('handles center point identically in mirrored and non-mirrored modes', () => {
    const centerPoint: NormalizedPoint = { x: 0.5, y: 0.5 };
    const nonMirrored = landmarkToCanvas(centerPoint, dimensions1920x1080, false);
    const mirrored = landmarkToCanvas(centerPoint, dimensions1920x1080, true);
    expect(nonMirrored.x).toBe(960);
    expect(mirrored.x).toBe(960);
    expect(nonMirrored.y).toBe(540);
    expect(mirrored.y).toBe(540);
  });

  it('handles boundary extremes (0,0 and 1,1)', () => {
    const topLeft: NormalizedPoint = { x: 0.0, y: 0.0 };
    const bottomRight: NormalizedPoint = { x: 1.0, y: 1.0 };

    // Non-mirrored
    expect(landmarkToCanvas(topLeft, dimensions640x480, false)).toEqual({ x: 0, y: 0 });
    expect(landmarkToCanvas(bottomRight, dimensions640x480, false)).toEqual({ x: 640, y: 480 });

    // Mirrored
    expect(landmarkToCanvas(topLeft, dimensions640x480, true)).toEqual({ x: 640, y: 0 });
    expect(landmarkToCanvas(bottomRight, dimensions640x480, true)).toEqual({ x: 0, y: 480 });
  });

  it('scales accurately across arbitrary resolutions', () => {
    const pt: NormalizedPoint = { x: 0.33, y: 0.66 };
    const res = landmarkToCanvas(pt, { width: 1000, height: 500 }, false);
    expect(res.x).toBe(330);
    expect(res.y).toBe(330);
  });
});

describe('calculateStageDimensions', () => {
  it('centers letterbox horizontally when viewport is wider than video (16:9 on 21:9 screen)', () => {
    const viewport = { width: 2100, height: 900 };
    const video = { width: 1920, height: 1080 }; // 16:9 aspect = 1.777...
    const result = calculateStageDimensions(viewport.width, viewport.height, video.width, video.height);

    expect(result.height).toBe(900);
    expect(result.width).toBe(1600); // 900 * (16/9)
  });

  it('centers letterbox vertically when viewport is taller than video (phone/tablet portrait)', () => {
    const viewport = { width: 800, height: 1200 };
    const video = { width: 1280, height: 720 }; // 16:9
    const result = calculateStageDimensions(viewport.width, viewport.height, video.width, video.height);

    expect(result.width).toBe(800);
    expect(result.height).toBe(450); // 800 / (16/9) = 450
  });
});

describe('assessFraming', () => {
  it('returns no_person when landmarks are null or empty', () => {
    expect(assessFraming(null).status).toBe('no_person');
    expect(assessFraming([]).status).toBe('no_person');
  });

  it('returns step_back when shoulders are cropped at the edge of the screen', () => {
    const croppedLandmarks: NormalizedPoint[] = Array(33).fill({ x: 0.5, y: 0.5, visibility: 0.9 });
    croppedLandmarks[11] = { x: 0.02, y: 0.3, visibility: 0.9 }; // Left shoulder cut off by left edge (< 0.04)
    croppedLandmarks[12] = { x: 0.45, y: 0.3, visibility: 0.9 };

    const assessment = assessFraming(croppedLandmarks);
    expect(assessment.isValid).toBe(false);
    expect(assessment.status).toBe('step_back');
    expect(assessment.message).toContain('too close');
  });

  it('returns optimal when person is well framed', () => {
    const optimalLandmarks: NormalizedPoint[] = Array(33).fill({ x: 0.5, y: 0.5, visibility: 0.95 });
    optimalLandmarks[11] = { x: 0.35, y: 0.25, visibility: 0.95 };
    optimalLandmarks[12] = { x: 0.65, y: 0.25, visibility: 0.95 };

    const assessment = assessFraming(optimalLandmarks);
    expect(assessment.isValid).toBe(true);
    expect(assessment.status).toBe('optimal');
    expect(assessment.message).toBeNull();
  });
});
