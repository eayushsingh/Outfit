import React from 'react';
import { ShieldCheck, Eye, Cpu, Lock, Check } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onConsent, onDecline }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(4, 7, 14, 0.92)',
        backdropFilter: 'blur(20px)',
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
          maxWidth: '580px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Customer Privacy & Transparency</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              VirtualFit AI In-Store Digital Privacy Guarantee
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Cpu size={22} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Mode A: 100% On-Device Pose Tracking
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                Your live video feed is processed completely inside your browser using Google MediaPipe. 
                <strong style={{ color: '#38bdf8' }}> Zero video frames or facial data leave this device.</strong>
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Eye size={22} style={{ color: '#818cf8', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Mode B: On-Demand Still Snapshots Only
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                If and only if you click "Generate realistic fit", a single still snapshot is transmitted to our inference adapter. We retain zero person photos on the server after generation.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Lock size={22} style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Video Recording & Zero Trackers
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                We do not record video sessions, log personal image contents, or include third-party advertising cookies. Designed in accordance with India&apos;s Digital Personal Data Protection (DPDP) Act principles.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onDecline} className="btn-secondary" style={{ flex: 1 }}>
            Decline
          </button>
          <button onClick={onConsent} className="btn-primary" style={{ flex: 2 }}>
            <Check size={18} />
            Agree & Start Mirror
          </button>
        </div>
      </div>
    </div>
  );
};
