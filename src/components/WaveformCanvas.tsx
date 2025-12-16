/**
 * Waveform renderer con Canvas nativo
 * 
 * AIDEV-NOTE: Implementación propia en lugar de WaveSurfer.js para:
 * - Control total del rendering progresivo (chunks sin estirar)
 * - Progreso basado en tiempo real (no en peaks)
 * - Hover y seek sin dependencias externas
 * - Más simple y eficiente
 */

import { useEffect, useRef, useState } from 'react';
import { useWaveform } from '../hooks/useWaveform';

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
  waveColor = '#3b82f6',
  progressColor = '#1e40af',
  hoverColor = '#60a5fa',
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
    shouldGenerate ? duration : undefined
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
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [height]);

  // Renderizar waveform
  useEffect(() => {
    if (!canvasRef.current || !peaks || peaks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // AIDEV-NOTE: Renderizar SOLO los peaks que tenemos (streaming progresivo)
    // No importa si son todos o solo algunos - renderizamos lo que hay
    const peaksToRender = peaks.length;

    console.log(`🎨 Renderizando waveform: ${peaksToRender} peaks, progreso: ${currentTime.toFixed(2)}/${duration.toFixed(2)}s`);

    if (peaksToRender === 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }

    // Ancho por peak
    const barWidth = 2;
    const barGap = 1;
    const barStep = barWidth + barGap;

    // AIDEV-NOTE: Progreso basado en TIEMPO, no en peaks
    // Calcular posición del progreso en píxeles basado en currentTime/duration
    const progressX = duration > 0 ? (currentTime / duration) * width : 0;

    // Renderizar cada peak que tengamos
    for (let i = 0; i < peaksToRender; i++) {
      const peak = peaks[i];
      
      // AIDEV-NOTE: Renderizar incluso peaks con valor 0 (silencio)
      // Esto permite ver el waveform completo aunque haya partes silenciosas
      const x = i * barStep;
      if (x > width) break; // No renderizar fuera del canvas

      // Altura de la barra (normalizada entre 0 y 1)
      // Mínimo 2px para que los silencios sean visibles
      const barHeight = Math.max(2, peak * canvasHeight * 0.9);
      const y = (canvasHeight - barHeight) / 2;

      // Color según si está antes o después del progreso (basado en TIEMPO)
      ctx.fillStyle = x < progressX ? progressColor : waveColor;
      
      // Dibujar barra redondeada
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1);
      ctx.fill();
    }

    // Dibujar línea de progreso (cursor vertical en la posición actual)
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
  }, [peaks, duration, currentTime, hoverX, waveColor, progressColor, hoverColor]);

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
  const isUnsupportedCodec = error?.includes('unsupported codec') || error?.includes('unsupported feature');
  
  // Formatear tiempo para el tooltip
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2" style={{ minHeight: '96px' }}>
      {/* biome-ignore lint/a11y/useSemanticElements: Canvas container needs div for sizing */}
      <div
        ref={containerRef}
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer relative"
        style={{ height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
        
        {/* Tooltip de tiempo al hacer hover */}
        {hoverTime !== null && hoverX !== null && (
          <div
            className="absolute bottom-0 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded pointer-events-none"
            style={{
              left: `${hoverX}px`,
              transform: 'translateX(-50%)',
              marginBottom: '4px',
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
          style={{ minHeight: '24px' }}
        >
          ⚠️ Formato de audio no soportado para waveform (M4A/AAC)
        </div>
      )}

      {/* Error Message - Otros errores */}
      {error && !isUnsupportedCodec && !error.includes('Cancelled') && (
        <div
          className="text-center text-xs text-red-600 dark:text-red-400"
          style={{ minHeight: '24px' }}
        >
          ❌ Error: {error}
        </div>
      )}
      
      {/* Spacer */}
      {!error && (
        <div style={{ minHeight: '24px' }} />
      )}
    </div>
  );
}

WaveformCanvas.displayName = 'WaveformCanvas';
