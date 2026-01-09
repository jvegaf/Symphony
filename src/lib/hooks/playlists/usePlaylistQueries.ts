/**
 * Playlist Queries - Hooks de solo lectura para playlists (Svelte version)
 * 
 * AIDEV-NOTE: Migrado de React hooks a TanStack Svelte Query
 * - Usa createQuery de @tanstack/svelte-query
 * - Retorna stores reactivos en lugar de objetos planos
 * - Compatible con runes de Svelte 5
 */
import { createQuery } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import type { Playlist } from '../../../types/playlist';
import type { Track } from '../../../types/library';

/**
 * Hook para obtener todas las playlists
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useGetPlaylists } from '@/lib/hooks/playlists';
 *   
 *   const playlistsQuery = useGetPlaylists();
 *   const playlists = $derived($playlistsQuery.data ?? []);
 *   const isLoading = $derived($playlistsQuery.isLoading);
 * </script>
 * 
 * {#if isLoading}
 *   Loading playlists...
 * {:else}
 *   {#each playlists as playlist}
 *     <div>{playlist.name}</div>
 *   {/each}
 * {/if}
 * ```
 */
export const useGetPlaylists = () => {
	return createQuery<Playlist[], Error>(() => ({
		queryKey: ['playlists'],
		queryFn: async () => {
			try {
				const result = await invoke<Playlist[]>('get_playlists');
				return result;
			} catch (error) {
				console.error('Error al obtener playlists:', error);
				return [];
			}
		},
		staleTime: 5 * 60 * 1000 // 5 minutos
	}));
};

/**
 * Hook para obtener una playlist específica por ID
 * 
 * @param id - Función que retorna el ID de la playlist (UUID string)
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   let playlistId = $state('uuid-here');
 *   const playlistQuery = useGetPlaylist(() => playlistId);
 *   const playlist = $derived($playlistQuery.data);
 * </script>
 * ```
 */
export const useGetPlaylist = (id: () => string) => {
	return createQuery<Playlist, Error>(() => ({
		queryKey: ['playlists', id()],
		queryFn: async () => {
			const result = await invoke<Playlist>('get_playlist', { id: id() });
			return result;
		},
		enabled: Boolean(id()),
		staleTime: 2 * 60 * 1000 // 2 minutos
	}));
};

/**
 * Hook para obtener los tracks de una playlist
 * 
 * @param playlistId - Función que retorna el ID de la playlist (UUID string)
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   let playlistId = $state('uuid-here');
 *   const tracksQuery = useGetPlaylistTracks(() => playlistId);
 *   const tracks = $derived($tracksQuery.data ?? []);
 * </script>
 * 
 * {#each tracks as track}
 *   <div>{track.title} - {track.artist}</div>
 * {/each}
 * ```
 */
export const useGetPlaylistTracks = (playlistId: () => string) => {
	return createQuery<Track[], Error>(() => ({
		queryKey: ['playlists', playlistId(), 'tracks'],
		queryFn: async () => {
			try {
				const result = await invoke<Track[]>('get_playlist_tracks_cmd', {
					playlistId: playlistId()
				});
				return result;
			} catch (error) {
				console.error('Error al obtener tracks de playlist:', error);
				return [];
			}
		},
		enabled: Boolean(playlistId()),
		staleTime: 2 * 60 * 1000 // 2 minutos
	}));
};
