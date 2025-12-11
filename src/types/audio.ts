/**
 * Tipos TypeScript para el módulo de audio
 * Corresponden con los tipos en Rust (src-tauri/src/audio/*)
 */

/**
 * Metadatos de audio extraídos de un archivo
 */
export interface AudioMetadata {
  duration: number;
  sample_rate: number;
  channels: number;
  bitrate: number | null;
  codec: string;
}

/**
 * Estado de reproducción del audio player
 */
export type PlaybackState = "playing" | "paused" | "stopped";

/**
 * Respuesta del comando get_playback_state
 */
export interface PlaybackStateResponse {
  state: PlaybackState;
  is_playing: boolean;
}

/**
 * Datos de waveform
 */
export interface WaveformData {
  samples: number[];
  sample_rate: number;
  duration: number;
}
