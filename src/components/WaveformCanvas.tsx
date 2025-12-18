/**
 * Waveform renderer con Canvas nativo
 *
 * AIDEV-NOTE: Implementación propia en lugar de WaveSurfer.js para:
 * - Control total del rendering progresivo (chunks sin estirar)
 * - Progreso basado en tiempo real (no en peaks)
 * - Hover y seek sin dependencias externas
 * - Más simple y eficiente
 */

import { useEffect, useRef, useState } from "react";
import { useWaveform } from "../hooks/useWaveform";

export interface WaveformCanvasProps {
  /** UUID de la pista */
  trackId?: string;
  /** Ruta completa al archivo de audio */
  trackPath?: string;
  /** Duración en segundos (del metadata) */
  duration?: number;
  /** Posición actual de reproducción en segundos */
  currentTime?: number;
  /** Altura del waveform en píxeles */
  height?: number;
  /** Color del waveform no reproducido */
  waveColor?: string;
  /** Color del waveform ya reproducido */
  progressColor?: string;
  /** Color del cursor hover */
  hoverColor?: string;
  /** Callback cuando se hace click para seek */
  onSeek?: (time: number) => void;
  /** Si debe generar el waveform */
  shouldGenerate?: boolean;
}

export function WaveformCanvas({
  trackId,
  trackPath,
  duration = 0,
  currentTime = 0,
  height = 64,
  waveColor = "#3b82f6",
  progressColor = "#1e40af",
  hoverColor = "#60a5fa",
  onSeek,
  shouldGenerate = false,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Obtener peaks del hook
  const { peaks, error } = useWaveform(
    shouldGenerate ? trackId : undefined,
    shouldGenerate ? trackPath : undefined,
    shouldGenerate ? duration : undefined,
  );

  // Ajustar canvas al tamaño del contenedor
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;

        // Set canvas size considering DPR for crisp rendering
        canvas.width = rect.width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${height}px`;
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [height]);

  // Renderizar waveform
  useEffect(() => {
    if (!canvasRef.current || !peaks || peaks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const peaksCount = peaks.length;

    if (peaksCount === 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }

    // AIDEV-NOTE: SOLUCIÓN AL PROBLEMA DE SINCRONIZACIÓN
    //
    // El problema era que cada peak se renderizaba en posición fija (i * barStep),
    // lo que causaba que el waveform se saliera del canvas cuando había muchos peaks.
    //
    // La solución es ESCALAR los peaks al ancho del canvas:
    // - Cada peak representa un porcentaje de la duración total
    // - La posición X de cada peak = (índice / total_peaks) * ancho_canvas
    // - Esto garantiza que TODOS los peaks quepan en el canvas

    const barWidth = 2;
    const minBarGap = 1;

    // Calcular cuántas barras caben en el canvas
    const maxBars = Math.floor(width / (barWidth + minBarGap));

    // Si tenemos más peaks que barras disponibles, necesitamos resamplear
    // Si tenemos menos peaks, espaciamos las barras uniformemente
    const needsResampling = peaksCount > maxBars;
    const barsToRender = needsResampling ? maxBars : peaksCount;

    // Calcular el espaciado real entre barras para ocupar todo el ancho
    const totalBarSpace = barsToRender * barWidth;
    const totalGapSpace = width - totalBarSpace;
    const barGap = barsToRender > 1 ? totalGapSpace / (barsToRender - 1) : 0;
    const barStep = barWidth + barGap;

    // AIDEV-NOTE: Progreso basado en TIEMPO
    const progressX = duration > 0 ? (currentTime / duration) * width : 0;

    console.log(
      `🎨 Waveform: ${peaksCount} peaks → ${barsToRender} barras, ancho=${width.toFixed(0)}px, progreso=${currentTime.toFixed(1)}/${duration.toFixed(1)}s`,
    );

    // Renderizar barras
    for (let i = 0; i < barsToRender; i++) {
      // Calcular qué peak(s) corresponden a esta barra
      let peakValue: number;

      if (needsResampling) {
        // Resamplear: tomar el máximo de los peaks que corresponden a esta barra
        const startIdx = Math.floor((i / barsToRender) * peaksCount);
        const endIdx = Math.floor(((i + 1) / barsToRender) * peaksCount);

        let maxPeak = 0;
        for (let j = startIdx; j < endIdx && j < peaksCount; j++) {
          maxPeak = Math.max(maxPeak, peaks[j]);
        }
        peakValue = maxPeak;
      } else {
        // Sin resamplear: usar el peak directamente
        peakValue = peaks[i];
      }

      // Posición X de la barra (escalada al ancho del canvas)
      const x = i * barStep;

      // Altura de la barra (mínimo 2px para silencios)
      const barHeight = Math.max(2, peakValue * canvasHeight * 0.9);
      const y = (canvasHeight - barHeight) / 2;

      // Color según progreso de reproducción
      ctx.fillStyle = x < progressX ? progressColor : waveColor;

      // Dibujar barra redondeada
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    }

    // Dibujar línea de progreso
    if (progressX > 0 && progressX <= width) {
      ctx.fillStyle = progressColor;
      ctx.fillRect(progressX - 1, 0, 2, canvasHeight);
    }

    // Dibujar hover line
    if (hoverX !== null && hoverX >= 0 && hoverX <= width) {
      ctx.strokeStyle = hoverColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, canvasHeight);
      ctx.stroke();
    }

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [
    peaks,
    duration,
    currentTime,
    hoverX,
    waveColor,
    progressColor,
    hoverColor,
  ]);

  // Manejar hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverX(x);

    // Calcular tiempo en la posición del hover
    if (duration > 0) {
      const progress = x / rect.width;
      const time = progress * duration;
      setHoverTime(time);
    }
  };

  const handleMouseLeave = () => {
    setHoverX(null);
    setHoverTime(null);
  };

  // Manejar click para seek
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !duration || !onSeek) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const time = progress * duration;
    onSeek(time);
  };

  // Detectar error de codec
  const isUnsupportedCodec =
    error?.includes("unsupported codec") ||
    error?.includes("unsupported feature");

  // Formatear tiempo para el tooltip
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2" style={{ minHeight: "96px" }}>
      {/* biome-ignore lint/a11y/useSemanticElements: Canvas container needs div for sizing */}
      <div
        ref={containerRef}
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer relative"
        style={{ height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* Tooltip de tiempo al hacer hover */}
        {hoverTime !== null && hoverX !== null && (
          <div
            className="absolute bottom-0 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded pointer-events-none"
            style={{
              left: `${hoverX}px`,
              transform: "translateX(-50%)",
              marginBottom: "4px",
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Error Message - Codec no soportado */}
      {error && isUnsupportedCodec && (
        <div
          className="text-center text-xs text-yellow-600 dark:text-yellow-400"
          style={{ minHeight: "24px" }}
        >
          ⚠️ Formato de audio no soportado para waveform (M4A/AAC)
        </div>
      )}

      {/* Error Message - Otros errores */}
      {error && !isUnsupportedCodec && !error.includes("Cancelled") && (
        <div
          className="text-center text-xs text-red-600 dark:text-red-400"
          style={{ minHeight: "24px" }}
        >
          ❌ Error: {error}
        </div>
      )}
    </div>
  );
}

WaveformCanvas.displayName = "WaveformCanvas";
