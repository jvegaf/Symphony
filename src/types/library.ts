/**
 * Tipos TypeScript para el módulo de biblioteca
 * Sincronizados con los tipos Rust del backend
 */

// Re-exportar tipos de Track desde el módulo segregado
export type {
  Track,
  TrackIdentity,
  TrackDisplay,
  TrackPlayback,
  TrackMetadata,
  TrackBeatport,
} from "./track";

export {
  isTrackDisplay,
  isTrackPlayback,
  isTrackMetadata,
  createTrackDisplay,
  createTrackPlayback,
  createTrackBeatport,
} from "./track";

/**
 * Fase del proceso de importación
 */
export type ImportPhase = "scanning" | "importing" | "complete";

/**
 * Progreso de importación de biblioteca
 */
export interface ImportProgress {
  current: number;
  total: number;
  phase: ImportPhase;
}

/**
 * Resultado de la importación
 */
export interface ImportResult {
  totalFiles: number;
  imported: number;
  failed: number;
  durationSecs: number;
}

/**
 * Estadísticas de la biblioteca
 */
export interface LibraryStats {
  totalTracks: number;
  totalArtists: number;
  totalAlbums: number;
  totalDurationHours: number;
  totalSizeGb: number;
  ratingDistribution: number[]; // [count_0_stars, count_1_star, ..., count_5_stars]
}

/**
 * Opciones para búsqueda de pistas
 */
export interface SearchOptions {
  query: string;
  limit?: number;
}

/**
 * Resultado de consolidar biblioteca
 */
export interface ConsolidateLibraryResult {
  orphansRemoved: number;
  duplicatesRemoved: number;
  newTracksAdded: number;
  totalTracks: number;
  initialTracks: number;
}
