import { useState } from 'react';
import { useBatchFilenameToTags } from '../library';
import { logger } from '../../utils/logger';
import type { Track } from '../../types/library';

export interface UseTrackActionsProps {
  play: (path: string) => Promise<void>;
  playbackQueue: {
    generateQueue: (tracks: Track[], startIndex: number) => void;
  };
  onPlayingTrackChange: (track: Track) => void;
}

/**
 * Hook para manejar acciones sobre tracks
 * Agrupa handlers de doble click, detalles, y batch operations
 */
export const useTrackActions = ({
  play,
  playbackQueue,
  onPlayingTrackChange,
}: UseTrackActionsProps) => {
  const [trackDetailsId, setTrackDetailsId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const { mutate: batchFilenameToTags } = useBatchFilenameToTags();

  /**
   * Doble click en track: reproducir y generar cola
   * Recibe sortedTracks (orden visual) y el índice para cola correcta
   */
  const handleTrackDoubleClick = async (track: Track, sortedTracks: Track[], index: number) => {
    const timestamp = new Date().toISOString();
    console.log(
      `%c[${timestamp}] ========== APP.TSX DOUBLE CLICK ==========`,
      "background: #ff0000; color: #fff; font-weight: bold; padding: 4px;",
    );
    console.log(
      `%c[${timestamp}] Track: ${track.title}`,
      "background: #0088ff; color: #fff; padding: 2px;",
    );
    console.log(
      `%c[${timestamp}] Path: ${track.path}`,
      "background: #0088ff; color: #fff; padding: 2px;",
    );

    await logger.info(
      `[${timestamp}] ========== APP.TSX DOUBLE CLICK ==========`,
    );
    await logger.info(`[${timestamp}] Track: ${track.title}`);
    await logger.info(`[${timestamp}] Path: ${track.path}`);

    // Generar cola de reproducción usando sortedTracks (orden visual)
    playbackQueue.generateQueue(sortedTracks, index);
    console.log(
      `%c[${timestamp}] Cola generada desde índice ${index}, total: ${sortedTracks.length - index} pistas`,
      "background: #9900ff; color: #fff; padding: 2px;",
    );

    try {
      console.log(
        `%c[${timestamp}] Calling play() with path: ${track.path}`,
        "background: #00ff00; color: #000; padding: 2px;",
      );
      await logger.info(
        `[${timestamp}] Calling play() with path: ${track.path}`,
      );
      await play(track.path);
      onPlayingTrackChange(track);
      console.log(
        `%c[${timestamp}] ✅ Play successful`,
        "background: #00ff00; color: #000; font-weight: bold; padding: 4px;",
      );
      await logger.info(`[${timestamp}] ✅ Play successful`);
    } catch (error) {
      console.error(
        `%c[${timestamp}] ❌ Play failed: ${JSON.stringify(error)}`,
        "background: #ff0000; color: #fff; font-weight: bold; padding: 4px;",
      );
      await logger.error(
        `[${timestamp}] ❌ Play failed: ${JSON.stringify(error)}`,
      );
      console.error("Error al reproducir:", error);
    }
  };

  /**
   * Abrir modal de detalles del track
   */
  const handleTrackDetails = (track: Track) => {
    if (track.id) {
      setTrackDetailsId(track.id);
    }
  };

  /**
   * Cerrar modal de detalles
   */
  const handleCloseDetails = () => {
    setTrackDetailsId(null);
  };

  /**
   * Batch update de metadatos desde nombre de archivo
   * Solo actualiza pistas con patrón "Artista - Título"
   */
  const handleBatchFilenameToTags = (tracks: Track[]) => {
    setBatchProgress({ current: 0, total: tracks.length });
    
    batchFilenameToTags(
      {
        tracks,
        onProgress: (current, total) => {
          setBatchProgress({ current, total });
        }
      },
      {
        onSuccess: (result) => {
          setBatchProgress(null);
          
          // Mensaje con información de skipped
          let message = '';
          if (result.failed === 0 && result.skipped === 0) {
            message = `✅ ${result.success} pistas actualizadas correctamente`;
          } else if (result.failed === 0) {
            message = `✅ ${result.success} pistas actualizadas\n⏭️ ${result.skipped} saltadas (sin patrón "Artista - Título")`;
          } else {
            message = `✅ ${result.success} actualizadas\n⏭️ ${result.skipped} saltadas (sin patrón)\n❌ ${result.failed} fallaron\n\nErrores:\n${result.errors.join('\n')}`;
          }
          alert(message);
        },
        onError: (error) => {
          setBatchProgress(null);
          alert(`❌ Error al actualizar pistas: ${error}`);
        }
      }
    );
  };

  return {
    // Estado
    trackDetailsId,
    batchProgress,
    // Handlers
    handleTrackDoubleClick,
    handleTrackDetails,
    handleCloseDetails,
    handleBatchFilenameToTags,
  };
};
