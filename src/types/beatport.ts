/**
 * Tipos TypeScript para integración con Beatport
 * 
 * Define las interfaces que corresponden a los structs Rust
 * para comunicación con el backend.
 */

/**
 * Tags extraídos de Beatport para aplicar a un track local
 */
export interface BeatportTags {
  title: string | null;
  artist: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  label: string | null;
  album: string | null;
  year: number | null;
  isrc: string | null;
  catalog_number: string | null;
  artwork_url: string | null;
}

/**
 * Resultado de fix_tags para un track individual
 */
export interface FixTagsResult {
  track_id: string;
  success: boolean;
  beatport_track_id?: number;
  tags_applied?: BeatportTags;
  error?: string;
}

/**
 * Resultado de batch fix_tags
 */
export interface BatchFixResult {
  total: number;
  success_count: number;
  failed_count: number;
  results: FixTagsResult[];
}

/**
 * Fases del proceso fix_tags
 */
export type FixTagsPhase = 'searching' | 'downloading' | 'applying_tags' | 'complete';

/**
 * Evento de progreso para UI
 */
export interface FixTagsProgress {
  current: number;
  total: number;
  current_track_title: string;
  phase: FixTagsPhase;
}

// ============================================================================
// Tipos para selección manual de candidatos de Beatport
// ============================================================================

/**
 * Candidato de Beatport para un track local
 * Contiene información resumida para mostrar en la UI de selección
 */
export interface BeatportCandidate {
  /** ID del track en Beatport */
  beatport_id: number;
  /** Título del track */
  title: string;
  /** Mix name (Original Mix, Extended Mix, etc.) */
  mix_name: string | null;
  /** Artistas concatenados */
  artists: string;
  /** BPM detectado */
  bpm: number | null;
  /** Key musical */
  key: string | null;
  /** Duración en segundos */
  duration_secs: number | null;
  /** URL del artwork (thumbnail para UI) */
  artwork_url: string | null;
  /** Score de similitud (0.0 - 1.0) */
  similarity_score: number;
  /** Género */
  genre: string | null;
  /** Label/Sello */
  label: string | null;
  /** Fecha de publicación (YYYY-MM-DD) */
  release_date: string | null;
}

/**
 * Candidatos de Beatport para un track local
 * Agrupa el track local con sus posibles matches de Beatport
 */
export interface TrackCandidates {
  /** ID del track local en Symphony */
  local_track_id: string;
  /** Título del track local */
  local_title: string;
  /** Artista del track local */
  local_artist: string;
  /** Nombre del archivo local */
  local_filename: string | null;
  /** Duración del track local en segundos */
  local_duration: number | null;
  /** Lista de candidatos de Beatport (máximo 4) */
  candidates: BeatportCandidate[];
  /** Indica si hubo error al buscar */
  error: string | null;
}

/**
 * Selección del usuario para un track
 * El usuario elige qué candidato de Beatport usar (o ninguno)
 */
export interface TrackSelection {
  /** ID del track local en Symphony */
  local_track_id: string;
  /** ID del track de Beatport seleccionado (null = "No está en Beatport") */
  beatport_track_id: number | null;
}

/**
 * Resultado de búsqueda de candidatos para múltiples tracks
 */
export interface SearchCandidatesResult {
  /** Candidatos por cada track */
  tracks: TrackCandidates[];
  /** Total de tracks procesados */
  total: number;
  /** Tracks con al menos un candidato */
  with_candidates: number;
  /** Tracks sin candidatos encontrados */
  without_candidates: number;
}
