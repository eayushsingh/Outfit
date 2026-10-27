import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogDrawer } from '../components/CatalogDrawer';
import { Garment } from '../types';

const mockGarments: Garment[] = [
  {
    id: 'g-1',
    name: 'Classic Oxford Button-Down',
    category: 'shirt',
    description: 'Cotton Oxford Shirt',
    image_url: '/api/catalog/assets/shirt.jpg',
    created_at: '2026-10-27T00:00:00Z',
    updated_at: '2026-10-27T00:00:00Z',
  },
  {
    id: 'g-2',
    name: 'Denim Trucker Jacket',
    category: 'jacket',
    description: 'Vintage Denim Jacket',
    image_url: '/api/catalog/assets/jacket.jpg',
    created_at: '2026-10-27T00:00:00Z',
    updated_at: '2026-10-27T00:00:00Z',
  },
];

describe('CatalogDrawer Component', () => {
  it('renders garments and handles selection', () => {
    const handleSelect = vi.fn();
    render(
      <CatalogDrawer
        garments={mockGarments}
        selectedGarment={mockGarments[0]}
        onSelectGarment={handleSelect}
        isLoading={false}
      />
    );

    expect(screen.getByText('Classic Oxford Button-Down')).toBeInTheDocument();
    expect(screen.getByText('Denim Trucker Jacket')).toBeInTheDocument();
    expect(screen.getByText('WEARING')).toBeInTheDocument();

    // Click second garment
    fireEvent.click(screen.getByText('Denim Trucker Jacket'));
    expect(handleSelect).toHaveBeenCalledWith(mockGarments[1]);
  });

  it('filters garments by category', () => {
    render(
      <CatalogDrawer
        garments={mockGarments}
        selectedGarment={null}
        onSelectGarment={vi.fn()}
        isLoading={false}
      />
    );

    // Filter by Jackets
    fireEvent.click(screen.getByText('Jackets'));
    expect(screen.getByText('Denim Trucker Jacket')).toBeInTheDocument();
    expect(screen.queryByText('Classic Oxford Button-Down')).not.toBeInTheDocument();
  });

  it('filters garments by search query', () => {
    render(
      <CatalogDrawer
        garments={mockGarments}
        selectedGarment={null}
        onSelectGarment={vi.fn()}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText('Search catalog styles...');
    fireEvent.change(input, { target: { value: 'Oxford' } });

    expect(screen.getByText('Classic Oxford Button-Down')).toBeInTheDocument();
    expect(screen.queryByText('Denim Trucker Jacket')).not.toBeInTheDocument();
  });
});
