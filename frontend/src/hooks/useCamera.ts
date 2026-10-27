import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraDevice } from '../types';

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'no_device' | 'error';

export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const enumerateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${idx + 1}`,
        }));
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Failed to enumerate media devices:', e);
    }
  }, [selectedDeviceId]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  const startCamera = useCallback(async (deviceIdOverride?: string) => {
    setStatus('requesting');
    setErrorMessage(null);

    // Stop existing stream if running
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const targetDeviceId = deviceIdOverride || selectedDeviceId;
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: targetDeviceId ? undefined : 'user',
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus('active');
      // Re-enumerate to get labels now that permission has been granted
      await enumerateDevices();
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setStatus('no_device');
        setErrorMessage('No camera device detected on your system.');
      } else {
        setStatus('error');
        setErrorMessage(error.message || 'Unable to access the camera.');
      }
    }
  }, [selectedDeviceId, enumerateDevices]);

  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (status === 'active') {
      await startCamera(deviceId);
    }
  }, [status, startCamera]);

  const captureFrameBlob = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current;
    if (!video || status !== 'active') {
      throw new Error('Camera is not active or video element is not ready.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D canvas context for frame capture.');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create JPEG blob from video frame.'));
        },
        'image/jpeg',
        0.95
      );
    });
  }, [status]);

  // Clean teardown on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    status,
    errorMessage,
    videoRef,
    devices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrameBlob,
  };
}
