import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PlaybackStateResponse } from "@/types/audio";

/**
 * Estado del reproductor de audio
 */
export interface AudioPlayerState {
  isPlaying: boolean;
  state: "playing" | "paused" | "stopped";
  currentTrackPath: string | null;
}

/**
 * Hook personalizado para gestionar el reproductor de audio
 * 
 * Proporciona control sobre reproducción, pausa, reanudación y detención
 * de pistas de audio mediante comandos Tauri.
 * 
 * @returns Estado y funciones de control del reproductor
 * 
 * @example
 * ```tsx
 * const { play, pause, resume, stop, state } = useAudioPlayer();
 * 
 * const handlePlayClick = () => {
 *   play("/path/to/track.mp3");
 * };
 * ```
 */
export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    state: "stopped",
    currentTrackPath: null,
  });

  /**
   * Reproduce una pista de audio
   * @param path - Ruta absoluta al archivo de audio
   */
  const play = useCallback(async (path: string) => {
    try {
      await invoke("play_track", { path });
      setState({
        isPlaying: true,
        state: "playing",
        currentTrackPath: path,
      });
    } catch (error) {
      console.error("Error al reproducir pista:", error);
      throw error;
    }
  }, []);

  /**
   * Pausa la reproducción actual
   */
  const pause = useCallback(async () => {
    try {
      await invoke("pause_playback");
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        state: "paused",
      }));
    } catch (error) {
      console.error("Error al pausar reproducción:", error);
      throw error;
    }
  }, []);

  /**
   * Reanuda la reproducción pausada
   */
  const resume = useCallback(async () => {
    try {
      await invoke("resume_playback");
      setState((prev) => ({
        ...prev,
        isPlaying: true,
        state: "playing",
      }));
    } catch (error) {
      console.error("Error al reanudar reproducción:", error);
      throw error;
    }
  }, []);

  /**
   * Detiene la reproducción completamente
   */
  const stop = useCallback(async () => {
    try {
      await invoke("stop_playback");
      setState({
        isPlaying: false,
        state: "stopped",
        currentTrackPath: null,
      });
    } catch (error) {
      console.error("Error al detener reproducción:", error);
      throw error;
    }
  }, []);

  /**
   * Obtiene el estado actual de reproducción desde el backend
   */
  const refreshState = useCallback(async () => {
    try {
      const response = await invoke<PlaybackStateResponse>("get_playback_state");
      setState((prev) => ({
        ...prev,
        isPlaying: response.is_playing,
        state: response.state,
      }));
    } catch (error) {
      console.error("Error al obtener estado de reproducción:", error);
    }
  }, []);

  // Sincronizar estado al montar el componente
  useEffect(() => {
    refreshState();
  }, [refreshState]);

  return {
    ...state,
    play,
    pause,
    resume,
    stop,
    refreshState,
  };
}
