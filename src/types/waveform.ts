/**
 * Tipos para sistema de waveform con streaming progresivo
 * 
 * AIDEV-NOTE: Sistema estilo Musicat con eventos de progreso
 * Sincronizado con src-tauri/src/audio/waveform.rs
 */

/**
 * Payload de evento de progreso
 * Emitido cada ~100 paquetes durante generación
 * AIDEV-NOTE: Incluye peaks parciales para streaming progresivo visual
 */
export interface WaveformProgressPayload {
  trackId: string;
  progress: number;        // 0.0 - 1.0
  peaksSoFar: number;
  partialPeaks: number[];  // Peaks generados hasta ahora (para streaming)
}

/**
 * Payload de evento de completado
 * Emitido al finalizar generación (o si existe en cache)
 */
export interface WaveformCompletePayload {
  trackId: string;
  peaks: number[];         // Float32Array convertido a number[]
}

/**
 * Payload de evento de error
 * Emitido si falla la generación
 */
export interface WaveformErrorPayload {
  trackId: string;
  error: string;
}

/**
 * Estado de waveform en el frontend
 */
export interface WaveformState {
  isLoading: boolean;
  progress: number;        // 0.0 - 1.0
  peaks: Float32Array | null;
  error: string | null;
}

/**
 * Estado inicial de waveform
 */
export const initialWaveformState: WaveformState = {
  isLoading: false,
  progress: 0,
  peaks: null,
  error: null,
};
