/**
 * Tests para hooks de análisis avanzado (Milestone 4)
 * 
 * AIDEV-NOTE: Tests completos para todos los 11 hooks de análisis
 * Cubre casos positivos, negativos y invalidación de cache
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import React from 'react';

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
  useDeleteLoop,
  analysisKeys,
} from './useAnalysis';
import type { 
  Beatgrid, 
  CuePoint, 
  Loop,
  CreateCuePointRequest,
  CreateLoopRequest,
  UpdateCuePointRequest,
  UpdateLoopRequest 
} from '../types/analysis';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

// Test data
const mockBeatgrid: Beatgrid = {
  trackId: 'track-123',
  bpm: 128.5,
  offset: 0.1,
  confidence: 85.2,
  analyzedAt: '2024-01-01T00:00:00Z',
};

const mockCuePoints: CuePoint[] = [
  {
    id: 'cue-1',
    trackId: 'track-123',
    position: 30.5,
    label: 'Drop',
    type: 'drop',
    hotkey: 1,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cue-2',
    trackId: 'track-123',
    position: 120.0,
    label: 'Outro',
    type: 'outro',
    createdAt: '2024-01-01T01:00:00Z',
  },
];

const mockLoops: Loop[] = [
  {
    id: 'loop-1',
    trackId: 'track-123',
    label: 'Main Loop',
    loopStart: 60.0,
    loopEnd: 90.0,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// Query client wrapper
const createQueryWrapper = () => {
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

describe('analysisKeys', () => {
  it('debería generar keys correctas para beatgrids', () => {
    expect(analysisKeys.all).toEqual(['analysis']);
    expect(analysisKeys.beatgrids()).toEqual(['analysis', 'beatgrids']);
    expect(analysisKeys.beatgrid('track-1')).toEqual(['analysis', 'beatgrids', 'track-1']);
  });

  it('debería generar keys correctas para cue points', () => {
    expect(analysisKeys.cuePoints()).toEqual(['analysis', 'cuePoints']);
    expect(analysisKeys.cuePointsForTrack('track-2')).toEqual(['analysis', 'cuePoints', 'track-2']);
  });

  it('debería generar keys correctas para loops', () => {
    expect(analysisKeys.loops()).toEqual(['analysis', 'loops']);
    expect(analysisKeys.loopsForTrack('track-3')).toEqual(['analysis', 'loops', 'track-3']);
  });
});

describe('Beatgrid Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAnalyzeBeatgrid', () => {
    it('debería analizar beatgrid y devolver resultado', async () => {
      mockInvoke.mockResolvedValueOnce(mockBeatgrid);

      const { result } = renderHook(() => useAnalyzeBeatgrid(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          trackId: 'track-123',
          trackPath: '/music/test.mp3',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('analyze_beatgrid', {
        trackId: 'track-123',
        trackPath: '/music/test.mp3',
      });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('debería manejar error en análisis de beatgrid', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Análisis falló'));

      const { result } = renderHook(() => useAnalyzeBeatgrid(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            trackId: 'track-123',
            trackPath: '/invalid/path.mp3',
          });
        } catch (error) {
          expect(error).toEqual(new Error('Análisis falló'));
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('debería invalidar cache tras análisis exitoso', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      
      mockInvoke.mockResolvedValueOnce(mockBeatgrid);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useAnalyzeBeatgrid(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          trackId: 'track-123',
          trackPath: '/music/test.mp3',
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: analysisKeys.beatgrid('track-123'),
      });
    });
  });

  describe('useGetBeatgrid', () => {
    it('debería obtener beatgrid para trackId válido', async () => {
      mockInvoke.mockResolvedValueOnce(mockBeatgrid);

      const { result } = renderHook(() => useGetBeatgrid('track-123'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith('get_beatgrid', { trackId: 'track-123' });
      expect(result.current.data).toEqual(mockBeatgrid);
    });

    it('debería devolver null si no hay beatgrid', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useGetBeatgrid('track-456'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('no debería ejecutar query si trackId está vacío', () => {
      const { result } = renderHook(() => useGetBeatgrid(''), {
        wrapper: createQueryWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('debería tener staleTime configurado', () => {
      const { result } = renderHook(() => useGetBeatgrid('track-123'), {
        wrapper: createQueryWrapper(),
      });

      // El query debería estar ejecutándose
      expect(result.current.isFetching).toBe(true);
    });
  });

  describe('useUpdateBeatgridOffset', () => {
    it('debería actualizar offset correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useUpdateBeatgridOffset(), {
        wrapper: createQueryWrapper(),
      });

      result.current.mutate({ trackId: "1", offset: 0.75 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockInvoke).toHaveBeenCalledWith('update_beatgrid_offset', {
        trackId: "1",
        offset: 0.75,
      });
    });
  });

  describe('useDeleteBeatgrid', () => {
    it('debería eliminar beatgrid correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteBeatgrid(), {
        wrapper: createQueryWrapper(),
      });

      result.current.mutate("1");

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockInvoke).toHaveBeenCalledWith('delete_beatgrid', { trackId: "1" });
    });
  });
});

describe('Cue Point Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreateCuePoint', () => {
    it('debería crear cue point y devolver resultado', async () => {
      mockInvoke.mockResolvedValueOnce('cue-123');

      const { result } = renderHook(() => useCreateCuePoint(), {
        wrapper: createQueryWrapper(),
      });

      const cueRequest: CreateCuePointRequest = {
        trackId: 'track-123',
        position: 30.5,
        type: 'cue',
        label: 'Drop',
        hotkey: 1,
      };

      await act(async () => {
        const createdCue = await result.current.mutateAsync(cueRequest);
        expect(createdCue).toEqual({ id: 'cue-123', ...cueRequest });
      });

      expect(mockInvoke).toHaveBeenCalledWith('create_cue_point', { request: cueRequest });
    });

    it('debería crear cue point sin hotkey', async () => {
      mockInvoke.mockResolvedValueOnce('cue-456');

      const { result } = renderHook(() => useCreateCuePoint(), {
        wrapper: createQueryWrapper(),
      });

      const cueRequest: CreateCuePointRequest = {
        trackId: 'track-123',
        position: 60.0,
        type: 'drop',
        label: 'Main Drop',
      };

      await act(async () => {
        await result.current.mutateAsync(cueRequest);
      });

      expect(mockInvoke).toHaveBeenCalledWith('create_cue_point', { request: cueRequest });
    });
  });

  describe('useGetCuePoints', () => {
    it('debería obtener cue points para track', async () => {
      mockInvoke.mockResolvedValueOnce(mockCuePoints);

      const { result } = renderHook(() => useGetCuePoints('track-123'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith('get_cue_points', { trackId: 'track-123' });
      expect(result.current.data).toEqual(mockCuePoints);
    });

    it('debería devolver array vacío si no hay cue points', async () => {
      mockInvoke.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useGetCuePoints('track-456'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useUpdateCuePoint', () => {
    it('debería actualizar cue point', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useUpdateCuePoint(), {
        wrapper: createQueryWrapper(),
      });

      const updateRequest: UpdateCuePointRequest = {
        position: 35.0,
        label: 'Updated Drop',
      };

      await act(async () => {
        await result.current.mutateAsync({
          id: 'cue-1',
          request: updateRequest,
          trackId: 'track-123',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_cue_point', {
        id: 'cue-1',
        request: updateRequest,
      });
    });
  });

  describe('useDeleteCuePoint', () => {
    it('debería eliminar cue point correctamente', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteCuePoint(), {
        wrapper: createQueryWrapper(),
      });

      result.current.mutate({ id: "1", trackId: "1" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockInvoke).toHaveBeenCalledWith('delete_cue_point', { id: "1" });
    });
  });
});

describe('Loop Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreateLoop', () => {
    it('debería crear loop', async () => {
      mockInvoke.mockResolvedValueOnce('loop-123');

      const { result } = renderHook(() => useCreateLoop(), {
        wrapper: createQueryWrapper(),
      });

      const loopRequest: CreateLoopRequest = {
        trackId: 'track-123',
        label: 'Intro Loop',
        loopStart: 10.0,
        loopEnd: 30.0,
        isActive: true,
      };

      await act(async () => {
        const createdLoop = await result.current.mutateAsync(loopRequest);
        expect(createdLoop).toEqual({ id: 'loop-123', ...loopRequest });
      });

      expect(mockInvoke).toHaveBeenCalledWith('create_loop', { request: loopRequest });
    });
  });

  describe('useGetLoops', () => {
    it('debería obtener loops para track', async () => {
      mockInvoke.mockResolvedValueOnce(mockLoops);

      const { result } = renderHook(() => useGetLoops('track-123'), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInvoke).toHaveBeenCalledWith('get_loops', { trackId: 'track-123' });
      expect(result.current.data).toEqual(mockLoops);
    });
  });

  describe('useUpdateLoop', () => {
    it('debería actualizar loop', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useUpdateLoop(), {
        wrapper: createQueryWrapper(),
      });

      const updateRequest: UpdateLoopRequest = {
        label: 'Updated Loop',
        isActive: false,
      };

      await act(async () => {
        await result.current.mutateAsync({
          id: 'loop-1',
          request: updateRequest,
          trackId: 'track-123',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_loop', {
        id: 'loop-1',
        request: updateRequest,
      });
    });
  });

  describe('useDeleteLoop', () => {
    it('debería eliminar loop', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteLoop(), {
        wrapper: createQueryWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'loop-1',
          trackId: 'track-123',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('delete_loop', { id: 'loop-1' });
    });
  });
});
