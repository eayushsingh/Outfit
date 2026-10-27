import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCamera } from '../hooks/useCamera';

describe('useCamera Hook', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true,
    });
  });

  it('starts in idle status', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.status).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
  });

  it('handles permission denied gracefully', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue({
      name: 'NotAllowedError',
      message: 'Permission denied',
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
      writable: true,
    });

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.status).toBe('denied');
    expect(result.current.errorMessage).toContain('Camera access was denied');
  });

  it('handles no camera detected', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue({
      name: 'NotFoundError',
      message: 'No device found',
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
      writable: true,
    });

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.status).toBe('no_device');
    expect(result.current.errorMessage).toContain('No camera device detected');
  });

  it('stops camera and cleans up stream tracks', async () => {
    const stopMock = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: stopMock }],
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
      writable: true,
    });

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.status).toBe('active');

    act(() => {
      result.current.stopCamera();
    });

    expect(result.current.status).toBe('idle');
    expect(stopMock).toHaveBeenCalled();
  });
});
