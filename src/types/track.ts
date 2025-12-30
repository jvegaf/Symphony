/**
 * Tipos TypeScript para Track con Interface Segregation Principle (ISP)
 * 
 * Este módulo define interfaces segregadas para diferentes contextos de uso:
 * - TrackIdentity: Identificación básica
 * - TrackDisplay: Campos para visualización en tabla/lista
 * - TrackPlayback: Campos necesarios para reproducción
 * - TrackMetadata: Todos los campos editables
 * - TrackBeatport: Campos para integración con Beatport
 * - Track: Interface completa (composición de todas)
 * 
 * @module types/track
 */

/**
 * Identificación básica de una pista
 * Usado para referencias y lookups
 */
export interface TrackIdentity {
  /** UUID único de la pista (opcional para tracks nuevos) */
  id?: string;
  /** Ruta absoluta al archivo de audio */
  path: string;
}

/**
 * Campos necesarios para mostrar en tabla/lista
 * Optimizado para rendering de UI
 */
export interface TrackDisplay extends TrackIdentity {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  bpm?: number;
  key?: string;
  rating?: number;
  genre?: string;
  year?: number;
  dateAdded: string;
  bitrate: number;
  /** ID de Beatport para indicador visual de "fixeado" */
  beatportId?: number;
}

/**
 * Campos mínimos necesarios para reproducción
 * Usado por el audio player
 */
export interface TrackPlayback extends TrackIdentity {
  title: string;
  artist: string;
  duration: number;
}

/**
 * Todos los metadatos de una pista
 * Usado para edición y vista detallada
 */
export interface TrackMetadata extends TrackDisplay {
  sampleRate: number;
  fileSize: number;
  playCount: number;
  lastPlayed?: string;
  dateModified: string;
  label?: string;
  isrc?: string;
}

/**
 * Campos relevantes para integración con Beatport
 * Usado en el flujo de fix tags
 */
export interface TrackBeatport extends TrackPlayback {
  bpm?: number;
  key?: string;
  label?: string;
  isrc?: string;
  beatportId?: number;
}

/**
 * Interface completa de Track
 * Composición de todas las interfaces segregadas
 * 
 * AIDEV-NOTE: v5 añade beatportId para tracking de pistas fixeadas
 */
export interface Track extends TrackMetadata {
  // Todos los campos heredados de TrackMetadata
  // que a su vez hereda de TrackDisplay y TrackIdentity
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Verifica si un objeto tiene los campos requeridos de TrackDisplay
 */
export function isTrackDisplay(obj: unknown): obj is TrackDisplay {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  
  const track = obj as Record<string, unknown>;
  
  return (
    typeof track.id === "string" &&
    typeof track.path === "string" &&
    typeof track.title === "string" &&
    typeof track.artist === "string" &&
    typeof track.duration === "number" &&
    typeof track.bitrate === "number" &&
    typeof track.dateAdded === "string"
  );
}

/**
 * Verifica si un objeto tiene los campos requeridos de TrackPlayback
 */
export function isTrackPlayback(obj: unknown): obj is TrackPlayback {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  
  const track = obj as Record<string, unknown>;
  
  return (
    typeof track.id === "string" &&
    typeof track.path === "string" &&
    typeof track.title === "string" &&
    typeof track.artist === "string" &&
    typeof track.duration === "number"
  );
}

/**
 * Verifica si un objeto tiene todos los campos de TrackMetadata
 */
export function isTrackMetadata(obj: unknown): obj is TrackMetadata {
  if (!isTrackDisplay(obj)) {
    return false;
  }
  
  const track = obj as unknown as Record<string, unknown>;
  
  return (
    typeof track.sampleRate === "number" &&
    typeof track.fileSize === "number" &&
    typeof track.playCount === "number" &&
    typeof track.dateModified === "string"
  );
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Crea un TrackDisplay desde un Track completo
 * Extrae solo los campos necesarios para visualización
 */
export function createTrackDisplay(track: Track): TrackDisplay {
  return {
    id: track.id,
    path: track.path,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    bpm: track.bpm,
    key: track.key,
    rating: track.rating,
    genre: track.genre,
    year: track.year,
    dateAdded: track.dateAdded,
    bitrate: track.bitrate,
    beatportId: track.beatportId,
  };
}

/**
 * Crea un TrackPlayback desde un Track
 * Extrae solo los campos necesarios para reproducción
 */
export function createTrackPlayback(track: Track): TrackPlayback {
  return {
    id: track.id,
    path: track.path,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
  };
}

/**
 * Crea un TrackBeatport desde un Track
 * Extrae campos relevantes para integración con Beatport
 */
export function createTrackBeatport(track: Track): TrackBeatport {
  return {
    id: track.id,
    path: track.path,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    bpm: track.bpm,
    key: track.key,
    label: track.label,
    isrc: track.isrc,
    beatportId: track.beatportId,
  };
}
