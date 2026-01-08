/**
 * Library Queries - Hooks de solo lectura para biblioteca (Svelte version)
 * 
 * AIDEV-NOTE: Migrado de React hooks a TanStack Svelte Query
 * - Usa createQuery de @tanstack/svelte-query
 * - Retorna stores reactivos en lugar de objetos planos
 * - Compatible con runes de Svelte 5
 */
import { createQuery } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import type { LibraryStats, Track } from '../../../types/library';

/**
 * Hook para obtener todas las pistas de la biblioteca
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useGetAllTracks } from '$lib/hooks/library';
 *   
 *   const tracksQuery = useGetAllTracks();
 *   const tracks = $derived($tracksQuery.data ?? []);
 *   const isLoading = $derived($tracksQuery.isLoading);
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else}
 *   {#each tracks as track}
 *     <div>{track.title}</div>
 *   {/each}
 * {/if}
 * ```
 */
export const useGetAllTracks = () => {
	return createQuery<Track[], Error>(() => ({
		queryKey: ['tracks', 'all'],
		queryFn: async () => {
			try {
				const tracks = await invoke<Track[]>('get_all_tracks');
				return tracks;
			} catch (error) {
				console.warn('Error fetching tracks:', error);
				return []; // Retornar array vacío en caso de error
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutos
		retry: false // No reintentar automáticamente
	}));
};

/**
 * Hook para buscar pistas
 * 
 * @param query - Función que retorna el término de búsqueda
 * @param enabled - Función que retorna si la búsqueda está habilitada
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   let searchQuery = $state('');
 *   const searchResults = useSearchTracks(() => searchQuery, () => searchQuery.length > 0);
 *   const tracks = $derived($searchResults.data ?? []);
 * </script>
 * ```
 */
export const useSearchTracks = (query: () => string, enabled: () => boolean = () => true) => {
	return createQuery<Track[], Error>(() => ({
		queryKey: ['tracks', 'search', query()],
		queryFn: async () => {
			const tracks = await invoke<Track[]>('search_tracks', { query: query() });
			return tracks;
		},
		enabled: enabled() && query().length > 0,
		staleTime: 2 * 60 * 1000 // 2 minutos
	}));
};

/**
 * Hook para obtener una pista por ID
 * 
 * @param id - Función que retorna el ID de la pista (UUID)
 * @param enabled - Función que retorna si la query está habilitada
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   let trackId = $state('550e8400-e29b-41d4-a716-446655440000');
 *   const trackQuery = useGetTrack(() => trackId);
 *   const track = $derived($trackQuery.data);
 * </script>
 * ```
 */
export const useGetTrack = (id: () => string, enabled: () => boolean = () => true) => {
	return createQuery<Track, Error>(() => {
		const trackId = id();
		const isValidId = trackId.length > 0 && trackId !== '0';
		
		return {
			queryKey: ['tracks', 'byId', trackId],
			queryFn: async () => {
				const track = await invoke<Track>('get_track_by_id', { id: trackId });
				return track;
			},
			enabled: enabled() && isValidId,
			staleTime: 10 * 60 * 1000 // 10 minutos
		};
	});
};

/**
 * Hook para obtener estadísticas de la biblioteca
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const statsQuery = useLibraryStats();
 *   const stats = $derived($statsQuery.data);
 * </script>
 * 
 * <p>Total tracks: {stats?.totalTracks ?? 0}</p>
 * ```
 */
export const useLibraryStats = () => {
	return createQuery<LibraryStats, Error>(() => ({
		queryKey: ['library-stats'],
		queryFn: async () => {
			try {
				const stats = await invoke<LibraryStats>('get_library_stats');
				return stats;
			} catch (error) {
				console.warn('Error fetching library stats:', error);
				// Retornar estadísticas vacías en caso de error
				return {
					totalTracks: 0,
					totalArtists: 0,
					totalAlbums: 0,
					totalDurationHours: 0,
					totalSizeGb: 0,
					ratingDistribution: [0, 0, 0, 0, 0, 0]
				};
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutos
		retry: false
	}));
};
