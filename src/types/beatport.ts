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
