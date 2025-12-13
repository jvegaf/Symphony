/**
 * Tipos para sistema de playlists
 * Sincronizados con modelos Rust en src-tauri/src/db/models.rs
 */

/**
 * Playlist - Lista de reproducción
 */
export interface Playlist {
  id: number;
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
  description?: string;
}

/**
 * Request para actualizar playlist existente
 */
export interface UpdatePlaylistRequest {
  id: number;
  name: string;
  description?: string;
}

/**
 * Request para actualizar metadatos de pista
 */
export interface UpdateTrackMetadataRequest {
  id: number;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  bpm?: number;
  key?: string;
  rating?: number; // 0-5
}

/**
 * Request para agregar track a playlist
 */
export interface AddTrackToPlaylistRequest {
  playlist_id: number;
  track_id: number;
}

/**
 * Request para remover track de playlist
 */
export interface RemoveTrackFromPlaylistRequest {
  playlist_id: number;
  track_id: number;
}

/**
 * Request para reordenar tracks en playlist
 */
export interface ReorderPlaylistTracksRequest {
  playlist_id: number;
  track_ids: number[];
}
