/**
 * Utilidades centralizadas para invalidación de queries
 * Evita duplicación y garantiza consistencia en todo el proyecto
 * @module utils/queryInvalidation
 */
import type { QueryClient } from "@tanstack/react-query";

/**
 * Claves de query centralizadas para evitar strings mágicos
 */
export const QUERY_KEYS = Object.freeze({
  tracks: "tracks",
  libraryStats: "library-stats",
  playlists: "playlists",
  playlistTracks: "playlist-tracks",
  analysis: "analysis",
  track: "track",
} as const);

/**
 * Tipos para análisis (beatgrid, cuePoints, loops)
 */
export type AnalysisType = "beatgrid" | "cuePoints" | "loops";

/**
 * Opciones para invalidación de track
 */
export interface InvalidateTrackOptions {
  /** Si true, también invalida la lista completa de tracks */
  includeList?: boolean;
}

/**
 * Invalida todas las queries relacionadas con la biblioteca
 * Incluye: tracks, library-stats
 */
export async function invalidateLibrary(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tracks] });
  await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.libraryStats] });
}

/**
 * Invalida queries de playlists
 * @param queryClient - Cliente de TanStack Query
 * @param playlistId - ID opcional de playlist específica
 */
export async function invalidatePlaylists(
  queryClient: QueryClient,
  playlistId?: number
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.playlists] });

  if (playlistId !== undefined) {
    await queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.playlists, playlistId],
    });
  }
}

/**
 * Invalida tracks de una playlist específica
 * @param queryClient - Cliente de TanStack Query
 * @param playlistId - ID de la playlist
 */
export async function invalidatePlaylistTracks(
  queryClient: QueryClient,
  playlistId: number
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.playlistTracks, playlistId],
  });
}

/**
 * Invalida queries de un track específico
 * @param queryClient - Cliente de TanStack Query
 * @param trackId - ID del track
 * @param options - Opciones de invalidación
 */
export async function invalidateTrack(
  queryClient: QueryClient,
  trackId: string,
  options: InvalidateTrackOptions = {}
): Promise<void> {
  // Invalida el track por ID (formato usado en useLibraryQueries)
  await queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.tracks, "byId", trackId],
  });

  // Invalida el track (formato usado en TrackDetail)
  await queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.track, trackId],
  });

  // Opcionalmente invalida la lista completa
  if (options.includeList) {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tracks] });
  }
}

/**
 * Invalida queries de análisis de un track
 * @param queryClient - Cliente de TanStack Query
 * @param trackId - ID del track
 * @param type - Tipo de análisis (beatgrid, cuePoints, loops) o undefined para todos
 */
export async function invalidateAnalysis(
  queryClient: QueryClient,
  trackId: string,
  type?: AnalysisType
): Promise<void> {
  const analysisTypes: AnalysisType[] = type
    ? [type]
    : ["beatgrid", "cuePoints", "loops"];

  const keyMap: Record<AnalysisType, string> = {
    beatgrid: "beatgrids",
    cuePoints: "cuePoints",
    loops: "loops",
  };

  for (const analysisType of analysisTypes) {
    await queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.analysis, keyMap[analysisType], trackId],
    });
  }
}

/**
 * Interface del invalidador con métodos pre-configurados
 */
export interface QueryInvalidator {
  library: () => Promise<void>;
  playlists: (playlistId?: number) => Promise<void>;
  playlistTracks: (playlistId: number) => Promise<void>;
  track: (trackId: string, options?: InvalidateTrackOptions) => Promise<void>;
  analysis: (trackId: string, type?: AnalysisType) => Promise<void>;
}

/**
 * Factory para crear un invalidador con el queryClient inyectado
 * Facilita el uso en hooks sin pasar queryClient en cada llamada
 * 
 * @example
 * const invalidator = createQueryInvalidator(queryClient);
 * await invalidator.library();
 * await invalidator.playlists(42);
 */
export function createQueryInvalidator(queryClient: QueryClient): QueryInvalidator {
  return {
    library: () => invalidateLibrary(queryClient),
    playlists: (playlistId?: number) => invalidatePlaylists(queryClient, playlistId),
    playlistTracks: (playlistId: number) => invalidatePlaylistTracks(queryClient, playlistId),
    track: (trackId: string, options?: InvalidateTrackOptions) =>
      invalidateTrack(queryClient, trackId, options),
    analysis: (trackId: string, type?: AnalysisType) =>
      invalidateAnalysis(queryClient, trackId, type),
  };
}
