/**
 * Hook para gestión de waveform con streaming progresivo
 * 
 * AIDEV-NOTE: Sistema estilo Musicat:
 * 1. Llama a get_waveform(trackId, path, duration)
 * 2. Backend verifica cache → emite "complete" si existe
 * 3. Si no existe, genera y emite eventos "progress" y "complete"
 * 4. Hook escucha eventos y actualiza estado
 * 
 * Eventos:
 * - waveform:progress → actualiza progreso
 * - waveform:complete → convierte peaks y retorna
 * - waveform:error → muestra error
 */

import { useCallback, useEffect, useState } from 'react';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import type {
  WaveformCompletePayload,
  WaveformErrorPayload,
  WaveformProgressPayload,
  WaveformState,
} from '../types/waveform';

const INITIAL_STATE: WaveformState = {
  isLoading: false,
  progress: 0,
  peaks: null,
  error: null,
};

/**
 * Hook para obtener waveform con cache y streaming
 * 
 * @param trackId - UUID de la pista
 * @param trackPath - Ruta completa al archivo de audio
 * @param duration - Duración en segundos (del metadata ya cargado)
 * @returns Estado del waveform con peaks, progreso y loading
 */
export function useWaveform(
  trackId: string | undefined,
  trackPath: string | undefined,
  duration: number | undefined
) {
  const [state, setState] = useState<WaveformState>(INITIAL_STATE);

  // Cancelar generación al desmontar
  useEffect(() => {
    return () => {
      if (trackId) {
        invoke('cancel_waveform', { trackId }).catch(console.error);
      }
    };
  }, [trackId]);

  // AIDEV-NOTE: Setup listeners AND request waveform in SAME effect
  // This prevents race condition where backend emits event before listeners are ready
  // (Critical for cached waveforms that emit immediately!)
  useEffect(() => {
    if (!trackId || !trackPath || duration === undefined) {
      setState(INITIAL_STATE);
      return;
    }

    console.log('========== useWaveform: SETUP START ==========');
    console.log('Track ID:', trackId);
    console.log('Track Path:', trackPath);
    console.log('Duration:', duration);

    // Reset estado
    setState({
      isLoading: true,
      progress: 0,
      peaks: null,
      error: null,
    });

    // Setup listeners FIRST, then request waveform
    let isActive = true;
    
    const setupListenersAndRequest = async () => {
      console.log('👂 Setting up event listeners...');
      
      // Setup all listeners
      const unlistenProgress = await listen<WaveformProgressPayload>('waveform:progress', (event) => {
        if (event.payload.trackId === trackId && isActive) {
          const newChunk = event.payload.partialPeaks && event.payload.partialPeaks.length > 0
            ? new Float32Array(event.payload.partialPeaks)
            : null;
          
          if (newChunk && newChunk.length > 0) {
            setState((prev) => {
              // Simplemente concatenar chunks - nuestro canvas maneja el rendering correctamente
              const combined = prev.peaks 
                ? new Float32Array(prev.peaks.length + newChunk.length)
                : new Float32Array(newChunk.length);
              
              if (prev.peaks) {
                combined.set(prev.peaks, 0);
              }
              combined.set(newChunk, prev.peaks?.length || 0);
              
              console.log(`📊 Chunk: +${newChunk.length} peaks, total: ${combined.length}`);
              
              return {
                ...prev,
                progress: event.payload.progress,
                peaks: combined,
                isLoading: true,
              };
            });
          }
        }
      });

      const unlistenComplete = await listen<WaveformCompletePayload>('waveform:complete', (event) => {
        console.log('✅ waveform:complete event RECEIVED:', { 
          trackId: event.payload.trackId, 
          peaksLength: event.payload.peaks.length 
        });
        console.log('   Current trackId:', trackId);
        console.log('   Match:', event.payload.trackId === trackId);
        console.log('   isActive:', isActive);
        
        if (event.payload.trackId === trackId && isActive) {
          console.log('🎯 MATCH! Converting peaks to Float32Array...');
          const peaks = new Float32Array(event.payload.peaks);
          console.log('✅ Float32Array created:', peaks.length, 'peaks');
          
          setState({
            isLoading: false,
            progress: 1.0,
            peaks,
            error: null,
          });
          console.log('✅ State updated with peaks!');
        } else {
          console.log('⚠️ Ignoring event - trackId mismatch or component unmounted');
        }
      });

      const unlistenError = await listen<WaveformErrorPayload>('waveform:error', (event) => {
        console.error('❌ waveform:error event:', event.payload);
        if (event.payload.trackId === trackId && isActive) {
          setState({
            isLoading: false,
            progress: 0,
            peaks: null,
            error: event.payload.error,
          });
        }
      });

      console.log('✅ Listeners ready, now requesting waveform...');

      // NOW request waveform (listeners are ready!)
      try {
        await invoke('get_waveform', {
          trackId,
          trackPath,
          duration,
        });
        console.log('✅ get_waveform command sent successfully');
      } catch (error) {
        console.error('❌ Failed to request waveform:', error);
        if (isActive) {
          setState({
            isLoading: false,
            progress: 0,
            peaks: null,
            error: String(error),
          });
        }
      }

      // Return cleanup function
      return () => {
        console.log('🧹 Cleaning up listeners for track:', trackId);
        unlistenProgress();
        unlistenComplete();
        unlistenError();
      };
    };

    // Execute setup
    let cleanup: (() => void) | undefined;
    setupListenersAndRequest().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    // Cleanup on unmount
    return () => {
      isActive = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, [trackId, trackPath, duration]);

  // Función para cancelar manualmente
  const cancel = useCallback(async () => {
    if (!trackId) return false;
    
    try {
      const cancelled = await invoke<boolean>('cancel_waveform', { trackId });
      if (cancelled) {
        setState(INITIAL_STATE);
      }
      return cancelled;
    } catch (error) {
      console.error('Failed to cancel waveform:', error);
      return false;
    }
  }, [trackId]);

  return {
    ...state,
    cancel,
  };
}
