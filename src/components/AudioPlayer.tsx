import { useState } from "react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

/**
 * Props del componente AudioPlayer
 */
export interface AudioPlayerProps {
  /** Ruta de la pista a reproducir */
  trackPath?: string;
  /** Título de la pista */
  trackTitle?: string;
  /** Callback cuando se reproduce una pista */
  onPlay?: (path: string) => void;
  /** Callback cuando se pausa */
  onPause?: () => void;
  /** Callback cuando se detiene */
  onStop?: () => void;
}

/**
 * Componente de reproductor de audio
 *
 * Proporciona controles de reproducción, pausa, reanudación y detención
 * con integración al backend de Tauri.
 *
 * @component
 * @example
 * ```tsx
 * <AudioPlayer
 *   trackPath="/music/song.mp3"
 *   trackTitle="Mi Canción"
 *   onPlay={(path) => console.log('Playing:', path)}
 * />
 * ```
 */
export function AudioPlayer({
  trackPath,
  trackTitle = "Sin pista seleccionada",
  onPlay,
  onPause,
  onStop,
}: AudioPlayerProps) {
  const { isPlaying, state, play, pause, resume, stop, currentTrackPath } = useAudioPlayer();
  const [error, setError] = useState<string | null>(null);

  const handlePlay = async () => {
    if (!trackPath) {
      setError("No hay pista seleccionada");
      return;
    }

    try {
      setError(null);
      await play(trackPath);
      onPlay?.(trackPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reproducir");
    }
  };

  const handlePause = async () => {
    try {
      setError(null);
      await pause();
      onPause?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al pausar");
    }
  };

  const handleResume = async () => {
    try {
      setError(null);
      await resume();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reanudar");
    }
  };

  const handleStop = async () => {
    try {
      setError(null);
      await stop();
      onStop?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al detener");
    }
  };

  const displayTitle = currentTrackPath === trackPath ? trackTitle : "Sin pista seleccionada";

  return (
    <Card title="Reproductor de Audio">
      <div className="space-y-4">
        {/* Título de la pista */}
        <div className="text-center">
          <p className="text-lg font-semibold dark:text-white" data-testid="track-title">
            {displayTitle}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="playback-state">
            Estado: {state}
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div
            className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300"
            data-testid="error-message"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Controles de reproducción */}
        <div className="flex justify-center gap-2">
          {state === "stopped" && (
            <Button
              onClick={handlePlay}
              disabled={!trackPath}
              data-testid="play-button"
              aria-label="Reproducir"
            >
              ▶ Reproducir
            </Button>
          )}

          {state === "playing" && (
            <Button
              onClick={handlePause}
              data-testid="pause-button"
              aria-label="Pausar"
            >
              ⏸ Pausar
            </Button>
          )}

          {state === "paused" && (
            <>
              <Button
                onClick={handleResume}
                data-testid="resume-button"
                aria-label="Reanudar"
              >
                ▶ Reanudar
              </Button>
              <Button
                onClick={handleStop}
                variant="secondary"
                data-testid="stop-button"
                aria-label="Detener"
              >
                ⏹ Detener
              </Button>
            </>
          )}

          {state === "playing" && (
            <Button
              onClick={handleStop}
              variant="secondary"
              data-testid="stop-button"
              aria-label="Detener"
            >
              ⏹ Detener
            </Button>
          )}
        </div>

        {/* Información adicional */}
        {isPlaying && (
          <div
            className="text-center text-sm text-gray-600 dark:text-gray-400"
            data-testid="playing-indicator"
          >
            🎵 Reproduciendo...
          </div>
        )}
      </div>
    </Card>
  );
}

AudioPlayer.displayName = "AudioPlayer";
