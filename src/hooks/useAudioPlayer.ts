import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { PlaybackState } from "../types/audio";
import { logger } from "../utils/logger";

/**
 * Payload del evento audio:timestamp
 */
interface TimestampPayload {
  position: number;
  duration: number;
}

/**
 * Payload del evento audio:state
 */
interface StatePayload {
  is_playing: boolean;
  state: PlaybackState;
}

/**
 * Payload del evento audio:error
 */
interface ErrorPayload {
  message: string;
  is_critical: boolean;
}

/**
 * Estado del reproductor de audio
 */
export interface AudioPlayerState {
  isPlaying: boolean;
  state: PlaybackState;
  currentTrackPath: string | null;
  position: number;
  duration: number;
  volume: number;
  error: string | null;
}

/**
 * Hook personalizado para gestionar el reproductor de audio
 * 
 * AIDEV-NOTE: Arquitectura basada en eventos Tauri (NO polling):
 * - Escucha eventos del decode thread: audio:timestamp, audio:state, audio:error, audio:end_of_track
 * - Los comandos Tauri (play, pause, etc.) envían control al decode thread via channel
 * - El decode thread emite eventos que actualizan el state de React
 * 
 * Eventos backend → frontend:
 * - audio:timestamp (cada 100ms) → actualiza position/duration
 * - audio:state (on change) → actualiza isPlaying/state
 * - audio:end_of_track → auto-play next track
 * - audio:error → muestra toast notification
 * 
 * @returns Estado y funciones de control del reproductor
 * 
 * @example
 * ```tsx
 * const { play, pause, resume, stop, seek, state, position, duration } = useAudioPlayer();
 * 
 * const handlePlayClick = () => {
 *   play("/path/to/track.mp3");
 * };
 * 
 * const handleSeek = (newPosition: number) => {
 *   seek(newPosition);
 * };
 * ```
 */
export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    state: "stopped",
    currentTrackPath: null,
    position: 0.0,
    duration: 0.0,
    volume: 1.0,
    error: null,
  });

  /**
   * Reproduce una pista de audio
   * @param path - Ruta absoluta al archivo de audio
   */
  const play = useCallback(async (path: string) => {
    const timestamp = new Date().toISOString();
    await logger.info(`[${timestamp}] ============ PLAY START ============`);
    await logger.info(`[${timestamp}] Path received: ${path}`);
    
    try {
      await logger.info(`[${timestamp}] INVOKING play_track...`);
      await invoke("play_track", { path });
      await logger.info(`[${timestamp}] ✅ play_track SUCCESS`);
      
      // El estado se actualizará via eventos audio:state y audio:timestamp
      setState((prev) => ({
        ...prev,
        currentTrackPath: path,
        error: null,
      }));
      
      await logger.info(`[${timestamp}] currentTrackPath updated`);
    } catch (error) {
      await logger.error(`[${timestamp}] ❌ play_track FAILED: ${JSON.stringify(error)}`);
      console.error("Error al reproducir pista:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }, []);

  /**
   * Pausa la reproducción actual
   */
  const pause = useCallback(async () => {
    try {
      await invoke("pause_playback");
      // El estado se actualizará via evento audio:state
    } catch (error) {
      console.error("Error al pausar reproducción:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }, []);

  /**
   * Reanuda la reproducción pausada
   */
  const resume = useCallback(async () => {
    try {
      await invoke("resume_playback");
      // El estado se actualizará via evento audio:state
    } catch (error) {
      console.error("Error al reanudar reproducción:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }, []);

  /**
   * Detiene la reproducción completamente
   */
  const stop = useCallback(async () => {
    try {
      await invoke("stop_playback");
      // Resetear estado local inmediatamente
      setState({
        isPlaying: false,
        state: "stopped",
        currentTrackPath: null,
        position: 0.0,
        duration: 0.0,
        volume: 1.0,
        error: null,
      });
    } catch (error) {
      console.error("Error al detener reproducción:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }, []);

  /**
   * Busca a una posición específica en la pista
   * @param position - Posición en segundos
   */
  const seek = useCallback(async (position: number) => {
    try {
      await invoke("seek_to_position", { position });
      // La posición se actualizará via evento audio:timestamp
    } catch (error) {
      console.error("Error al buscar posición:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }, []);

  /**
   * Cambia el volumen de reproducción
   * @param volume - Volumen entre 0.0 y 1.0
   */
  const setVolume = useCallback(async (volume: number) => {
    try {
      await invoke("set_playback_volume", { volume });
      setState((prev) => ({
        ...prev,
        volume,
      }));
    } catch (error) {
      console.error("Error al cambiar volumen:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }, []);

  /**
   * Callback para manejar el fin de una pista
   * AIDEV-NOTE: Expuesto para que el componente padre pueda implementar auto-play
   */
  const onTrackEnd = useCallback(() => {
    logger.info("Track ended, resetting position/duration");
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      state: "stopped",
      position: 0.0,
      duration: 0.0,
    }));
  }, []);

  // Escuchar eventos de Tauri
  useEffect(() => {
    let unlistenTimestamp: UnlistenFn | undefined;
    let unlistenState: UnlistenFn | undefined;
    let unlistenEndOfTrack: UnlistenFn | undefined;
    let unlistenError: UnlistenFn | undefined;

    const setupListeners = async () => {
      // audio:timestamp - Actualiza position/duration cada 100ms
      unlistenTimestamp = await listen<TimestampPayload>("audio:timestamp", (event) => {
        setState((prev) => ({
          ...prev,
          position: event.payload.position,
          duration: event.payload.duration,
        }));
      });

      // audio:state - Actualiza isPlaying/state cuando cambia
      unlistenState = await listen<StatePayload>("audio:state", (event) => {
        setState((prev) => ({
          ...prev,
          isPlaying: event.payload.is_playing,
          state: event.payload.state,
        }));
      });

      // audio:end_of_track - La pista terminó de reproducirse
      unlistenEndOfTrack = await listen("audio:end_of_track", () => {
        onTrackEnd();
      });

      // audio:error - Error en el decode thread
      unlistenError = await listen<ErrorPayload>("audio:error", async (event) => {
        const { message, is_critical } = event.payload;
        await logger.error(`Audio error: ${message} (critical: ${is_critical})`);
        
        setState((prev) => ({
          ...prev,
          error: message,
        }));

        // Si es un error crítico, resetear el player
        if (is_critical) {
          setState({
            isPlaying: false,
            state: "stopped",
            currentTrackPath: null,
            position: 0.0,
            duration: 0.0,
            volume: 1.0,
            error: message,
          });
        }
      });
    };

    setupListeners();

    // Cleanup: unlisten todos los eventos al desmontar
    return () => {
      unlistenTimestamp?.();
      unlistenState?.();
      unlistenEndOfTrack?.();
      unlistenError?.();
    };
  }, [onTrackEnd]);

  return {
    // Estado
    ...state,
    
    // Funciones de control
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    
    // Callback para end_of_track (para auto-play)
    onTrackEnd,
  };
}
