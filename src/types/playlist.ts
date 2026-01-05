/**
 * Tipos para sistema de playlists
 * AIDEV-NOTE: Migrado de number a string (UUID v4) para todos los IDs
 * Sincronizados con modelos Rust en src-tauri/src/db/models.rs
 */

/**
 * Playlist - Lista de reproducción
 */
export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  date_created: string;
  date_modified: string;
}

/**
 * Request para crear nueva playlist
 */
export interface CreatePlaylistRequest {
  name: string;
  description?: string | null;
}

/**
 * Request para actualizar playlist existente
 */
export interface UpdatePlaylistRequest {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * Request para actualizar metadatos de pista
 * AIDEV-NOTE: Sincronizado con UpdateTrackMetadataRequest en Rust (commands/library.rs)
 * Ahora escribe tags físicamente al archivo usando lofty
 */
export interface UpdateTrackMetadataRequest {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  bpm?: number;
  key?: string;      // Tonalidad musical (ej: "Am", "C#m")
  rating?: number;   // 0-5 estrellas
  comment?: string;  // Comentarios del usuario
}

/**
 * Request para agregar track a playlist
 * AIDEV-NOTE: Tauri 2.0 usa camelCase para parámetros en JavaScript
 */
export interface AddTrackToPlaylistRequest {
  playlistId: string;
  trackId: string;
}

/**
 * Request para remover track de playlist
 * AIDEV-NOTE: Tauri 2.0 usa camelCase para parámetros en JavaScript
 */
export interface RemoveTrackFromPlaylistRequest {
  playlistId: string;
  trackId: string;
}

/**
 * Request para reordenar tracks en playlist
 * AIDEV-NOTE: Tauri 2.0 usa camelCase para parámetros en JavaScript
 */
export interface ReorderPlaylistTracksRequest {
  playlistId: string;
  trackIds: string[];
}
