import React, { useState } from 'react';
import { Garment, GarmentCategory } from '../types';
import { Search, RotateCcw, Sparkles } from 'lucide-react';

interface CatalogDrawerProps {
  garments: Garment[];
  selectedGarment: Garment | null;
  onSelectGarment: (garment: Garment | null) => void;
  isLoading: boolean;
}

const CATEGORIES: { label: string; value: GarmentCategory | 'all' }[] = [
  { label: 'All Items', value: 'all' },
  { label: 'Shirts', value: 'shirt' },
  { label: 'T-Shirts', value: 'tshirt' },
  { label: 'Jackets', value: 'jacket' },
  { label: 'Hoodies', value: 'hoodie' },
  { label: 'Sweaters', value: 'sweater' },
];

export const CatalogDrawer: React.FC<CatalogDrawerProps> = ({
  garments,
  selectedGarment,
  onSelectGarment,
  isLoading,
}) => {
  const [activeCategory, setActiveCategory] = useState<GarmentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGarments = garments.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '20px',
        overflow: 'hidden',
      }}
    >
      {/* Search & Reset Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search catalog styles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '46px',
              paddingLeft: '42px',
              paddingRight: '14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {selectedGarment && (
          <button
            onClick={() => onSelectGarment(null)}
            className="btn-secondary"
            title="Clear chosen garment"
            style={{ minHeight: '46px', padding: '0 16px' }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        )}
      </div>

      {/* Category Chips Carousel */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '12px',
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`chip ${activeCategory === cat.value ? 'active' : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Garment Grid / Cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '14px',
          paddingRight: '4px',
        }}
      >
        {isLoading && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '40px 0',
              color: 'var(--text-muted)',
            }}
          >
            Loading clothing catalog...
          </div>
        )}

        {!isLoading && filteredGarments.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-muted)',
            }}
          >
            No apparel matches your criteria. Try another filter.
          </div>
        )}

        {filteredGarments.map((garment) => {
          const isSelected = selectedGarment?.id === garment.id;
          return (
            <div
              key={garment.id}
              onClick={() => onSelectGarment(garment)}
              className={`glass-card ${isSelected ? 'active' : ''}`}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'var(--accent-cyan)',
                    color: '#090d16',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={12} />
                  WEARING
                </div>
              )}

              {/* Garment Thumbnail Container */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '3/4',
                  background: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={garment.cutout_url || garment.image_url}
                  alt={garment.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transition: 'transform 0.3s ease',
                  }}
                />
              </div>

              {/* Garment Metadata */}
              <div style={{ padding: '12px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--accent-cyan)',
                    fontWeight: 600,
                  }}
                >
                  {garment.category}
                </span>
                <h4
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginTop: '2px',
                    lineHeight: '1.3',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {garment.name}
                </h4>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
