/**
 * WaveformViewer con streaming progresivo estilo Musicat
 * 
 * AIDEV-NOTE: Reescrito para sistema de waveform con eventos:
 * - Usa useWaveform hook para obtener peaks con cache + streaming
 * - Carga peaks sin audio: wavesurfer.load("", [peaks], duration)
 * - Solo visualización + seek (sin playback propio)
 * - Muestra progreso durante generación
 * - Simple, < 500 líneas
 */

import { useEffect, useRef } from 'react';

import WaveSurfer from 'wavesurfer.js';

import { useWaveform } from '../hooks/useWaveform';

/**
 * Props del componente WaveformViewer
 */
export interface WaveformViewerProps {
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
  /** Color del waveform */
  waveColor?: string;
  /** Color del progreso */
  progressColor?: string;
  /** Callback cuando se hace click en el waveform para seek */
  onSeek?: (time: number) => void;
  /** Callback cuando se carga el waveform */
  onReady?: () => void;
  /** Si debe generar el waveform (true cuando se reproduce) */
  shouldGenerate?: boolean;
}

/**
 * Componente de visualización de waveforms con streaming progresivo
 * 
 * Utiliza WaveSurfer.js para renderizar peaks pre-generados.
 * No carga el audio, solo visualiza los peaks desde cache/streaming.
 * 
 * @component
 * @example
 * ```tsx
 * <WaveformViewer
 *   trackId="uuid-123"
 *   trackPath="/music/song.mp3"
 *   duration={180.5}
 *   onSeek={(time) => playerSeekTo(time)}
 * />
 * ```
 */
export function WaveformViewer({
  trackId,
  trackPath,
  duration,
  currentTime = 0,
  height = 128,
  waveColor = '#3b82f6',
  progressColor = '#1e40af',
  onSeek,
  onReady,
  shouldGenerate = false, // Por defecto NO genera
}: WaveformViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  
  // AIDEV-NOTE: Use refs for callbacks to avoid re-renders
  const onSeekRef = useRef(onSeek);
  const onReadyRef = useRef(onReady);
  
  useEffect(() => {
    onSeekRef.current = onSeek;
    onReadyRef.current = onReady;
  }, [onSeek, onReady]);

  // AIDEV-NOTE: Solo obtener waveform si shouldGenerate es true
  // Esto evita generar al seleccionar, solo al reproducir
  const { peaks, error } = useWaveform(
    shouldGenerate ? trackId : undefined,
    shouldGenerate ? trackPath : undefined,
    shouldGenerate ? duration : undefined
  );

  // Inicializar WaveSurfer cuando tengamos peaks
  // AIDEV-NOTE: Se actualiza cada vez que cambien los peaks (streaming progresivo!)
  // Usa `duration` prop directamente, no del hook (puede ser undefined si shouldGenerate=false)
  useEffect(() => {
    // AIDEV-NOTE: Debug detallado para diagnosticar problema de sincronización
    if (peaks && duration) {
      const containerWidth = containerRef.current?.offsetWidth || 0;
      const peaksPerSecond = peaks.length / duration;
      const pxPerPeak = containerWidth / peaks.length;
      const barSpacing = 1; // barWidth(1) + barGap(0) - ACTUALIZADO
      const requiredWidth = peaks.length * barSpacing;
      
      console.log('🔍 WaveformViewer - Diagnóstico de Sincronización:', {
        hasContainer: !!containerRef.current,
        containerWidth: containerWidth + 'px',
        peaksLength: peaks.length,
        duration: duration.toFixed(2) + 's',
        peaksPerSecond: peaksPerSecond.toFixed(2),
        pxPerPeak: pxPerPeak.toFixed(2) + 'px',
        barSpacing: barSpacing + 'px (barWidth=1 + barGap=0)',
        requiredWidth: requiredWidth + 'px',
        fitsInCanvas: containerWidth >= requiredWidth ? '✅ SÍ' : '❌ NO',
        overflow: containerWidth >= requiredWidth ? '0px' : (requiredWidth - containerWidth) + 'px',
      });
    }
    
    if (!containerRef.current || !peaks || !duration) return;

    // Limpiar instancia anterior
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    try {
      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        height,
        waveColor,
        progressColor,
        cursorColor: '#60a5fa',
        cursorWidth: 2,
        // AIDEV-NOTE: Ajustado para mejor sincronización tiempo/espacio
        // barWidth=1 + barGap=0 permite ~2x más peaks en mismo ancho
        // Con WAVEFORM_WINDOW_SIZE=16384 → ~484 peaks/180s → fit perfecto en 1920px
        barWidth: 1,
        barGap: 0,
        normalize: true,
        interact: true, // Permitir click para seek
        // AIDEV-NOTE: Activar hover para resaltar posición bajo el cursor
        hideScrollbar: true,
        autoScroll: false,
        autoCenter: false,
      });

      // Evento de ready
      wavesurfer.on('ready', () => {
        onReadyRef.current?.();
      });

      // Evento de click para seek
      wavesurfer.on('interaction', (time) => {
        onSeekRef.current?.(time);
      });

      // AIDEV-NOTE: Cargar SOLO peaks sin audio (estilo Musicat)
      // wavesurfer.load(url, peaks, duration)
      // url = "" → no carga audio
      // peaks = [Float32Array] → datos de waveform
      // duration = segundos → longitud total
      // Se llama cada vez que `peaks` cambia, permitiendo streaming progresivo
      console.log('📊 Loading waveform with', peaks.length, 'peaks, duration:', duration);
      wavesurfer.load('', [peaks], duration);

      wavesurferRef.current = wavesurfer;
    } catch (err) {
      console.error('Error inicializando WaveSurfer:', err);
    }

    // Cleanup
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
    // AIDEV-NOTE: onSeek/onReady handled via refs, not in deps
  }, [peaks, duration, height, waveColor, progressColor]);

  // AIDEV-NOTE: Actualizar posición de reproducción en el waveform
  useEffect(() => {
    if (wavesurferRef.current && currentTime !== undefined) {
      console.log('⏱️ Actualizando posición waveform:', currentTime, 'segundos');
      wavesurferRef.current.setTime(currentTime);
    }
  }, [currentTime]);

  // Detectar si es un error de codec no soportado
  const isUnsupportedCodec = error?.includes('unsupported codec') || error?.includes('unsupported feature');

  return (
    <div className="space-y-2" style={{ minHeight: '96px' }}>
      {/* Waveform Container - ALTURA FIJA para evitar saltos de layout */}
      {/* AIDEV-NOTE: Usar height fija (no minHeight) para que el layout no cambie
          cuando aparece/desaparece el waveform. Esto evita que las filas de la tabla
          se muevan al hacer doble click. 
          Contenedor padre tiene minHeight=96px para incluir canvas + mensajes. */}
      <div
        ref={containerRef}
        className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 waveform-container"
        style={{ height: `${height}px` }}
        data-testid="waveform-container"
      />

      {/* Estilos CSS para el hover del waveform */}
      <style>{`
        .waveform-container {
          cursor: pointer;
        }
        .waveform-container:hover wave {
          opacity: 0.8;
        }
      `}</style>

      {/* Error Message - Codec no soportado */}
      {error && isUnsupportedCodec && (
        <div
          className="text-center text-xs text-yellow-600 dark:text-yellow-400"
          data-testid="error-message"
          style={{ minHeight: '24px' }}
        >
          ⚠️ Formato de audio no soportado para waveform (M4A/AAC)
        </div>
      )}

      {/* Error Message - Otros errores */}
      {error && !isUnsupportedCodec && !error.includes('Cancelled') && (
        <div
          className="text-center text-xs text-red-600 dark:text-red-400"
          data-testid="error-message"
          style={{ minHeight: '24px' }}
        >
          ❌ Error: {error}
        </div>
      )}
      
      {/* Spacer para mantener altura cuando no hay error */}
      {!error && (
        <div style={{ minHeight: '24px' }} />
      )}
    </div>
  );
}

WaveformViewer.displayName = 'WaveformViewer';
