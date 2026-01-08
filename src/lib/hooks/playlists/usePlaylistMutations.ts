/**
 * Playlist Mutations - Hooks de escritura para playlists (Svelte version)
 * 
 * AIDEV-NOTE: Migrado de React hooks a TanStack Svelte Query
 * - createMutation en lugar de useMutation
 * - Retorna stores reactivos
 * - Compatible con Svelte 5 runes
 * - Incluye optimistic updates para mejor UX
 */
import { invoke } from '@tauri-apps/api/core';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import type {
	CreatePlaylistRequest,
	UpdatePlaylistRequest,
	AddTrackToPlaylistRequest,
	RemoveTrackFromPlaylistRequest,
	ReorderPlaylistTracksRequest,
	Playlist
} from '../../../types/playlist';

// Re-exportar tipos para compatibilidad con imports existentes
export type {
	CreatePlaylistRequest,
	UpdatePlaylistRequest,
	AddTrackToPlaylistRequest,
	RemoveTrackFromPlaylistRequest,
	ReorderPlaylistTracksRequest
} from '../../../types/playlist';

/**
 * Hook para crear una nueva playlist
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const createPlaylist = useCreatePlaylist();
 *   
 *   function handleCreate() {
 *     $createPlaylist.mutate({
 *       name: 'Mi Nueva Playlist',
 *       description: 'Descripción opcional'
 *     });
 *   }
 * </script>
 * ```
 */
export const useCreatePlaylist = () => {
	const queryClient = useQueryClient();

	return createMutation<number, Error, CreatePlaylistRequest>(() => ({
		mutationFn: async (request: CreatePlaylistRequest) => {
			return await invoke<number>('create_playlist', {
				name: request.name,
				description: request.description
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['playlists'] });
		}
	}));
};

/**
 * Hook para actualizar una playlist existente
 * 
 * AIDEV-NOTE: Usa optimistic update para respuesta UI instantánea.
 * El nombre se actualiza visualmente de inmediato.
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const updatePlaylist = useUpdatePlaylist();
 *   
 *   function saveChanges(id: string, name: string) {
 *     $updatePlaylist.mutate({ id, name });
 *   }
 * </script>
 * ```
 */
export const useUpdatePlaylist = () => {
	const queryClient = useQueryClient();

	return createMutation<void, Error, UpdatePlaylistRequest, { previousPlaylists?: Playlist[] }>(
		() => ({
			mutationFn: async (request: UpdatePlaylistRequest) => {
				return await invoke('update_playlist', {
					id: request.id,
					name: request.name,
					description: request.description
				});
			},
			onMutate: async (updatedPlaylist: UpdatePlaylistRequest) => {
				// Cancelar queries en vuelo
				await queryClient.cancelQueries({ queryKey: ['playlists'] });

				// Snapshot del estado anterior
				const previousPlaylists = queryClient.getQueryData<Playlist[]>(['playlists']);

				// Optimistic update: actualizar nombre inmediatamente
				queryClient.setQueryData<Playlist[]>(['playlists'], (old) =>
					old?.map((p) =>
						p.id === updatedPlaylist.id
							? {
									...p,
									name: updatedPlaylist.name,
									description: updatedPlaylist.description ?? p.description
								}
							: p
					) ?? []
				);

				return { previousPlaylists };
			},
			onError: (
				_err: Error,
				_variables: UpdatePlaylistRequest,
				context?: { previousPlaylists?: Playlist[] }
			) => {
				// Rollback al estado anterior si hay error
				if (context?.previousPlaylists) {
					queryClient.setQueryData(['playlists'], context.previousPlaylists);
				}
			},
			onSettled: (_data: unknown, _error: unknown, variables: UpdatePlaylistRequest) => {
				// Refetch para sincronizar
				queryClient.invalidateQueries({ queryKey: ['playlists'] });
				queryClient.invalidateQueries({ queryKey: ['playlists', variables.id] });
			}
		})
	);
};

/**
 * Hook para eliminar una playlist
 * 
 * AIDEV-NOTE: Usa optimistic update para respuesta UI instantánea.
 * La playlist se elimina visualmente de inmediato, y si hay error
 * se restaura el estado anterior.
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const deletePlaylist = useDeletePlaylist();
 *   
 *   function handleDelete(id: string) {
 *     if (confirm('¿Eliminar playlist?')) {
 *       $deletePlaylist.mutate(id);
 *     }
 *   }
 * </script>
 * ```
 */
export const useDeletePlaylist = () => {
	const queryClient = useQueryClient();

	return createMutation<void, Error, string, { previousPlaylists?: Playlist[] }>(() => ({
		mutationFn: async (id: string) => {
			return await invoke('delete_playlist', { id });
		},
		onMutate: async (deletedId: string) => {
			// Cancelar queries en vuelo para evitar sobrescribir optimistic update
			await queryClient.cancelQueries({ queryKey: ['playlists'] });

			// Snapshot del estado anterior (para rollback si hay error)
			const previousPlaylists = queryClient.getQueryData<Playlist[]>(['playlists']);

			// Optimistic update: eliminar inmediatamente del cache
			queryClient.setQueryData<Playlist[]>(
				['playlists'],
				(old) => old?.filter((p) => p.id !== deletedId) ?? []
			);

			return { previousPlaylists };
		},
		onError: (
			_err: Error,
			_deletedId: string,
			context?: { previousPlaylists?: Playlist[] }
		) => {
			// Rollback al estado anterior si hay error
			if (context?.previousPlaylists) {
				queryClient.setQueryData(['playlists'], context.previousPlaylists);
			}
		},
		onSettled: () => {
			// Refetch para sincronizar con el backend
			queryClient.invalidateQueries({ queryKey: ['playlists'] });
		}
	}));
};

/**
 * Hook para agregar un track a una playlist
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const addTrack = useAddTrackToPlaylist();
 *   
 *   function handleAdd(playlistId: string, trackId: string) {
 *     $addTrack.mutate({ playlistId, trackId });
 *   }
 * </script>
 * ```
 */
export const useAddTrackToPlaylist = () => {
	const queryClient = useQueryClient();

	return createMutation<void, Error, AddTrackToPlaylistRequest>(() => ({
		mutationFn: async (request: AddTrackToPlaylistRequest) => {
			// AIDEV-NOTE: Tauri 2.0 usa camelCase para parámetros en JavaScript
			return await invoke('add_track_to_playlist', {
				playlistId: request.playlistId,
				trackId: request.trackId
			});
		},
		onSuccess: (_data: unknown, variables: AddTrackToPlaylistRequest) => {
			queryClient.invalidateQueries({
				queryKey: ['playlists', variables.playlistId, 'tracks']
			});
		}
	}));
};

/**
 * Hook para remover un track de una playlist
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const removeTrack = useRemoveTrackFromPlaylist();
 *   
 *   function handleRemove(playlistId: string, trackId: string) {
 *     $removeTrack.mutate({ playlistId, trackId });
 *   }
 * </script>
 * ```
 */
export const useRemoveTrackFromPlaylist = () => {
	const queryClient = useQueryClient();

	return createMutation<void, Error, RemoveTrackFromPlaylistRequest>(() => ({
		mutationFn: async (request: RemoveTrackFromPlaylistRequest) => {
			// AIDEV-NOTE: Tauri 2.0 usa camelCase para parámetros en JavaScript
			return await invoke('remove_track_from_playlist', {
				playlistId: request.playlistId,
				trackId: request.trackId
			});
		},
		onSuccess: (_data: unknown, variables: RemoveTrackFromPlaylistRequest) => {
			queryClient.invalidateQueries({
				queryKey: ['playlists', variables.playlistId, 'tracks']
			});
		}
	}));
};

/**
 * Hook para reordenar tracks en una playlist
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const reorderTracks = useReorderPlaylistTracks();
 *   
 *   function handleReorder(playlistId: string, trackIds: string[]) {
 *     $reorderTracks.mutate({ playlistId, trackIds });
 *   }
 * </script>
 * ```
 */
export const useReorderPlaylistTracks = () => {
	const queryClient = useQueryClient();

	return createMutation<void, Error, ReorderPlaylistTracksRequest>(() => ({
		mutationFn: async (request: ReorderPlaylistTracksRequest) => {
			// AIDEV-NOTE: Tauri 2.0 usa camelCase para parámetros en JavaScript
			return await invoke('reorder_playlist_tracks', {
				playlistId: request.playlistId,
				trackIds: request.trackIds
			});
		},
		onSuccess: (_data: unknown, variables: ReorderPlaylistTracksRequest) => {
			queryClient.invalidateQueries({
				queryKey: ['playlists', variables.playlistId, 'tracks']
			});
		}
	}));
};
