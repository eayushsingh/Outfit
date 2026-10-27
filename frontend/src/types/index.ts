export type GarmentCategory = 'shirt' | 'tshirt' | 'jacket' | 'hoodie' | 'sweater' | 'other';

export interface AnchorHints {
  shoulder_scale?: number;
  torso_offset_y?: number;
  aspect_ratio?: number;
  [key: string]: unknown;
}

export interface Garment {
  id: string;
  name: string;
  category: GarmentCategory;
  description: string;
  image_url: string;
  cutout_url?: string;
  anchor_hints?: AnchorHints;
  created_at: string;
  updated_at: string;
}

export interface TryOnResult {
  image_base64: string;
  content_type: string;
  provider: string;
  latency_ms: number;
  is_demo: boolean;
  license_notice: string;
  disclaimer: string;
}

export interface ProviderStatus {
  current_provider: string;
  demo_mode: boolean;
  is_commercial_ready: boolean;
  active_license: string;
  supported_categories: string[];
  timeout_seconds: number;
}

export type TryOnMode = 'live' | 'realistic';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}
