import { useCallback } from "react";

import type { Track } from "../types/library";

/**
 * Constantes de configuración para los atajos de teclado
 */
const SEEK_STEP_SECONDS = 10;
const PREVIOUS_TRACK_THRESHOLD_SECONDS = 3;

/**
 * Teclas válidas para los atajos del reproductor
 */
const SHORTCUT_KEYS = ["a", "d", "s", "w"] as const;
type ShortcutKey = (typeof SHORTCUT_KEYS)[number];

/**
 * Props para el hook usePlayerShortcuts
 */
export interface UsePlayerShortcutsProps {
  /** Pista actualmente en reproducción */
  currentTrack: Track | null;
  /** Mapa de ID -> Track para búsqueda rápida */
  tracksById: Map<string, Track>;
  /** Posición actual en segundos */
  position: number;
  /** Duración total en segundos */
  duration: number;
  /** Función para hacer seek a una posición */
  seek: (position: number) => void;
  /** Función para reproducir una pista por su path */
  play: (path: string) => Promise<void>;
  /** Callback cuando cambia la pista actual */
  onTrackChange: (track: Track) => void;
  /** Función para avanzar en la cola, retorna ID de siguiente pista o null */
  queueNext: () => string | null;
  /** Función para retroceder en la cola, retorna ID de pista anterior o null */
  queuePrevious: () => string | null;
  /** Si hay pista siguiente en la cola */
  hasNext: boolean;
  /** Si hay pista anterior en la cola */
  hasPrevious: boolean;
}

/**
 * Hook para manejar atajos de teclado del reproductor de audio
 *
 * AIDEV-NOTE: Atajos implementados:
 * - A: Ir al inicio de la canción. Si se pulsa otra vez en < 3 seg → pista anterior
 * - D: Ir a la siguiente pista de la cola
 * - S: Avanzar 10 segundos
 * - W: Retroceder 10 segundos
 *
 * AIDEV-NOTE: La navegación ahora usa la cola de reproducción (usePlaybackQueue)
 * en lugar de buscar directamente en la lista de tracks.
 * La cola se genera al hacer doble click y se mantiene fija al navegar.
 *
 * @example
 * ```tsx
 * const { handleKeyPress, isShortcutKey } = usePlayerShortcuts({
 *   currentTrack,
 *   tracksById,
 *   position,
 *   duration,
 *   seek,
 *   play,
 *   onTrackChange,
 *   queueNext: playbackQueue.next,
 *   queuePrevious: playbackQueue.previous,
 *   hasNext: playbackQueue.hasNext,
 *   hasPrevious: playbackQueue.hasPrevious,
 * });
 * ```
 */
export function usePlayerShortcuts({
  currentTrack,
  tracksById,
  position,
  duration,
  seek,
  play,
  onTrackChange,
  queueNext,
  queuePrevious,
  hasPrevious,
}: UsePlayerShortcutsProps) {
  /**
   * Retrocede 10 segundos (tecla W)
   */
  const handleRewind = useCallback(() => {
    if (!currentTrack) return;
    const newPosition = Math.max(0, position - SEEK_STEP_SECONDS);
    seek(newPosition);
  }, [currentTrack, position, seek]);

  /**
   * Avanza 10 segundos (tecla S)
   */
  const handleFastForward = useCallback(() => {
    if (!currentTrack) return;
    const newPosition = Math.min(duration, position + SEEK_STEP_SECONDS);
    seek(newPosition);
  }, [currentTrack, duration, position, seek]);

  /**
   * Reproduce la siguiente pista de la cola (tecla D)
   */
  const handleNextTrack = useCallback(async () => {
    const nextId = queueNext();
    if (!nextId) return;

    const nextTrack = tracksById.get(nextId);
    if (!nextTrack) {
      console.error("usePlayerShortcuts: Track no encontrado en tracksById", nextId);
      return;
    }

    try {
      await play(nextTrack.path);
      onTrackChange(nextTrack);
    } catch (error) {
      console.error("Error al reproducir siguiente pista:", error);
    }
  }, [queueNext, tracksById, play, onTrackChange]);

  /**
   * Reproduce la pista anterior de la cola (llamado cuando A se presiona dos veces)
   */
  const handlePreviousTrack = useCallback(async () => {
    const prevId = queuePrevious();
    if (!prevId) return;

    const prevTrack = tracksById.get(prevId);
    if (!prevTrack) {
      console.error("usePlayerShortcuts: Track no encontrado en tracksById", prevId);
      return;
    }

    try {
      await play(prevTrack.path);
      onTrackChange(prevTrack);
    } catch (error) {
      console.error("Error al reproducir pista anterior:", error);
    }
  }, [queuePrevious, tracksById, play, onTrackChange]);

  /**
   * Maneja la tecla A: ir al inicio o pista anterior
   *
   * AIDEV-NOTE: Lógica basada en posición actual:
   * - Si position < 3 segundos Y hay pista anterior → reproducir pista anterior
   * - Si position >= 3 segundos O no hay pista anterior → ir al inicio (seek 0)
   */
  const handleGoToStartOrPrevious = useCallback(async () => {
    if (!currentTrack) return;

    // Si estamos en los primeros 3 segundos y hay pista anterior → pista anterior
    if (position < PREVIOUS_TRACK_THRESHOLD_SECONDS && hasPrevious) {
      await handlePreviousTrack();
      return;
    }

    // En cualquier otro caso → ir al inicio
    seek(0);
  }, [currentTrack, position, hasPrevious, handlePreviousTrack, seek]);

  /**
   * Verifica si una tecla es un atajo válido
   */
  const isShortcutKey = useCallback((key: string): boolean => {
    return SHORTCUT_KEYS.includes(key.toLowerCase() as ShortcutKey);
  }, []);

  /**
   * Procesa una pulsación de tecla
   */
  const handleKeyPress = useCallback(
    async (key: string): Promise<void> => {
      const normalizedKey = key.toLowerCase();

      switch (normalizedKey) {
        case "w":
          handleRewind();
          break;
        case "s":
          handleFastForward();
          break;
        case "a":
          await handleGoToStartOrPrevious();
          break;
        case "d":
          await handleNextTrack();
          break;
        default:
          // Tecla no reconocida - no hacer nada
          break;
      }
    },
    [handleRewind, handleFastForward, handleNextTrack, handleGoToStartOrPrevious]
  );

  return {
    handleKeyPress,
    isShortcutKey,
  };
}
