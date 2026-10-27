import { Garment, GarmentCategory, TryOnResult, ProviderStatus } from '../types';

export class ApiClient {
  private static baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '') + '/api';

  static async getCatalog(category?: GarmentCategory, search?: string): Promise<Garment[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const res = await fetch(`${this.baseUrl}/catalog?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to load catalog (${res.status})`);
    }
    return res.json();
  }

  static async getGarment(id: string): Promise<Garment> {
    const res = await fetch(`${this.baseUrl}/catalog/${id}`);
    if (!res.ok) throw new Error(`Garment not found (${res.status})`);
    return res.json();
  }

  static async getProviderStatus(): Promise<ProviderStatus> {
    const res = await fetch(`${this.baseUrl}/tryon/provider-status`);
    if (!res.ok) throw new Error('Failed to retrieve provider status');
    return res.json();
  }

  static async generateRealisticTryOn(
    personBlob: Blob,
    garmentId: string,
    category: string = 'upper_body'
  ): Promise<TryOnResult> {
    const formData = new FormData();
    formData.append('person_image', personBlob, 'capture.jpg');
    formData.append('garment_id', garmentId);
    formData.append('category', category);

    const res = await fetch(`${this.baseUrl}/tryon/generate`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown network error' }));
      throw new Error(err.detail || `Inference error (${res.status})`);
    }

    return res.json();
  }

  static async verifyAdminAuth(token: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/admin/auth/verify`, {
      method: 'POST',
      headers: { 'X-Admin-Token': token },
    });
    return res.ok;
  }

  static async createCatalogGarment(
    formData: FormData,
    adminToken: string
  ): Promise<Garment> {
    const res = await fetch(`${this.baseUrl}/admin/catalog`, {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Failed to create garment');
    }

    return res.json();
  }

  static async deleteCatalogGarment(id: string, adminToken: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/admin/catalog/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Token': adminToken },
    });

    if (!res.ok) {
      throw new Error(`Failed to delete garment (${res.status})`);
    }
  }
}
