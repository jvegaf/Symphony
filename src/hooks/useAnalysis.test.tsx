/**
 * Tests para hooks/useAnalysis.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import {
  useAnalyzeBeatgrid,
  useGetBeatgrid,
  useUpdateBeatgridOffset,
  useDeleteBeatgrid,
  useCreateCuePoint,
  useGetCuePoints,
  useUpdateCuePoint,
  useDeleteCuePoint,
  useCreateLoop,
  useGetLoops,
  useUpdateLoop,
} from './useAnalysis';
import type { Beatgrid, CuePoint, Loop } from '../types/analysis';

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

// Helper para wrapper con QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Beatgrid Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAnalyzeBeatgrid', () => {
    it('debería analizar beatgrid correctamente', async () => {
      const mockBeatgrid: Beatgrid = {
        trackId: 1,
        bpm: 128,
        offset: 0.5,
        confidence: 95,
        analyzedAt: '2024-01-01T00:00:00Z',
      };

      mockInvoke.mockResolvedValueOnce(mockBeatgrid);

      const { result } = renderHook(() => useAnalyzeBeatgrid(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ trackId: 1, trackPath: '/path/to/track.mp3' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockBeatgrid);
      expect(mockInvoke).toHaveBeenCalledWith('analyze_beatgrid', {
        trackId: 1,
        trackPath: '/path/to/track.mp3',
      });
    });

    it('debería manejar error en análisis', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Analysis failed'));

      const { result } = renderHook(() => useAnalyzeBeatgrid(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ trackId: 1, trackPath: '/invalid/path.mp3' });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe('useGetBeatgrid', () => {
    it('debería obtener beatgrid existente', async () => {
      const mockBeatgrid: Beatgrid = {
        trackId: 1,
        bpm: 120,
        offset: 0.2,
        confidence: 90,
        analyzedAt: '2024-01-01T00:00:00Z',
      };

      mockInvoke.mockResolvedValueOnce(mockBeatgrid);

      const { result } = renderHook(() => useGetBeatgrid(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockBeatgrid);
      expect(mockInvoke).toHaveBeenCalledWith('get_beatgrid', { trackId: 1 });
    });

    it('debería retornar null si no hay beatgrid', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useGetBeatgrid(999), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    });
  });

  describe('useUpdateBeatgridOffset', () => {
    it('debería actualizar offset correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useUpdateBeatgridOffset(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ trackId: 1, offset: 0.75 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockInvoke).toHaveBeenCalledWith('update_beatgrid_offset', {
        trackId: 1,
        offset: 0.75,
      });
    });
  });

  describe('useDeleteBeatgrid', () => {
    it('debería eliminar beatgrid correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteBeatgrid(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(1);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockInvoke).toHaveBeenCalledWith('delete_beatgrid', { trackId: 1 });
    });
  });
});

describe('Cue Point Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreateCuePoint', () => {
    it('debería crear cue point correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(42); // ID del nuevo cue point

      const { result } = renderHook(() => useCreateCuePoint(), {
        wrapper: createWrapper(),
      });

      const request = {
        trackId: 1,
        position: 30.5,
        label: 'Drop',
        color: '#ff0000',
        type: 'drop' as const,
        hotkey: 1,
      };

      result.current.mutate(request);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe(42);
      expect(mockInvoke).toHaveBeenCalledWith('create_cue_point', { request });
    });
  });

  describe('useGetCuePoints', () => {
    it('debería obtener lista de cue points', async () => {
      const mockCuePoints: CuePoint[] = [
        {
          id: 1,
          trackId: 1,
          position: 10.5,
          label: 'Intro',
          color: '#00ff00',
          type: 'intro',
          hotkey: 1,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          trackId: 1,
          position: 60.0,
          label: 'Drop',
          color: '#ff0000',
          type: 'drop',
          createdAt: '2024-01-01T00:01:00Z',
        },
      ];

      mockInvoke.mockResolvedValueOnce(mockCuePoints);

      const { result } = renderHook(() => useGetCuePoints(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockCuePoints);
      expect(result.current.data).toHaveLength(2);
    });
  });

  describe('useUpdateCuePoint', () => {
    it('debería actualizar cue point correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useUpdateCuePoint(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 1,
        trackId: 1,
        request: { position: 35.0, label: 'New Drop' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockInvoke).toHaveBeenCalledWith('update_cue_point', {
        id: 1,
        request: { position: 35.0, label: 'New Drop' },
      });
    });
  });

  describe('useDeleteCuePoint', () => {
    it('debería eliminar cue point correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteCuePoint(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 1, trackId: 1 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockInvoke).toHaveBeenCalledWith('delete_cue_point', { id: 1 });
    });
  });
});

describe('Loop Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreateLoop', () => {
    it('debería crear loop correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(10); // ID del nuevo loop

      const { result } = renderHook(() => useCreateLoop(), {
        wrapper: createWrapper(),
      });

      const request = {
        trackId: 1,
        label: '8 bar loop',
        loopStart: 30.0,
        loopEnd: 46.0,
        isActive: true,
      };

      result.current.mutate(request);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe(10);
      expect(mockInvoke).toHaveBeenCalledWith('create_loop', { request });
    });
  });

  describe('useGetLoops', () => {
    it('debería obtener lista de loops', async () => {
      const mockLoops: Loop[] = [
        {
          id: 1,
          trackId: 1,
          label: '4 bar loop',
          loopStart: 10.0,
          loopEnd: 18.0,
          isActive: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          trackId: 1,
          label: '8 bar loop',
          loopStart: 30.0,
          loopEnd: 46.0,
          isActive: true,
          createdAt: '2024-01-01T00:01:00Z',
        },
      ];

      mockInvoke.mockResolvedValueOnce(mockLoops);

      const { result } = renderHook(() => useGetLoops(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockLoops);
      expect(result.current.data).toHaveLength(2);
    });
  });

  describe('useUpdateLoop', () => {
    it('debería actualizar loop correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useUpdateLoop(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 1,
        trackId: 1,
        request: { isActive: true, label: 'Updated loop' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockInvoke).toHaveBeenCalledWith('update_loop', {
        id: 1,
        request: { isActive: true, label: 'Updated loop' },
      });
    });
  });
});
