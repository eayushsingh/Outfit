import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface UsePoseLandmarkerResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  detectPose: (video: HTMLVideoElement, timestamp: number) => NormalizedLandmark[] | null;
}

export function usePoseLandmarker(): UsePoseLandmarkerResult {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  useEffect(() => {
    let isCancelled = false;

    async function initLandmarker() {
      setIsLoading(true);
      setError(null);

      try {
        // Resolve wasm files locally from /wasm or fall back to jsdelivr CDN
        let vision;
        try {
          vision = await FilesetResolver.forVisionTasks('/wasm');
        } catch (localErr) {
          console.warn('Local wasm load failed, attempting CDN fallback:', localErr);
          vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          );
        }

        if (isCancelled) return;

        // Load Pose Landmarker Lite model
        let landmarker: PoseLandmarker;
        try {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuErr) {
          console.warn('GPU delegate failed, falling back to CPU delegate:', gpuErr);
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/models/pose_landmarker_lite.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        if (isCancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setIsLoaded(true);
      } catch (err: unknown) {
        console.error('Failed to initialize MediaPipe Pose Landmarker:', err);
        const e = err as { message?: string };
        if (!isCancelled) {
          setError(e.message || 'Failed to initialize pose landmarker model.');
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    initLandmarker();

    return () => {
      isCancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  const detectPose = useCallback(
    (video: HTMLVideoElement, timestamp: number): NormalizedLandmark[] | null => {
      if (!landmarkerRef.current || !video || video.readyState < 2) {
        return null;
      }

      // MediaPipe requires increasing timestamps
      if (video.currentTime === lastVideoTimeRef.current) {
        return null;
      }
      lastVideoTimeRef.current = video.currentTime;

      try {
        const result = landmarkerRef.current.detectForVideo(video, timestamp);
        if (result.landmarks && result.landmarks.length > 0) {
          return result.landmarks[0];
        }
      } catch (e) {
        // Suppress frame glitches
        console.debug('Pose detection frame skipped:', e);
      }

      return null;
    },
    []
  );

  return { isLoaded, isLoading, error, detectPose };
}
