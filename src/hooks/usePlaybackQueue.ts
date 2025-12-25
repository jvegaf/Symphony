import { useCallback, useState } from "react";

import type { Track } from "../types/library";

/**
 * Estado de la cola de reproducción
 */
export interface PlaybackQueueState {
  /** IDs de las pistas en la cola (desde la seleccionada hasta el final) */
  queue: string[];
  /** Índice actual dentro de la cola */
  currentIndex: number;
}

/**
 * Resultado del hook usePlaybackQueue
 */
export interface UsePlaybackQueueResult {
  /** Cola actual de IDs */
  queue: string[];
  /** Índice actual dentro de la cola */
  currentIndex: number;
  /** ID de la pista actual en la cola */
  currentTrackId: string | null;
  /** Si hay pista siguiente disponible */
  hasNext: boolean;
  /** Si hay pista anterior disponible */
  hasPrevious: boolean;
  /** Genera una nueva cola desde el índice de la pista en la lista */
  generateQueue: (tracks: Track[], startIndex: number) => void;
  /** Avanza a la siguiente pista en la cola */
  next: () => string | null;
  /** Retrocede a la pista anterior en la cola */
  previous: () => string | null;
  /** Limpia la cola */
  clear: () => void;
}

/**
 * Hook para manejar la cola de reproducción
 *
 * AIDEV-NOTE: La cola se genera cuando el usuario hace doble click en una pista.
 * Contiene los IDs desde esa pista hasta el final de la lista visible.
 * La cola NO se regenera al navegar con A/D, solo al:
 * - Hacer doble click en otra pista
 * - Cambiar el orden de la lista
 *
 * @example
 * ```tsx
 * const { queue, currentIndex, generateQueue, next, previous } = usePlaybackQueue();
 *
 * // Al hacer doble click en una pista
 * const handleDoubleClick = (track: Track, index: number) => {
 *   generateQueue(filteredTracks, index);
 *   play(track.path);
 * };
 *
 * // Navegar con D (siguiente)
 * const nextTrackId = next();
 * if (nextTrackId) {
 *   const track = tracks.find(t => t.id === nextTrackId);
 *   play(track.path);
 * }
 * ```
 */
export function usePlaybackQueue(): UsePlaybackQueueResult {
  const [state, setState] = useState<PlaybackQueueState>({
    queue: [],
    currentIndex: -1,
  });

  /**
   * Genera una nueva cola desde el índice especificado hasta el final
   * AIDEV-NOTE: Se llama al hacer doble click o al cambiar el orden de la lista
   */
  const generateQueue = useCallback((tracks: Track[], startIndex: number) => {
    if (startIndex < 0 || startIndex >= tracks.length) {
      console.warn("usePlaybackQueue: startIndex fuera de rango", { startIndex, tracksLength: tracks.length });
      return;
    }

    // Crear cola desde startIndex hasta el final
    const newQueue = tracks.slice(startIndex).map((track) => {
      if (!track.id) {
        console.error("usePlaybackQueue: Track sin ID detectado", track);
        throw new Error(`Track sin ID: ${track.title}`);
      }
      return track.id;
    });

    setState({
      queue: newQueue,
      currentIndex: 0, // Siempre empezamos en el primer elemento de la nueva cola
    });
  }, []);

  /**
   * Avanza a la siguiente pista en la cola
   * @returns ID de la siguiente pista, o null si no hay más
   */
  const next = useCallback((): string | null => {
    const nextIndex = state.currentIndex + 1;
    if (nextIndex >= state.queue.length) {
      // No hay más pistas en la cola
      return null;
    }

    const nextId = state.queue[nextIndex];
    setState((prev) => ({
      ...prev,
      currentIndex: nextIndex,
    }));

    return nextId;
  }, [state.currentIndex, state.queue]);

  /**
   * Retrocede a la pista anterior en la cola
   * @returns ID de la pista anterior, o null si estamos en la primera
   */
  const previous = useCallback((): string | null => {
    const prevIndex = state.currentIndex - 1;
    if (prevIndex < 0) {
      // Ya estamos en la primera pista de la cola
      return null;
    }

    const prevId = state.queue[prevIndex];
    setState((prev) => ({
      ...prev,
      currentIndex: prevIndex,
    }));

    return prevId;
  }, [state.currentIndex, state.queue]);

  /**
   * Limpia la cola de reproducción
   */
  const clear = useCallback(() => {
    setState({
      queue: [],
      currentIndex: -1,
    });
  }, []);

  // Valores derivados
  const currentTrackId = state.currentIndex >= 0 && state.currentIndex < state.queue.length
    ? state.queue[state.currentIndex]
    : null;
  const hasNext = state.currentIndex < state.queue.length - 1;
  const hasPrevious = state.currentIndex > 0;

  return {
    queue: state.queue,
    currentIndex: state.currentIndex,
    currentTrackId,
    hasNext,
    hasPrevious,
    generateQueue,
    next,
    previous,
    clear,
  };
}
