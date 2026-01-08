/**
 * Library Mutations - Hooks de escritura para biblioteca (Svelte version)
 * 
 * AIDEV-NOTE: Migrado de React hooks a TanStack Svelte Query
 * - createMutation en lugar de useMutation
 * - Retorna stores reactivos
 * - Compatible con Svelte 5 runes
 */
import { invoke } from '@tauri-apps/api/core';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';

/**
 * Payload para actualizar metadatos de un track
 * AIDEV-NOTE: Debe coincidir con UpdateTrackMetadataRequest en Rust
 */
export interface UpdateTrackMetadataRequest {
	id: string;
	title?: string;
	artist?: string;
	album?: string;
	year?: number;
	genre?: string;
	bpm?: number;
	key?: string;
	rating?: number; // 0-5 estrellas
}

/**
 * Resultado de la eliminación de un track
 * AIDEV-NOTE: Debe coincidir con DeleteTrackResult en Rust
 */
export interface DeleteTrackResult {
	trackId: string;
	fileDeleted: boolean;
	filePath: string;
}

/**
 * Hook para actualizar rating de un track
 * 
 * AIDEV-NOTE: Actualiza tanto la DB como el archivo físico MP3 (frame POPM)
 * El backend convierte automáticamente 0-5 estrellas → 0-255 POPM
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const updateRating = useUpdateTrackRating();
 *   
 *   function handleRatingChange(trackId: string, rating: number) {
 *     $updateRating.mutate({ trackId, rating });
 *   }
 * </script>
 * ```
 */
export const useUpdateTrackRating = () => {
	const queryClient = useQueryClient();

	return createMutation<void, Error, { trackId: string; rating: number }>(() => ({
		mutationFn: async ({ trackId, rating }) => {
			// Validar rating en frontend (0-5)
			const clampedRating = Math.max(0, Math.min(rating, 5));

			const request: UpdateTrackMetadataRequest = {
				id: trackId,
				rating: clampedRating
			};

			await invoke<void>('update_track_metadata', { request });
		},
		onSuccess: (_data: unknown, variables: { trackId: string; rating: number }) => {
			// Invalidar queries para refrescar UI
			queryClient.invalidateQueries({ queryKey: ['tracks'] });
			queryClient.invalidateQueries({
				queryKey: ['tracks', 'byId', variables.trackId]
			});
			// Invalidar tracks de playlists (key: ["playlists", playlistId, "tracks"])
			// Usamos predicate para invalidar todos los tracks de todas las playlists
			queryClient.invalidateQueries({
				predicate: (query) => {
					const key = query.queryKey;
					return Array.isArray(key) && key[0] === 'playlists' && key[2] === 'tracks';
				}
			});
		},
		onError: (error: Error) => {
			console.error('Error updating track rating:', error);
		}
	}));
};

/**
 * Hook para actualizar metadatos completos de un track
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const updateMetadata = useUpdateTrackMetadata();
 *   
 *   function saveChanges() {
 *     $updateMetadata.mutate({
 *       id: "uuid",
 *       title: "New Title",
 *       artist: "New Artist",
 *       rating: 5
 *     });
 *   }
 * </script>
 * ```
 */
export const useUpdateTrackMetadata = () => {
	const queryClient = useQueryClient();

	return createMutation<void, Error, UpdateTrackMetadataRequest>(() => ({
		mutationFn: async (request) => {
			await invoke<void>('update_track_metadata', { request });
		},
		onSuccess: (_data: unknown, variables: UpdateTrackMetadataRequest) => {
			// Invalidar queries para refrescar UI
			queryClient.invalidateQueries({ queryKey: ['tracks'] });
			queryClient.invalidateQueries({
				queryKey: ['tracks', 'byId', variables.id]
			});
		},
		onError: (error: Error) => {
			console.error('Error updating track metadata:', error);
		}
	}));
};

/**
 * Hook para eliminar un track de la biblioteca y del disco
 * 
 * AIDEV-NOTE: Este hook elimina:
 * 1. El registro de la base de datos
 * 2. El archivo físico del disco
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const deleteTrack = useDeleteTrack();
 *   
 *   function handleDelete(trackId: string) {
 *     $deleteTrack.mutate(trackId, {
 *       onSuccess: (result) => {
 *         if (result.fileDeleted) {
 *           console.log(`Track y archivo eliminados: ${result.filePath}`);
 *         }
 *       }
 *     });
 *   }
 * </script>
 * ```
 */
export const useDeleteTrack = () => {
	const queryClient = useQueryClient();

	return createMutation<DeleteTrackResult, Error, string>(() => ({
		mutationFn: async (trackId: string) => {
			const result = await invoke<DeleteTrackResult>('delete_track', { id: trackId });
			return result;
		},
		onSuccess: (result: DeleteTrackResult) => {
			// Invalidar queries para refrescar UI
			queryClient.invalidateQueries({ queryKey: ['tracks'] });
			queryClient.invalidateQueries({ queryKey: ['library-stats'] });
			queryClient.invalidateQueries({ queryKey: ['tracks', 'byId', result.trackId] });

			console.log(
				`Track eliminado: ${result.trackId}, archivo borrado: ${result.fileDeleted}`
			);
		},
		onError: (error: Error) => {
			console.error('Error deleting track:', error);
		}
	}));
};
