/**
 * Tests para useConversion hook
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBatchConvert, useCheckFfmpeg, useConversion, useConvertTrack } from './useConversion';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCheckFfmpeg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check if ffmpeg is installed', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockResolvedValue(true);

    const { result } = renderHook(() => useCheckFfmpeg(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe(true);
    });

    expect(invoke).toHaveBeenCalledWith('check_ffmpeg_installed');
  });

  it('should return false when ffmpeg is not installed', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockResolvedValue(false);

    const { result } = renderHook(() => useCheckFfmpeg(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe(false);
    });
  });
});

describe('useConvertTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert a single track', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    const mockResult = {
      success: true,
      outputPath: '/output/track.mp3',
      inputPath: '/input/track.flac',
    };
    vi.mocked(invoke).mockResolvedValue(mockResult);

    const { result } = renderHook(() => useConvertTrack(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      inputPath: '/input/track.flac',
      options: {
        bitrate: 320,
        outputFolder: '/output',
        preserveStructure: false,
      },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invoke).toHaveBeenCalledWith('convert_track_to_mp3', {
      inputPath: '/input/track.flac',
      bitrate: 320,
      outputFolder: '/output',
      preserveStructure: false,
    });
  });

  it('should clear progress on completion', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useConvertTrack(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      inputPath: '/input/track.flac',
      options: {
        bitrate: 320,
        outputFolder: '/output',
        preserveStructure: false,
      },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.progress).toBeNull();
    });
  });
});

describe('useBatchConvert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert multiple tracks', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    const mockResults = [
      { success: true, outputPath: '/output/track1.mp3', inputPath: '/input/track1.flac' },
      { success: true, outputPath: '/output/track2.mp3', inputPath: '/input/track2.flac' },
    ];
    vi.mocked(invoke).mockResolvedValue(mockResults);

    const { result } = renderHook(() => useBatchConvert(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      inputPaths: ['/input/track1.flac', '/input/track2.flac'],
      options: {
        bitrate: 320,
        outputFolder: '/output',
        preserveStructure: true,
      },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invoke).toHaveBeenCalledWith('batch_convert_to_mp3', {
      inputPaths: ['/input/track1.flac', '/input/track2.flac'],
      bitrate: 320,
      outputFolder: '/output',
      preserveStructure: true,
    });
  });
});

describe('useConversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide all conversion operations', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockResolvedValue(true);

    const { result } = renderHook(() => useConversion(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.ffmpegInstalled).toBe(true);
    });

    expect(result.current).toHaveProperty('convertTrack');
    expect(result.current).toHaveProperty('convertTrackAsync');
    expect(result.current).toHaveProperty('isConverting');
    expect(result.current).toHaveProperty('batchConvert');
    expect(result.current).toHaveProperty('batchConvertAsync');
    expect(result.current).toHaveProperty('isBatchConverting');
  });

  it('should default ffmpegInstalled to false when loading', () => {
    const { result } = renderHook(() => useConversion(), {
      wrapper: createWrapper(),
    });

    expect(result.current.ffmpegInstalled).toBe(false);
  });
});
