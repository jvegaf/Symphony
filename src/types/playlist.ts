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
 */
export interface AddTrackToPlaylistRequest {
  playlist_id: string;
  track_id: string;
}

/**
 * Request para remover track de playlist
 */
export interface RemoveTrackFromPlaylistRequest {
  playlist_id: string;
  track_id: string;
}

/**
 * Request para reordenar tracks en playlist
 */
export interface ReorderPlaylistTracksRequest {
  playlist_id: string;
  track_ids: string[];
}
