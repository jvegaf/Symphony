/**
 * Overlay de beatgrid sobre waveform
 * Muestra grid vertical de beats basado en BPM y offset
 */

import { useMemo } from 'react';
import { cn } from '../../utils/cn';

export interface BeatgridOverlayProps {
  /** Duración total de la pista en segundos */
  duration: number;
  /** BPM de la pista */
  bpm: number;
  /** Offset del primer beat en segundos */
  offset: number;
  /** Ancho del contenedor en pixels */
  width: number;
  /** Alto del contenedor en pixels */
  height: number;
  /** Mostrar números de beat */
  showBeatNumbers?: boolean;
  /** Confidence del análisis (0-100) */
  confidence?: number;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Calcula posiciones de beats en el timeline
 */
const calculateBeatPositions = (
  duration: number,
  bpm: number,
  offset: number,
  width: number
): Array<{ position: number; beatNumber: number }> => {
  if (bpm <= 0 || duration <= 0 || width <= 0) {
    return [];
  }

  const beatInterval = 60 / bpm; // Segundos entre beats
  const beats: Array<{ position: number; beatNumber: number }> = [];

  let beatTime = offset;
  let beatNumber = 1;

  while (beatTime < duration) {
    const position = (beatTime / duration) * width;
    beats.push({ position, beatNumber });
    
    beatTime += beatInterval;
    beatNumber++;
  }

  return beats;
};

export const BeatgridOverlay: React.FC<BeatgridOverlayProps> = ({
  duration,
  bpm,
  offset,
  width,
  height,
  showBeatNumbers = false,
  confidence,
  className,
}) => {
  const beats = useMemo(
    () => calculateBeatPositions(duration, bpm, offset, width),
    [duration, bpm, offset, width]
  );

  if (beats.length === 0) {
    return null;
  }

  // Color de las líneas basado en confidence
  const lineOpacity = confidence !== undefined 
    ? Math.max(0.2, confidence / 100 * 0.5)
    : 0.3;

  return (
    <svg
      className={cn('absolute inset-0 pointer-events-none', className)}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {beats.map(({ position, beatNumber }) => {
        // Destacar cada 4 beats (downbeat)
        const isDownbeat = beatNumber % 4 === 1;
        const strokeWidth = isDownbeat ? 2 : 1;
        const opacity = isDownbeat ? lineOpacity * 1.5 : lineOpacity;

        return (
          <g key={beatNumber}>
            <line
              x1={position}
              y1={0}
              x2={position}
              y2={height}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              opacity={opacity}
              className="text-blue-500"
            />
            {showBeatNumbers && isDownbeat && (
              <text
                x={position + 2}
                y={12}
                fontSize={10}
                fill="currentColor"
                opacity={opacity}
                className="text-blue-500"
              >
                {beatNumber}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

BeatgridOverlay.displayName = 'BeatgridOverlay';
