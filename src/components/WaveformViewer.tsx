import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Props del componente WaveformViewer
 */
export interface WaveformViewerProps {
  /** Ruta de la pista a visualizar */
  audioPath: string;
  /** Altura del waveform en píxeles */
  height?: number;
  /** Color del waveform */
  waveColor?: string;
  /** Color del progreso */
  progressColor?: string;
  /** Callback cuando se hace click en el waveform */
  onSeek?: (time: number) => void;
  /** Callback cuando se carga el waveform */
  onReady?: () => void;
  /** Callback cuando hay un error */
  onError?: (error: string) => void;
}

/**
 * Componente de visualización de waveforms
 * 
 * Utiliza WaveSurfer.js para renderizar y permitir navegación
 * sobre la forma de onda del audio.
 * 
 * @component
 * @example
 * ```tsx
 * <WaveformViewer
 *   audioPath="/music/song.mp3"
 *   height={128}
 *   onSeek={(time) => console.log('Seek to:', time)}
 * />
 * ```
 */
export function WaveformViewer({
  audioPath,
  height = 128,
  waveColor = "#3b82f6",
  progressColor = "#1e40af",
  onSeek,
  onReady,
  onError,
}: WaveformViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Inicializar WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioPath) return;

    // Limpiar instancia anterior
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    setIsLoading(true);
    setError(null);

    try {
      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        height,
        waveColor,
        progressColor,
        cursorColor: "#60a5fa",
        barWidth: 2,
        barGap: 1,
        responsive: true,
        normalize: true,
      });

      // Event listeners
      wavesurfer.on("ready", () => {
        setIsLoading(false);
        setDuration(wavesurfer.getDuration());
        onReady?.();
      });

      wavesurfer.on("error", (err) => {
        const errorMessage = err instanceof Error ? err.message : "Error al cargar waveform";
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
      });

      wavesurfer.on("timeupdate", (time) => {
        setCurrentTime(time);
      });

      wavesurfer.on("play", () => {
        setIsPlaying(true);
      });

      wavesurfer.on("pause", () => {
        setIsPlaying(false);
      });

      wavesurfer.on("seeking", (time) => {
        setCurrentTime(time);
      });

      wavesurfer.on("interaction", (time) => {
        onSeek?.(time);
      });

      // Cargar audio
      wavesurfer.load(audioPath);

      wavesurferRef.current = wavesurfer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al inicializar waveform";
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }

    // Cleanup
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioPath, height, waveColor, progressColor, onSeek, onReady, onError]);

  // Aplicar zoom
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(zoom);
    }
  }, [zoom]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 100));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 1));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card title="Visualización de Waveform">
      <div className="space-y-4">
        {/* Waveform Container */}
        <div
          ref={containerRef}
          className="w-full bg-gray-100 dark:bg-gray-800 rounded"
          data-testid="waveform-container"
        />

        {/* Loading State */}
        {isLoading && (
          <div
            className="text-center text-gray-600 dark:text-gray-400"
            data-testid="loading-indicator"
          >
            Cargando waveform...
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300"
            data-testid="error-message"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Controls */}
        {!isLoading && !error && (
          <>
            {/* Time Display */}
            <div
              className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
              data-testid="time-display"
            >
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handlePlayPause}
                data-testid="play-pause-button"
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? "⏸ Pausar" : "▶ Reproducir"}
              </Button>

              <div className="flex gap-1">
                <Button
                  onClick={handleZoomOut}
                  variant="secondary"
                  disabled={zoom <= 1}
                  data-testid="zoom-out-button"
                  aria-label="Alejar zoom"
                >
                  -
                </Button>
                <Button
                  onClick={handleZoomReset}
                  variant="secondary"
                  data-testid="zoom-reset-button"
                  aria-label="Resetear zoom"
                >
                  {zoom}x
                </Button>
                <Button
                  onClick={handleZoomIn}
                  variant="secondary"
                  disabled={zoom >= 100}
                  data-testid="zoom-in-button"
                  aria-label="Acercar zoom"
                >
                  +
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

WaveformViewer.displayName = "WaveformViewer";
