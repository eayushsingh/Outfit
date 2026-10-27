import React from 'react';
import { Camera, CheckCircle2, XCircle, X, Sparkles } from 'lucide-react';

interface GarmentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GarmentGuideModal: React.FC<GarmentGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(5, 8, 16, 0.9)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Garment Photo Guide</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                How to photograph apparel for highest virtual try-on realism
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ minHeight: '36px', padding: '0 10px', borderRadius: '8px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            {/* What works best */}
            <div
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#34d399',
                  fontWeight: 700,
                  fontSize: '15px',
                  marginBottom: '14px',
                }}
              >
                <CheckCircle2 size={18} />
                Recommended Best Practices
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                }}
              >
                <li>
                  <strong style={{ color: '#fff' }}>Ghost-Mannequin or Flat-Lay:</strong> Photograph
                  garments directly facing front with zero perspective distortion.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>Plain White / Studio Backdrop:</strong> Solid,
                  high-contrast background allows flawless automatic cutout generation.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>Symmetrical Positioning:</strong> Spread sleeves
                  evenly and smooth wrinkles and folds.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>High Resolution:</strong> Minimum 768x1024 px;
                  crisp focus with even studio lighting.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>Mode A Transparent Cutouts:</strong> Provide an
                  alpha-channel PNG cutout for ultra-crisp real-time video overlay.
                </li>
              </ul>
            </div>

            {/* What to avoid */}
            <div
              style={{
                padding: '20px',
                borderRadius: '14px',
                background: 'rgba(244, 63, 94, 0.06)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#fb7185',
                  fontWeight: 700,
                  fontSize: '15px',
                  marginBottom: '14px',
                }}
              >
                <XCircle size={18} />
                What To Avoid
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                }}
              >
                <li>
                  <strong style={{ color: '#fff' }}>Do Not Use Human Models:</strong> If a human is
                  already wearing the garment, Mode B diffusion models confuse the body shape.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>Folded or Angled Garments:</strong> Avoid hanger
                  slouches or 45-degree angle shots.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>Busy Patterns in Background:</strong> Cluttered
                  retail racks or textures degrade background removal.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>Heavy Flash Shadows:</strong> Uneven harsh
                  shadows create dark borders on the virtual fit.
                </li>
                <li>
                  <strong style={{ color: '#fff' }}>Cropped Apparel:</strong> Never cut off the
                  collar, sleeves, or lower hem in the photo frame.
                </li>
              </ul>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Sparkles size={22} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              <strong>Admin Tip:</strong> When uploading in the Admin Dashboard, you can upload both
              a high-res flat-lay for Mode B diffusion inference and a transparent cutout PNG for
              the real-time Mode A mirror.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button onClick={onClose} className="btn-primary" style={{ minWidth: '120px' }}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
