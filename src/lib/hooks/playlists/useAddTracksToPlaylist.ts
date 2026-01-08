/**
 * Playlist Batch Operations - Add multiple tracks to playlists
 * AIDEV-NOTE: Usa comandos batch para mejor rendimiento cuando se agregan múltiples tracks
 */
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';

export interface AddTracksToPlaylistRequest {
	/** ID de la playlist destino */
	playlistId: string;
	/** IDs de los tracks a agregar */
	trackIds: string[];
}

export interface CreatePlaylistWithTracksRequest {
	/** Nombre de la nueva playlist */
	name: string;
	/** Descripción opcional */
	description?: string | null;
	/** IDs de los tracks a agregar */
	trackIds: string[];
}

/**
 * Hook para agregar múltiples tracks a una playlist existente
 * Retorna el número de tracks agregados exitosamente
 * 
 * AIDEV-NOTE: Usa el comando batch add_tracks_to_playlist para mejor rendimiento
 * que agregar tracks uno por uno
 */
export const useAddTracksToPlaylist = () => {
	const queryClient = useQueryClient();

	return createMutation<number, Error, AddTracksToPlaylistRequest>(() => ({
		mutationFn: async ({ playlistId, trackIds }: AddTracksToPlaylistRequest) => {
			// AIDEV-NOTE: Tauri 2.0 usa camelCase para los parámetros en JavaScript
			return await invoke<number>('add_tracks_to_playlist', {
				playlistId,
				trackIds
			});
		},
		onSuccess: (_data: unknown, variables: AddTracksToPlaylistRequest) => {
			// Invalidar cache de tracks de la playlist
			queryClient.invalidateQueries({
				queryKey: ['playlists', variables.playlistId, 'tracks']
			});
			// También invalidar la lista de playlists (por si mostramos track count)
			queryClient.invalidateQueries({
				queryKey: ['playlists']
			});
			// Invalidar playlist individual por si cambia el track count
			queryClient.invalidateQueries({
				queryKey: ['playlists', 'byId', variables.playlistId]
			});
		}
	}));
};

/**
 * Hook para crear una playlist y agregar tracks en una sola operación
 * Retorna el ID de la playlist creada
 * 
 * AIDEV-NOTE: Operación atómica - crea playlist y agrega todos los tracks
 * en una sola transacción. Ideal para "Agregar a Nuevo Playlist"
 */
export const useCreatePlaylistWithTracks = () => {
	const queryClient = useQueryClient();

	return createMutation<string, Error, CreatePlaylistWithTracksRequest>(() => ({
		mutationFn: async ({ name, description, trackIds }: CreatePlaylistWithTracksRequest) => {
			// AIDEV-NOTE: Tauri 2.0 usa camelCase para los parámetros en JavaScript
			return await invoke<string>('create_playlist_with_tracks', {
				name,
				description: description ?? null,
				trackIds
			});
		},
		onSuccess: () => {
			// Invalidar cache de playlists para mostrar la nueva
			queryClient.invalidateQueries({
				queryKey: ['playlists']
			});
		}
	}));
};
