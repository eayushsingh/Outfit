import React, { useState } from 'react';
import { Garment, GarmentCategory } from '../types';
import { ApiClient } from '../api/client';
import { ShieldAlert, Plus, Trash2, Key, CheckCircle, Upload, X } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  garments: Garment[];
  onCatalogMutated: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  garments,
  onCatalogMutated,
}) => {
  const [tokenInput, setTokenInput] = useState<string>(
    sessionStorage.getItem('vf_admin_token') || ''
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // New Garment Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GarmentCategory>('shirt');
  const [description, setDescription] = useState('');
  const [shoulderScale, setShoulderScale] = useState<number>(1.0);
  const [torsoOffsetY, setTorsoOffsetY] = useState<number>(0.0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cutoutFile, setCutoutFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const isValid = await ApiClient.verifyAdminAuth(tokenInput.trim());
      if (isValid) {
        setIsAuthenticated(true);
        sessionStorage.setItem('vf_admin_token', tokenInput.trim());
      } else {
        setAuthError('Invalid administrative token.');
      }
    } catch {
      setAuthError('Authentication verification failed.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isCutout: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isCutout) {
        setCutoutFile(file);
      } else {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleCreateGarment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setSubmitError('Primary garment photo is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('image', imageFile);
      if (cutoutFile) {
        formData.append('cutout', cutoutFile);
      }
      formData.append(
        'anchor_hints',
        JSON.stringify({
          shoulder_scale: shoulderScale,
          torso_offset_y: torsoOffsetY,
        })
      );

      await ApiClient.createCatalogGarment(formData, tokenInput.trim());
      setSubmitSuccess('Garment uploaded and catalog updated!');
      setName('');
      setDescription('');
      setImageFile(null);
      setCutoutFile(null);
      setImagePreview(null);
      onCatalogMutated();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setSubmitError(e.message || 'Failed to upload garment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGarment = async (garment: Garment) => {
    if (!window.confirm(`Are you sure you want to delete "${garment.name}"?`)) {
      return;
    }

    try {
      await ApiClient.deleteCatalogGarment(garment.id, tokenInput.trim());
      onCatalogMutated();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(`Delete failed: ${e.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(5, 8, 16, 0.92)',
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
          maxWidth: '860px',
          maxHeight: '92vh',
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
                background: 'rgba(244, 63, 94, 0.15)',
                color: 'var(--accent-rose)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Catalog Management Dashboard</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Protected in-store manager administration
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

        {/* Auth Gate */}
        {!isAuthenticated ? (
          <div
            style={{
              padding: '60px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: '420px',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
                marginBottom: '16px',
              }}
            >
              <Key size={26} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Authentication Required
            </h4>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              Enter the admin secret key defined in <code>ADMIN_API_KEY</code> to access catalog tools.
            </p>

            <form onSubmit={handleVerifyAuth} style={{ width: '100%' }}>
              <input
                type="password"
                placeholder="Admin API Key"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '46px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  marginBottom: '12px',
                  outline: 'none',
                }}
              />
              {authError && (
                <p style={{ fontSize: '12px', color: 'var(--accent-rose)', marginBottom: '12px' }}>
                  {authError}
                </p>
              )}
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Unlock Dashboard
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Management Panel */
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
            {/* Upload Form */}
            <div
              style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '32px',
              }}
            >
              <h4
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Plus size={18} style={{ color: 'var(--accent-cyan)' }} />
                Add New Apparel Item
              </h4>

              <form
                onSubmit={handleCreateGarment}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Garment Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vintage Italian Linen Shirt"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        marginTop: '4px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as GarmentCategory)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        background: '#121826',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        marginTop: '4px',
                        outline: 'none',
                      }}
                    >
                      <option value="shirt">Shirt</option>
                      <option value="tshirt">T-Shirt</option>
                      <option value="jacket">Jacket</option>
                      <option value="hoodie">Hoodie</option>
                      <option value="sweater">Sweater</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Description</label>
                  <input
                    type="text"
                    placeholder="Short merchandising description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                      marginTop: '4px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* File Uploads */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Flat-Lay Photo (Mode B) *
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      onChange={(e) => handleFileChange(e, false)}
                      style={{ marginTop: '4px', display: 'block', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Transparent Cutout PNG (Mode A Mirror)
                    </label>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => handleFileChange(e, true)}
                      style={{ marginTop: '4px', display: 'block', fontSize: '12px' }}
                    />
                  </div>
                </div>

                {/* Anchor Scale Tuning */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Mode A Shoulder Scale ({shoulderScale}x)
                    </label>
                    <input
                      type="range"
                      min="0.8"
                      max="1.4"
                      step="0.05"
                      value={shoulderScale}
                      onChange={(e) => setShoulderScale(parseFloat(e.target.value))}
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Mode A Torso Offset Y ({torsoOffsetY})
                    </label>
                    <input
                      type="range"
                      min="-0.2"
                      max="0.3"
                      step="0.02"
                      value={torsoOffsetY}
                      onChange={(e) => setTorsoOffsetY(parseFloat(e.target.value))}
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                  </div>
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={imagePreview}
                      alt="Upload Preview"
                      style={{
                        width: '70px',
                        height: '70px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        background: '#000',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      File ready for validation & upload
                    </span>
                  </div>
                )}

                {submitError && (
                  <p style={{ fontSize: '12px', color: 'var(--accent-rose)' }}>{submitError}</p>
                )}
                {submitSuccess && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--accent-emerald)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle size={14} />
                    {submitSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', minWidth: '160px' }}
                >
                  <Upload size={16} />
                  {isSubmitting ? 'Uploading...' : 'Upload & Add to Catalog'}
                </button>
              </form>
            </div>

            {/* Existing Catalog List */}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
                Current Store Garments ({garments.length})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {garments.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={g.image_url}
                        alt={g.name}
                        style={{
                          width: '44px',
                          height: '44px',
                          objectFit: 'contain',
                          borderRadius: '6px',
                          background: '#090d16',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{g.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
                          {g.category.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGarment(g)}
                      className="btn-danger"
                      style={{ minHeight: '36px', padding: '0 12px', borderRadius: '8px' }}
                      title="Delete garment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
