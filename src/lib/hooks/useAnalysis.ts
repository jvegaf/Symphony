/**
 * Hooks de TanStack Svelte Query para análisis avanzado (Milestone 4)
 * 
 * AIDEV-NOTE: Migrado de React Query a Svelte Query
 * Gestiona beatgrids, cue points y loops con cache y sincronización
 * Migrado de number a string (UUID v4) para todos los IDs
 */

import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';

import type {
	AnalyzeBeatgridParams,
	Beatgrid,
	CreateCuePointRequest,
	CreateLoopRequest,
	CuePoint,
	Loop,
	UpdateBeatgridOffsetParams,
	UpdateCuePointRequest,
	UpdateLoopRequest
} from '@/types/analysis';

// ============================================================================
// Query Keys
// ============================================================================

export const analysisKeys = {
	all: ['analysis'] as const,
	beatgrids: () => [...analysisKeys.all, 'beatgrids'] as const,
	beatgrid: (trackId: string) => [...analysisKeys.beatgrids(), trackId] as const,
	cuePoints: () => [...analysisKeys.all, 'cuePoints'] as const,
	cuePointsForTrack: (trackId: string) => [...analysisKeys.cuePoints(), trackId] as const,
	loops: () => [...analysisKeys.all, 'loops'] as const,
	loopsForTrack: (trackId: string) => [...analysisKeys.loops(), trackId] as const
};

// ============================================================================
// Beatgrid Hooks
// ============================================================================

/**
 * Analiza beatgrid de una pista automáticamente
 * 
 * Ejecuta detección de BPM en background y guarda resultados
 * AIDEV-NOTE: Puede tardar varios segundos para archivos largos
 */
export const useAnalyzeBeatgrid = () => {
	const queryClient = useQueryClient();

	return createMutation<Beatgrid, Error, AnalyzeBeatgridParams>(() => ({
		mutationFn: async ({ trackId, trackPath }: AnalyzeBeatgridParams) => {
			return await invoke<Beatgrid>('analyze_beatgrid', { trackId, trackPath });
		},
		onSuccess: (data: Beatgrid) => {
			// Invalidar beatgrid de la pista
			queryClient.invalidateQueries({ queryKey: analysisKeys.beatgrid(data.trackId) });
		}
	}));
};

/**
 * Obtiene beatgrid de una pista
 * AIDEV-NOTE: Usa accessor function para trackId reactivo
 */
export const useGetBeatgrid = (trackId: () => string) => {
	return createQuery<Beatgrid | null, Error>(() => ({
		queryKey: [...analysisKeys.beatgrid(trackId())],
		queryFn: async () => {
			return await invoke<Beatgrid | null>('get_beatgrid', { trackId: trackId() });
		},
		// AIDEV-NOTE: Solo ejecutar si hay trackId válido
		enabled: trackId().length > 0,
		staleTime: 5 * 60 * 1000 // 5 minutos - beatgrids no cambian frecuentemente
	}));
};

/**
 * Actualiza offset del beatgrid (ajuste manual)
 * AIDEV-NOTE: Para afinar el beatgrid después de análisis automático
 */
export const useUpdateBeatgridOffset = () => {
	const queryClient = useQueryClient();

	return createMutation<void, Error, UpdateBeatgridOffsetParams>(() => ({
		mutationFn: async ({ trackId, offset }: UpdateBeatgridOffsetParams) => {
			await invoke('update_beatgrid_offset', { trackId, offset });
		},
		onSuccess: (_data: unknown, variables: UpdateBeatgridOffsetParams) => {
			// Invalidar beatgrid de la pista
			queryClient.invalidateQueries({ queryKey: analysisKeys.beatgrid(variables.trackId) });
		}
	}));
};

/**
 * Elimina beatgrid de una pista
 */
export const useDeleteBeatgrid = () => {
	const queryClient = useQueryClient();

	return createMutation<void, Error, string>(() => ({
		mutationFn: async (trackId: string) => {
			await invoke('delete_beatgrid', { trackId });
		},
		onSuccess: (_data: unknown, trackId: string) => {
			// Invalidar beatgrid de la pista
			queryClient.invalidateQueries({ queryKey: analysisKeys.beatgrid(trackId) });
		}
	}));
};

// ============================================================================
// Cue Point Hooks
// ============================================================================

/**
 * Crea nuevo cue point
 * AIDEV-NOTE: Retorna el cue point creado con su ID
 */
export const useCreateCuePoint = () => {
	const queryClient = useQueryClient();

	return createMutation<{ id: string } & CreateCuePointRequest, Error, CreateCuePointRequest>(
		() => ({
			mutationFn: async (request: CreateCuePointRequest) => {
				const id = await invoke<string>('create_cue_point', { request });
				return { id, ...request };
			},
			onSuccess: (data: { id: string } & CreateCuePointRequest) => {
				// Invalidar cue points de la pista
				queryClient.invalidateQueries({
					queryKey: analysisKeys.cuePointsForTrack(data.trackId)
				});
			}
		})
	);
};

/**
 * Obtiene cue points de una pista
 * AIDEV-NOTE: Usa accessor function para trackId reactivo
 */
export const useGetCuePoints = (trackId: () => string) => {
	return createQuery<CuePoint[], Error>(() => ({
		queryKey: [...analysisKeys.cuePointsForTrack(trackId())],
		queryFn: async () => {
			return await invoke<CuePoint[]>('get_cue_points', { trackId: trackId() });
		},
		staleTime: 2 * 60 * 1000 // 2 minutos
	}));
};

/**
 * Actualiza cue point existente
 */
export const useUpdateCuePoint = () => {
	const queryClient = useQueryClient();

	interface UpdateCuePointParams {
		id: string;
		request: UpdateCuePointRequest;
		trackId: string;
	}

	return createMutation<{ id: string; trackId: string }, Error, UpdateCuePointParams>(() => ({
		mutationFn: async ({ id, request }: UpdateCuePointParams) => {
			await invoke('update_cue_point', { id, request });
			return { id, trackId: '' }; // trackId será pasado en variables
		},
		onSuccess: (_data: unknown, variables: UpdateCuePointParams) => {
			// Invalidar cue points de la pista
			queryClient.invalidateQueries({
				queryKey: analysisKeys.cuePointsForTrack(variables.trackId)
			});
		}
	}));
};

/**
 * Elimina cue point
 */
export const useDeleteCuePoint = () => {
	const queryClient = useQueryClient();

	interface DeleteCuePointParams {
		id: string;
		trackId: string;
	}

	return createMutation<string, Error, DeleteCuePointParams>(() => ({
		mutationFn: async ({ id }: DeleteCuePointParams) => {
			await invoke('delete_cue_point', { id });
			return ''; // trackId será pasado en variables
		},
		onSuccess: (_data: unknown, variables: DeleteCuePointParams) => {
			// Invalidar cue points de la pista
			queryClient.invalidateQueries({
				queryKey: analysisKeys.cuePointsForTrack(variables.trackId)
			});
		}
	}));
};

// ============================================================================
// Loop Hooks
// ============================================================================

/**
 * Crea nuevo loop
 * AIDEV-NOTE: Retorna el loop creado con su ID
 */
export const useCreateLoop = () => {
	const queryClient = useQueryClient();

	return createMutation<{ id: string } & CreateLoopRequest, Error, CreateLoopRequest>(() => ({
		mutationFn: async (request: CreateLoopRequest) => {
			const id = await invoke<string>('create_loop', { request });
			return { id, ...request };
		},
		onSuccess: (data: { id: string } & CreateLoopRequest) => {
			// Invalidar loops de la pista
			queryClient.invalidateQueries({
				queryKey: analysisKeys.loopsForTrack(data.trackId)
			});
		}
	}));
};

/**
 * Obtiene loops de una pista
 * AIDEV-NOTE: Usa accessor function para trackId reactivo
 */
export const useGetLoops = (trackId: () => string) => {
	return createQuery<Loop[], Error>(() => ({
		queryKey: [...analysisKeys.loopsForTrack(trackId())],
		queryFn: async () => {
			return await invoke<Loop[]>('get_loops', { trackId: trackId() });
		},
		staleTime: 2 * 60 * 1000 // 2 minutos
	}));
};

/**
 * Actualiza loop existente
 */
export const useUpdateLoop = () => {
	const queryClient = useQueryClient();

	interface UpdateLoopParams {
		id: string;
		request: UpdateLoopRequest;
		trackId: string;
	}

	return createMutation<{ id: string; trackId: string }, Error, UpdateLoopParams>(() => ({
		mutationFn: async ({ id, request }: UpdateLoopParams) => {
			await invoke('update_loop', { id, request });
			return { id, trackId: '' }; // trackId será pasado en variables
		},
		onSuccess: (_data: unknown, variables: UpdateLoopParams) => {
			// Invalidar loops de la pista
			queryClient.invalidateQueries({
				queryKey: analysisKeys.loopsForTrack(variables.trackId)
			});
		}
	}));
};

/**
 * Elimina loop
 * AIDEV-NOTE: No usado frecuentemente - se mantiene por completitud
 */
export const useDeleteLoop = () => {
	const queryClient = useQueryClient();

	interface DeleteLoopParams {
		id: string;
		trackId: string;
	}

	return createMutation<string, Error, DeleteLoopParams>(() => ({
		mutationFn: async ({ id }: DeleteLoopParams) => {
			await invoke('delete_loop', { id });
			return ''; // trackId será pasado en variables
		},
		onSuccess: (_data: unknown, variables: DeleteLoopParams) => {
			// Invalidar loops de la pista
			queryClient.invalidateQueries({
				queryKey: analysisKeys.loopsForTrack(variables.trackId)
			});
		}
	}));
};
