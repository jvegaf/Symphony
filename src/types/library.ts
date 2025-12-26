/**
 * Tipos TypeScript para el módulo de biblioteca
 * Sincronizados con los tipos Rust del backend
 */

/**
 * Modelo de pista musical
 * AIDEV-NOTE: Migrado de number a string (UUID v4)
 */
export interface Track {
  id?: string;
  path: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  year?: number;
  duration: number;
  bitrate: number;
  sampleRate: number;
  fileSize: number;
  bpm?: number;
  key?: string;
  rating?: number;
  playCount: number;
  lastPlayed?: string;
  dateAdded: string;
  dateModified: string;
  label?: string;
  isrc?: string;
}

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
