import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../api/client';

describe('ApiClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches catalog items successfully', async () => {
    const mockData = [{ id: '1', name: 'Test Shirt', category: 'shirt' }];
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const items = await ApiClient.getCatalog('shirt', 'Test');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/catalog?category=shirt&search=Test');
    expect(items).toEqual(mockData);
  });

  it('throws error when catalog response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(ApiClient.getCatalog()).rejects.toThrow('Failed to load catalog (500)');
  });

  it('verifies admin token correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
    } as Response);

    const isValid = await ApiClient.verifyAdminAuth('secret_token');
    expect(isValid).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/admin/auth/verify', {
      method: 'POST',
      headers: { 'X-Admin-Token': 'secret_token' },
    });
  });
});
