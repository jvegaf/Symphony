/**
 * Editor de cue points
 * Muestra y permite editar cue points en el waveform
 */

import { useMemo } from 'react';
import { cn } from '../../utils/cn';
import type { CuePoint } from '../../types/analysis';

export interface CuePointEditorProps {
  /** Lista de cue points */
  cuePoints: CuePoint[];
  /** Duración total de la pista en segundos */
  duration: number;
  /** Ancho del contenedor en pixels */
  width: number;
  /** Alto del contenedor en pixels */
  height: number;
  /** Callback cuando se hace click en un cue point */
  onCuePointClick?: (cuePoint: CuePoint) => void;
  /** Callback cuando se arrastra un cue point */
  onCuePointDrag?: (cuePointId: string, newPosition: number) => void;
  /** ID del cue point seleccionado */
  selectedCuePointId?: string;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Colores por tipo de cue point
 */
const CUE_POINT_COLORS: Record<string, string> = {
  cue: '#3b82f6',      // blue-500
  intro: '#10b981',    // green-500
  outro: '#ef4444',    // red-500
  drop: '#f59e0b',     // amber-500
  vocal: '#8b5cf6',    // violet-500
  break: '#06b6d4',    // cyan-500
  custom: '#6b7280',   // gray-500
};

/**
 * Calcula la posición X de un cue point en pixels
 */
const calculateCuePointPosition = (
  position: number,
  duration: number,
  width: number
): number => {
  if (duration <= 0 || width <= 0) return 0;
  return (position / duration) * width;
};

export const CuePointEditor: React.FC<CuePointEditorProps> = ({
  cuePoints,
  duration,
  width,
  height,
  onCuePointClick,
  onCuePointDrag,
  selectedCuePointId,
  className,
}) => {
  const markers = useMemo(() => {
    return cuePoints.map((cue) => ({
      ...cue,
      x: calculateCuePointPosition(cue.position, duration, width),
      color: cue.color || CUE_POINT_COLORS[cue.type] || CUE_POINT_COLORS.custom,
    }));
  }, [cuePoints, duration, width]);

  if (markers.length === 0) {
    return null;
  }

  // AIDEV-NOTE: Patrón de pointer-events para overlays SVG:
  // - SVG container: pointer-events-none → pasa clicks al waveform debajo
  // - Elementos <g>: pointer-events-auto → captura clicks en marcadores
  // Esto permite seek en el waveform y clicks en cue points simultáneamente
  return (
    <svg
      className={cn('absolute inset-0 pointer-events-none', className)}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {markers.map((marker) => {
        const isSelected = selectedCuePointId === marker.id;
        const markerHeight = isSelected ? 20 : 16;

        return (
          <g
            key={marker.id}
            onClick={() => onCuePointClick?.(marker)}
            className={cn(
              'cursor-pointer transition-all pointer-events-auto',
              onCuePointDrag && 'hover:opacity-80'
            )}
          >
            {/* Línea vertical */}
            <line
              x1={marker.x}
              y1={0}
              x2={marker.x}
              y2={height}
              stroke={marker.color}
              strokeWidth={isSelected ? 3 : 2}
              opacity={0.6}
            />

            {/* Marcador superior */}
            <polygon
              points={`${marker.x},0 ${marker.x - 6},${markerHeight} ${marker.x + 6},${markerHeight}`}
              fill={marker.color}
              opacity={isSelected ? 1 : 0.8}
            />

            {/* Hotkey badge */}
            {marker.hotkey && (
              <g>
                <circle
                  cx={marker.x}
                  cy={markerHeight + 12}
                  r={10}
                  fill={marker.color}
                  opacity={0.9}
                />
                <text
                  x={marker.x}
                  y={markerHeight + 16}
                  fontSize={10}
                  fill="white"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {marker.hotkey}
                </text>
              </g>
            )}

            {/* Label */}
            {marker.label && (
              <text
                x={marker.x + 8}
                y={14}
                fontSize={11}
                fill={marker.color}
                opacity={0.9}
                className="select-none"
              >
                {marker.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

CuePointEditor.displayName = 'CuePointEditor';
