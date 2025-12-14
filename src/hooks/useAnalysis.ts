/**
 * Hooks de TanStack Query para análisis avanzado (Milestone 4)
 * 
 * Gestiona beatgrids, cue points y loops con cache y sincronización
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import {
  Beatgrid,
  AnalyzeBeatgridParams,
  UpdateBeatgridOffsetParams,
  CuePoint,
  CreateCuePointRequest,
  UpdateCuePointRequest,
  Loop,
  CreateLoopRequest,
  UpdateLoopRequest,
} from '../types/analysis';

// ============================================================================
// Query Keys
// ============================================================================

export const analysisKeys = {
  all: ['analysis'] as const,
  beatgrids: () => [...analysisKeys.all, 'beatgrids'] as const,
  beatgrid: (trackId: number) => [...analysisKeys.beatgrids(), trackId] as const,
  cuePoints: () => [...analysisKeys.all, 'cuePoints'] as const,
  cuePointsForTrack: (trackId: number) => [...analysisKeys.cuePoints(), trackId] as const,
  loops: () => [...analysisKeys.all, 'loops'] as const,
  loopsForTrack: (trackId: number) => [...analysisKeys.loops(), trackId] as const,
};

// ============================================================================
// Beatgrid Hooks
// ============================================================================

/**
 * Analiza beatgrid de una pista automáticamente
 * 
 * Ejecuta detección de BPM en background y guarda resultados
 */
export const useAnalyzeBeatgrid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trackId, trackPath }: AnalyzeBeatgridParams) => {
      return await invoke<Beatgrid>('analyze_beatgrid', { trackId, trackPath });
    },
    onSuccess: (data) => {
      // Invalidar beatgrid de la pista
      queryClient.invalidateQueries({ queryKey: analysisKeys.beatgrid(data.trackId) });
    },
  });
};

/**
 * Obtiene beatgrid de una pista
 */
export const useGetBeatgrid = (trackId: number) => {
  return useQuery({
    queryKey: analysisKeys.beatgrid(trackId),
    queryFn: async () => {
      return await invoke<Beatgrid | null>('get_beatgrid', { trackId });
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - beatgrids no cambian frecuentemente
  });
};

/**
 * Actualiza offset del beatgrid (ajuste manual)
 */
export const useUpdateBeatgridOffset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trackId, offset }: UpdateBeatgridOffsetParams) => {
      await invoke('update_beatgrid_offset', { trackId, offset });
    },
    onSuccess: (_, { trackId }) => {
      // Invalidar beatgrid de la pista
      queryClient.invalidateQueries({ queryKey: analysisKeys.beatgrid(trackId) });
    },
  });
};

/**
 * Elimina beatgrid de una pista
 */
export const useDeleteBeatgrid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackId: number) => {
      await invoke('delete_beatgrid', { trackId });
    },
    onSuccess: (_, trackId) => {
      // Invalidar beatgrid de la pista
      queryClient.invalidateQueries({ queryKey: analysisKeys.beatgrid(trackId) });
    },
  });
};

// ============================================================================
// Cue Point Hooks
// ============================================================================

/**
 * Crea nuevo cue point
 */
export const useCreateCuePoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateCuePointRequest) => {
      const id = await invoke<number>('create_cue_point', { request });
      return { id, ...request };
    },
    onSuccess: (data) => {
      // Invalidar cue points de la pista
      queryClient.invalidateQueries({ 
        queryKey: analysisKeys.cuePointsForTrack(data.trackId) 
      });
    },
  });
};

/**
 * Obtiene cue points de una pista
 */
export const useGetCuePoints = (trackId: number) => {
  return useQuery({
    queryKey: analysisKeys.cuePointsForTrack(trackId),
    queryFn: async () => {
      return await invoke<CuePoint[]>('get_cue_points', { trackId });
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

/**
 * Actualiza cue point existente
 */
export const useUpdateCuePoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request, trackId }: { id: number; request: UpdateCuePointRequest; trackId: number }) => {
      await invoke('update_cue_point', { id, request });
      return { id, trackId };
    },
    onSuccess: (data) => {
      // Invalidar cue points de la pista
      queryClient.invalidateQueries({ 
        queryKey: analysisKeys.cuePointsForTrack(data.trackId) 
      });
    },
  });
};

/**
 * Elimina cue point
 */
export const useDeleteCuePoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trackId }: { id: number; trackId: number }) => {
      await invoke('delete_cue_point', { id });
      return trackId;
    },
    onSuccess: (trackId) => {
      // Invalidar cue points de la pista
      queryClient.invalidateQueries({ 
        queryKey: analysisKeys.cuePointsForTrack(trackId) 
      });
    },
  });
};

// ============================================================================
// Loop Hooks
// ============================================================================

/**
 * Crea nuevo loop
 */
export const useCreateLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateLoopRequest) => {
      const id = await invoke<number>('create_loop', { request });
      return { id, ...request };
    },
    onSuccess: (data) => {
      // Invalidar loops de la pista
      queryClient.invalidateQueries({ 
        queryKey: analysisKeys.loopsForTrack(data.trackId) 
      });
    },
  });
};

/**
 * Obtiene loops de una pista
 */
export const useGetLoops = (trackId: number) => {
  return useQuery({
    queryKey: analysisKeys.loopsForTrack(trackId),
    queryFn: async () => {
      return await invoke<Loop[]>('get_loops', { trackId });
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

/**
 * Actualiza loop existente
 */
export const useUpdateLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request, trackId }: { id: number; request: UpdateLoopRequest; trackId: number }) => {
      await invoke('update_loop', { id, request });
      return { id, trackId };
    },
    onSuccess: (data) => {
      // Invalidar loops de la pista
      queryClient.invalidateQueries({ 
        queryKey: analysisKeys.loopsForTrack(data.trackId) 
      });
    },
  });
};

/**
 * Elimina loop (no usado - se mantiene por completitud)
 */
export const useDeleteLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trackId }: { id: number; trackId: number }) => {
      await invoke('delete_loop', { id });
      return trackId;
    },
    onSuccess: (trackId) => {
      // Invalidar loops de la pista
      queryClient.invalidateQueries({ 
        queryKey: analysisKeys.loopsForTrack(trackId) 
      });
    },
  });
};
