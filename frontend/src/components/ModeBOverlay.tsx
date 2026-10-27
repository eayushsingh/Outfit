import React, { useState } from 'react';
import { TryOnResult, Garment } from '../types';
import { Download, RefreshCw, XCircle, AlertTriangle, Wand2, ArrowLeftRight } from 'lucide-react';

interface ModeBOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  result: TryOnResult | null;
  originalImageSrc: string | null;
  selectedGarment: Garment | null;
  isProcessing: boolean;
  error: string | null;
  onRetry: () => void;
}

export const ModeBOverlay: React.FC<ModeBOverlayProps> = ({
  isOpen,
  onClose,
  result,
  originalImageSrc,
  selectedGarment,
  isProcessing,
  error,
  onRetry,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  const resultDataUrl = result
    ? `data:${result.content_type || 'image/jpeg'};base64,${result.image_base64}`
    : null;

  const handleDownload = () => {
    if (!resultDataUrl) return;
    const a = document.createElement('a');
    a.href = resultDataUrl;
    a.download = `virtualfit_${selectedGarment?.name.toLowerCase().replace(/\s+/g, '_') || 'outfit'}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSliderMove = (clientX: number, rect: DOMRect) => {
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.round((x / rect.width) * 100);
    setSliderPosition(percentage);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(5, 8, 16, 0.88)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-indigo)',
              }}
            >
              <Wand2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Mode B: Realistic Try-On</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {selectedGarment ? `Target Outfit: ${selectedGarment.name}` : 'Diffusion Snapshot Fit'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ minHeight: '38px', padding: '0 12px', borderRadius: '8px' }}
            title="Close view"
          >
            <XCircle size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          {/* Processing State */}
          {isProcessing && (
            <div style={{ textAlign: 'center', maxWidth: '420px', padding: '40px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: '3px solid rgba(99, 102, 241, 0.2)',
                  borderTopColor: 'var(--accent-indigo)',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px',
                }}
              />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                Synthesizing Realistic Fit...
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Connecting to virtual try-on inference adapter. Diffusion inference computes cloth drape and natural lighting.
              </p>
              <div
                style={{
                  marginTop: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <span className="pulse-dot" style={{ background: 'var(--accent-indigo)' }} />
                Streaming pipeline active
              </div>
            </div>
          )}

          {/* Error State */}
          {!isProcessing && error && (
            <div style={{ textAlign: 'center', maxWidth: '460px', padding: '30px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: 'var(--accent-rose)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <AlertTriangle size={28} />
              </div>
              <h4 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>
                Inference Gateway Alert
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                {error}
              </p>
              <button onClick={onRetry} className="btn-primary">
                <RefreshCw size={16} />
                Retry Generation
              </button>
            </div>
          )}

          {/* Completed State with Interactive Before / After Comparison */}
          {!isProcessing && !error && result && resultDataUrl && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Mandatory Honest Disclaimers */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                {result.is_demo ? (
                  <span className="badge badge-demo" style={{ fontWeight: 800, letterSpacing: '0.04em' }}>
                    DEMO: NOT AI (SYNTHETIC LOCAL COMPOSITE)
                  </span>
                ) : (
                  <span className="badge badge-ai">
                    <span className="pulse-dot" style={{ background: '#818cf8' }} />
                    AI-generated image (not live)
                  </span>
                )}

                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                  }}
                >
                  Latency: {result.latency_ms} ms | Provider: {result.provider}
                </span>
              </div>

              {/* Before / After Comparison Viewport */}
              <div
                className="slider-container"
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={(e) => {
                  if (isDragging) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleSliderMove(e.clientX, rect);
                  }
                }}
                onTouchMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  handleSliderMove(e.touches[0].clientX, rect);
                }}
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '540px',
                  aspectRatio: '3/4',
                  background: '#090d16',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
                }}
              >
                {/* Result Image (Full background) */}
                <img
                  src={resultDataUrl}
                  alt="Virtual Try-On Result"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                  }}
                />

                {/* Original Captured Frame (Clipped Left overlay) */}
                {originalImageSrc && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: `${sliderPosition}%`,
                      height: '100%',
                      overflow: 'hidden',
                      pointerEvents: 'none',
                    }}
                  >
                    <img
                      src={originalImageSrc}
                      alt="Original Customer Capture"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '540px', // Matches max container width
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        background: 'rgba(0, 0, 0, 0.65)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#fff',
                      }}
                    >
                      ORIGINAL
                    </div>
                  </div>
                )}

                {/* Result Label on Right */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--accent-cyan)',
                  }}
                >
                  TRY-ON RESULT
                </div>

                {/* Divider Line & Drag Handle */}
                {originalImageSrc && (
                  <div
                    className="slider-divider"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="slider-handle">
                      <ArrowLeftRight size={18} />
                    </div>
                  </div>
                )}
              </div>

              {/* License Notice Footer */}
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginTop: '12px',
                  textAlign: 'center',
                  maxWidth: '540px',
                }}
              >
                {result.license_notice}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isProcessing && result && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              background: 'rgba(10, 14, 24, 0.6)',
            }}
          >
            <button onClick={onRetry} className="btn-secondary">
              <RefreshCw size={16} />
              Re-generate
            </button>
            <button onClick={handleDownload} className="btn-primary">
              <Download size={16} />
              Download Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
