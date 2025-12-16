/**
 * Utilidad de depuración para eventos de waveform
 * 
 * AIDEV-NOTE: Script de diagnóstico para el issue de waveform:complete
 * - Instala listeners globales que no dependen del ciclo de vida de React
 * - Registra TODOS los eventos de waveform sin filtros
 * - Ayuda a identificar si el problema es de Tauri o de React
 */

import type { Event } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';

import type {
  WaveformCompletePayload,
  WaveformErrorPayload,
  WaveformProgressPayload,
} from '../types/waveform';

// Extend window interface for TypeScript
declare global {
  interface Window {
    debugWaveform: typeof debugWaveformEvents;
  }
}

/**
 * Instala listeners globales para depurar eventos de waveform
 * Llamar desde la consola del navegador: window.debugWaveform()
 */
export async function debugWaveformEvents() {
  console.log('🔍 INSTALLING GLOBAL WAVEFORM DEBUGGERS...');
  
  // Counter para eventos
  let progressCount = 0;
  let completeCount = 0;
  let errorCount = 0;

  // Listener para progress
  const unlistenProgress = await listen<WaveformProgressPayload>('waveform:progress', (event: Event<WaveformProgressPayload>) => {
    progressCount++;
    console.log(`📊 [GLOBAL] waveform:progress #${progressCount}:`, {
      trackId: event.payload.trackId,
      progress: event.payload.progress,
      peaksSoFar: event.payload.peaksSoFar,
      timestamp: new Date().toISOString(),
    });
  });

  // Listener para complete
  const unlistenComplete = await listen<WaveformCompletePayload>('waveform:complete', (event: Event<WaveformCompletePayload>) => {
    completeCount++;
    console.log(`✅ [GLOBAL] waveform:complete #${completeCount}:`, {
      trackId: event.payload.trackId,
      peaksLength: event.payload.peaks.length,
      peaksType: typeof event.payload.peaks,
      isArray: Array.isArray(event.payload.peaks),
      first10Peaks: event.payload.peaks.slice(0, 10),
      timestamp: new Date().toISOString(),
    });
    console.log('📦 Full payload:', event.payload);
  });

  // Listener para error
  const unlistenError = await listen<WaveformErrorPayload>('waveform:error', (event: Event<WaveformErrorPayload>) => {
    errorCount++;
    console.log(`❌ [GLOBAL] waveform:error #${errorCount}:`, {
      trackId: event.payload.trackId,
      error: event.payload.error,
      timestamp: new Date().toISOString(),
    });
  });

  console.log('✅ Global waveform debuggers installed!');
  console.log('📝 Counters: progress=%d, complete=%d, error=%d', progressCount, completeCount, errorCount);
  
  // Retornar función de cleanup
  return () => {
    console.log('🧹 Cleaning up global waveform debuggers...');
    console.log('📊 Final counts - progress:%d, complete:%d, error:%d', progressCount, completeCount, errorCount);
    unlistenProgress();
    unlistenComplete();
    unlistenError();
  };
}

// Exponer función globalmente para acceso desde consola
if (typeof window !== 'undefined') {
  window.debugWaveform = debugWaveformEvents;
  console.log('💡 Tip: Run window.debugWaveform() in console to install global listeners');
}
