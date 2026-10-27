import { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from './hooks/useCamera';
import { usePoseLandmarker } from './hooks/usePoseLandmarker';
import { GarmentWarpEngine } from './components/GarmentWarpEngine';
import { CatalogDrawer } from './components/CatalogDrawer';
import { ModeBOverlay } from './components/ModeBOverlay';
import { PrivacyModal } from './components/PrivacyModal';
import { AdminModal } from './components/AdminModal';
import { GarmentGuideModal } from './components/GarmentGuideModal';
import { ApiClient } from './api/client';
import { Garment, TryOnResult, ProviderStatus } from './types';
import { FramingAssessment, calculateStageDimensions } from './utils/coordinates';
import {
  Video,
  VideoOff,
  Wand2,
  HelpCircle,
  Settings,
  ShieldCheck,
  AlertCircle,
  Eye,
  Camera,
  Activity,
  Layers,
  UserCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';

export function App() {
  // Catalog State
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(true);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  // Camera & Tracking Hooks
  const {
    status: cameraStatus,
    errorMessage: cameraError,
    videoRef,
    devices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrameBlob,
  } = useCamera();

  const { isLoaded: isLandmarkerLoaded, detectPose } = usePoseLandmarker();
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [showSkeletonDebug, setShowSkeletonDebug] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);
  const [framing, setFraming] = useState<FramingAssessment>({
    isValid: false,
    message: null,
    status: 'no_person',
    confidence: 0,
  });

  // Responsive Stage Dimensions (matching video aspect ratio)
  const mirrorContainerRef = useRef<HTMLDivElement | null>(null);
  const [stageDimensions, setStageDimensions] = useState<{ width: number; height: number }>({
    width: 1280,
    height: 720,
  });

  // Mode B State
  const [isModeBOpen, setIsModeBOpen] = useState<boolean>(false);
  const [isModeBProcessing, setIsModeBProcessing] = useState<boolean>(false);
  const [modeBResult, setModeBResult] = useState<TryOnResult | null>(null);
  const [modeBOriginalSrc, setModeBOriginalSrc] = useState<string | null>(null);
  const [modeBError, setModeBError] = useState<string | null>(null);

  // Modals
  const [hasConsented, setHasConsented] = useState<boolean>(() => {
    return localStorage.getItem('vf_camera_consent') === 'true';
  });
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Load Catalog and Provider Status on Mount
  const loadCatalogData = useCallback(async () => {
    try {
      setIsCatalogLoading(true);
      const items = await ApiClient.getCatalog();
      setGarments(items);
      if (items.length > 0 && !selectedGarment) {
        setSelectedGarment(items[0]);
      }
    } catch (e) {
      console.error('Failed to load clothing catalog:', e);
    } finally {
      setIsCatalogLoading(false);
    }

    try {
      const status = await ApiClient.getProviderStatus();
      setProviderStatus(status);
    } catch (e) {
      console.warn('Backend provider status endpoint unreachable:', e);
    }
  }, [selectedGarment]);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  // Adjust Stage Dimensions whenever mirror section or video dimensions resize
  const updateStageDimensions = useCallback(() => {
    const container = mirrorContainerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const contW = container.clientWidth;
    const contH = container.clientHeight;
    const vidW = (video && video.videoWidth) ? video.videoWidth : 1280;
    const vidH = (video && video.videoHeight) ? video.videoHeight : 720;

    const fitted = calculateStageDimensions(contW, contH, vidW, vidH);
    setStageDimensions({ width: fitted.width, height: fitted.height });
  }, [videoRef]);

  useEffect(() => {
    window.addEventListener('resize', updateStageDimensions);
    const observer = new ResizeObserver(() => updateStageDimensions());
    if (mirrorContainerRef.current) {
      observer.observe(mirrorContainerRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateStageDimensions);
      observer.disconnect();
    };
  }, [updateStageDimensions]);

  // Frame processing loop for MediaPipe Pose Tracking
  const animFrameRef = useRef<number>();
  useEffect(() => {
    const loop = (timestamp: number) => {
      // Support test harness landmark injection for automated headless testing
      const testLandmarks = (
        window as unknown as { __VIRTUALFIT_TEST_LANDMARKS__?: NormalizedLandmark[] }
      ).__VIRTUALFIT_TEST_LANDMARKS__;

      if (testLandmarks) {
        setLandmarks(testLandmarks);
      } else if (cameraStatus === 'active' && videoRef.current && isLandmarkerLoaded) {
        const detected = detectPose(videoRef.current, timestamp);
        if (detected) {
          setLandmarks(detected);
        } else {
          setLandmarks(null);
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraStatus, isLandmarkerLoaded, detectPose, videoRef]);

  // Camera Start Handler with Consent Enforcement
  const handleStartCameraClick = () => {
    if (!hasConsented) {
      setShowPrivacyModal(true);
    } else {
      startCamera();
    }
  };

  const handlePrivacyConsent = () => {
    setHasConsented(true);
    localStorage.setItem('vf_camera_consent', 'true');
    setShowPrivacyModal(false);
    startCamera();
  };

  // Reset Handler
  const handleResetOutfit = () => {
    setSelectedGarment(null);
    setModeBResult(null);
    setModeBOriginalSrc(null);
  };

  // Mode B "Generate Realistic Fit" Handler
  const handleGenerateRealisticFit = async () => {
    if (cameraStatus !== 'active') {
      alert('Please start the mirror camera first.');
      return;
    }
    if (!selectedGarment) {
      alert('Please select an apparel item from the catalog.');
      return;
    }

    setIsModeBOpen(true);
    setIsModeBProcessing(true);
    setModeBError(null);
    setModeBResult(null);

    try {
      const blob = await captureFrameBlob();
      const originalUrl = URL.createObjectURL(blob);
      setModeBOriginalSrc(originalUrl);

      const result = await ApiClient.generateRealisticTryOn(blob, selectedGarment.id);
      setModeBResult(result);
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('Mode B generation error:', e);
      setModeBError(e.message || 'Inference service was unable to generate realistic fit.');
    } finally {
      setIsModeBProcessing(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-dark)',
        overflow: 'hidden',
      }}
    >
      {/* Top Navigation & Status Bar */}
      <header
        style={{
          height: '64px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(9, 13, 22, 0.95)',
          backdropFilter: 'blur(12px)',
          zIndex: 30,
        }}
      >
        {/* Brand Logo & Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px var(--accent-cyan-glow)',
            }}
          >
            <Layers size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>VirtualFit AI</h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                }}
              >
                PROTOTYPE
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              In-Store Digital Trial Mirror
            </p>
          </div>
        </div>

        {/* Status Indicators & Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Tracking Status Chip */}
          {cameraStatus === 'active' && (
            <div
              className={`badge ${
                framing.status === 'optimal'
                  ? 'badge-live'
                  : framing.status === 'step_back'
                  ? 'badge-demo'
                  : 'badge-ai'
              }`}
              style={{ fontSize: '11px' }}
            >
              {framing.status === 'optimal' ? (
                <>
                  <UserCheck size={13} />
                  Person Detected
                </>
              ) : framing.status === 'step_back' ? (
                <>
                  <AlertTriangle size={13} />
                  Move Back
                </>
              ) : (
                <>
                  <Activity size={13} />
                  No Person
                </>
              )}
            </div>
          )}

          {/* FPS Counter */}
          {cameraStatus === 'active' && fps > 0 && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--accent-cyan)',
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                fontWeight: 600,
              }}
            >
              {fps} FPS
            </div>
          )}

          {/* Provider / Demo Badge */}
          {providerStatus && (
            <div
              className={`badge ${providerStatus.demo_mode ? 'badge-demo' : 'badge-ai'}`}
              title={providerStatus.active_license}
            >
              <Activity size={12} />
              {providerStatus.demo_mode
                ? 'DEMO MODE (SYNTHETIC)'
                : providerStatus.current_provider.toUpperCase()}
            </div>
          )}

          {/* Privacy Dialog Trigger */}
          <button
            id="privacy-button"
            onClick={() => setShowPrivacyModal(true)}
            className="btn-secondary"
            style={{ minHeight: '38px', padding: '0 12px', fontSize: '13px' }}
            title="Privacy and on-device processing notice"
          >
            <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)' }} />
            Privacy
          </button>

          {/* Garment Photo Guide */}
          <button
            id="guide-button"
            onClick={() => setShowGuideModal(true)}
            className="btn-secondary"
            style={{ minHeight: '38px', padding: '0 12px', fontSize: '13px' }}
            title="Garment photography recommendations"
          >
            <HelpCircle size={16} />
            Photo Guide
          </button>

          {/* Admin Dashboard */}
          <button
            id="admin-button"
            onClick={() => setShowAdminModal(true)}
            className="btn-secondary"
            style={{ minHeight: '38px', padding: '0 12px', fontSize: '13px' }}
            title="Store manager catalog admin"
          >
            <Settings size={16} />
            Admin
          </button>
        </div>
      </header>

      {/* Main Kiosk Viewport */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Interactive Virtual Mirror Viewport with Symmetrical Letterboxing */}
        <section
          ref={mirrorContainerRef}
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#04070e',
            overflow: 'hidden',
          }}
        >
          {/* Centered Symmetrical Stage matching video aspect ratio */}
          <div
            id="mirror-stage"
            style={{
              position: 'relative',
              width: `${stageDimensions.width}px`,
              height: `${stageDimensions.height}px`,
              maxWidth: '100%',
              maxHeight: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000000',
              boxShadow: '0 0 50px rgba(0, 0, 0, 0.9)',
              overflow: 'hidden',
            }}
          >
            {/* Webcam Video Stream (mirrored horizontally via scaleX(-1)) */}
            <video
              ref={videoRef}
              playsInline
              muted
              onLoadedMetadata={updateStageDimensions}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                transform: 'scaleX(-1)', // Mirrored for natural mirror experience
                display: cameraStatus === 'active' ? 'block' : 'none',
              }}
            />

            {/* Mode A Live Garment Overlay Canvas (coordinates mapped with mirror transform) */}
            {cameraStatus === 'active' && (
              <GarmentWarpEngine
                videoRef={videoRef}
                landmarks={landmarks}
                selectedGarment={selectedGarment}
                isActive={cameraStatus === 'active'}
                showSkeletonDebug={showSkeletonDebug}
                onFramingChange={setFraming}
                onFpsUpdate={setFps}
              />
            )}

            {/* Framing Guidance Toast: "Step back so your shoulders and torso are visible" */}
            {cameraStatus === 'active' && framing.message && (
              <div
                style={{
                  position: 'absolute',
                  top: '72px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(245, 158, 11, 0.92)',
                  color: '#090d16',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  zIndex: 25,
                  backdropFilter: 'blur(8px)',
                  animation: 'pulse 2s infinite',
                }}
              >
                <AlertTriangle size={16} />
                {framing.message}
              </div>
            )}

            {/* Faint Body Outline Guide when framing needs adjustment */}
            {cameraStatus === 'active' && !framing.isValid && (
              <div
                style={{
                  position: 'absolute',
                  inset: '15% 25%',
                  border: '2px dashed rgba(6, 182, 212, 0.25)',
                  borderRadius: '24px',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(6, 182, 212, 0.35)',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  zIndex: 15,
                }}
              >
                Fit Silhouette Inside Box
              </div>
            )}
          </div>

          {/* Honest Mode A Badge Overlay */}
          {cameraStatus === 'active' && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                zIndex: 20,
              }}
            >
              <div className="badge badge-live">
                <span className="pulse-dot" style={{ background: '#10b981' }} />
                Live preview (approximate fit)
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  background: 'rgba(0, 0, 0, 0.6)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                100% on-device tracking — 0 frames uploaded
              </div>
            </div>
          )}

          {/* Skeleton Debug Toggle */}
          {cameraStatus === 'active' && (
            <button
              id="skeleton-debug-toggle"
              onClick={() => setShowSkeletonDebug(!showSkeletonDebug)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 20,
                background: showSkeletonDebug ? 'rgba(6, 182, 212, 0.3)' : 'rgba(0, 0, 0, 0.6)',
                border: '1px solid var(--border-subtle)',
                color: showSkeletonDebug ? 'var(--accent-cyan)' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Eye size={14} />
              {showSkeletonDebug ? 'Hide Skeleton' : 'Debug Skeleton'}
            </button>
          )}

          {/* Idle / Camera Off State */}
          {cameraStatus === 'idle' && (
            <div
              style={{
                textAlign: 'center',
                maxWidth: '460px',
                padding: '40px 24px',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '20px',
                  background: 'rgba(6, 182, 212, 0.1)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: '0 0 30px var(--accent-cyan-glow)',
                }}
              >
                <Camera size={36} />
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>
                Step In Front of the Mirror
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  marginBottom: '28px',
                  lineHeight: '1.5',
                }}
              >
                Click below to start your webcam. All live motion tracking runs entirely on this
                machine with complete privacy.
              </p>

              <button
                id="start-camera-button"
                onClick={handleStartCameraClick}
                className="btn-primary"
                style={{ padding: '0 32px', fontSize: '16px', minHeight: '52px' }}
              >
                <Video size={20} />
                Start Trial Room Camera
              </button>
            </div>
          )}

          {/* Requesting Camera Permission State */}
          {cameraStatus === 'requesting' && (
            <div style={{ textAlign: 'center', padding: '40px', zIndex: 10 }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  border: '3px solid rgba(6, 182, 212, 0.2)',
                  borderTopColor: 'var(--accent-cyan)',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px',
                }}
              />
              <p style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                Waiting for browser camera permission...
              </p>
            </div>
          )}

          {/* Camera Permission Denied / Error States */}
          {(cameraStatus === 'denied' || cameraStatus === 'error' || cameraStatus === 'no_device') && (
            <div
              style={{
                textAlign: 'center',
                maxWidth: '460px',
                padding: '40px 24px',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: 'var(--accent-rose)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <AlertCircle size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                Camera Unavailable
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  marginBottom: '24px',
                  lineHeight: '1.5',
                }}
              >
                {cameraError || 'Unable to access your camera.'}
              </p>
              <button onClick={handleStartCameraClick} className="btn-primary">
                Try Again
              </button>
            </div>
          )}

          {/* Floating Bottom Control Deck */}
          {cameraStatus === 'active' && (
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(10, 15, 26, 0.85)',
                backdropFilter: 'blur(16px)',
                padding: '10px 18px',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
                zIndex: 20,
              }}
            >
              {/* Stop Camera Button */}
              <button
                id="stop-camera-button"
                onClick={stopCamera}
                className="btn-danger"
                style={{ minHeight: '44px' }}
                title="Turn off webcam and release media tracks"
              >
                <VideoOff size={16} />
                Stop Camera
              </button>

              {/* Reset Outfit Button */}
              {selectedGarment && (
                <button
                  id="reset-outfit-button"
                  onClick={handleResetOutfit}
                  className="btn-secondary"
                  style={{ minHeight: '44px' }}
                  title="Clear garment overlay"
                >
                  <RotateCcw size={16} />
                  Clear Garment
                </button>
              )}

              {/* Camera Switcher Dropdown (if multiple devices) */}
              {devices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => switchCamera(e.target.value)}
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId} style={{ background: '#090d16' }}>
                      {d.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Mode B Realistic Try-On Trigger Button */}
              <button
                id="generate-realistic-fit-button"
                onClick={handleGenerateRealisticFit}
                className="btn-primary"
                style={{ minHeight: '44px', padding: '0 20px' }}
                title="Capture still snapshot and run AI try-on inference"
              >
                <Wand2 size={18} />
                Generate Realistic Fit (Mode B)
              </button>
            </div>
          )}
        </section>

        {/* Right: Digital Clothing Catalog Drawer */}
        <aside
          style={{
            width: '380px',
            background: 'rgba(10, 14, 24, 0.98)',
            borderLeft: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
          }}
        >
          <CatalogDrawer
            garments={garments}
            selectedGarment={selectedGarment}
            onSelectGarment={setSelectedGarment}
            isLoading={isCatalogLoading}
          />
        </aside>
      </main>

      {/* Modals & Overlays */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onConsent={handlePrivacyConsent}
        onDecline={() => setShowPrivacyModal(false)}
      />

      <GarmentGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      <AdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        garments={garments}
        onCatalogMutated={loadCatalogData}
      />

      <ModeBOverlay
        isOpen={isModeBOpen}
        onClose={() => setIsModeBOpen(false)}
        result={modeBResult}
        originalImageSrc={modeBOriginalSrc}
        selectedGarment={selectedGarment}
        isProcessing={isModeBProcessing}
        error={modeBError}
        onRetry={handleGenerateRealisticFit}
      />
    </div>
  );
}

export default App;
