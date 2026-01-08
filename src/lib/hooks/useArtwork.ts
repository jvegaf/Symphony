/**
 * Artwork Hooks - TanStack Svelte Query hooks for track artwork
 * 
 * AIDEV-NOTE: Maneja la carga y cache de artwork (album covers) para tracks
 * El artwork es una imagen en base64 data URL o null si no hay artwork
 */

import { createQuery } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';

/**
 * Obtiene el artwork de un track
 * AIDEV-NOTE: Usa accessor function para trackId reactivo
 * Retorna data URL (base64) o null si no hay artwork
 * 
 * @param trackId - Accessor function que retorna el UUID del track
 * @returns Query con artwork como string (data URL) o null
 */
export const useGetTrackArtwork = (trackId: () => string) => {
	return createQuery<string | null, Error>(() => ({
		queryKey: ['artwork', trackId()],
		queryFn: async () => {
			const id = trackId();
			if (!id) return null;
			return await invoke<string | null>('get_track_artwork', { id });
		},
		enabled: Boolean(trackId()),
		staleTime: 10 * 60 * 1000, // 10 minutos - artwork no cambia frecuentemente
		gcTime: 30 * 60 * 1000 // 30 minutos en cache
	}));
};
