/**
 * Editor de loops
 * Muestra y permite editar loops en el waveform
 */

import { useMemo } from 'react';
import { cn } from '@/utils/cn';
import type { Loop } from '@/types/analysis';

export interface LoopEditorProps {
  /** Lista de loops */
  loops: Loop[];
  /** Duración total de la pista en segundos */
  duration: number;
  /** Ancho del contenedor en pixels */
  width: number;
  /** Alto del contenedor en pixels */
  height: number;
  /** Callback cuando se hace click en un loop */
  onLoopClick?: (loop: Loop) => void;
  /** Callback cuando se arrastra el inicio de un loop */
  onLoopStartDrag?: (loopId: number, newStart: number) => void;
  /** Callback cuando se arrastra el fin de un loop */
  onLoopEndDrag?: (loopId: number, newEnd: number) => void;
  /** ID del loop seleccionado */
  selectedLoopId?: number;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Calcula las coordenadas de un loop en pixels
 */
const calculateLoopCoordinates = (
  loopStart: number,
  loopEnd: number,
  duration: number,
  width: number
): { x: number; width: number } => {
  if (duration <= 0 || width <= 0) {
    return { x: 0, width: 0 };
  }

  const x = (loopStart / duration) * width;
  const loopWidth = ((loopEnd - loopStart) / duration) * width;

  return { x, width: loopWidth };
};

/**
 * Formatea duración en segundos a formato MM:SS
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const LoopEditor: React.FC<LoopEditorProps> = ({
  loops,
  duration,
  width,
  height,
  onLoopClick,
  onLoopStartDrag,
  onLoopEndDrag,
  selectedLoopId,
  className,
}) => {
  const regions = useMemo(() => {
    return loops.map((loop) => {
      const coords = calculateLoopCoordinates(
        loop.loopStart,
        loop.loopEnd,
        duration,
        width
      );
      return {
        ...loop,
        ...coords,
        loopDuration: loop.loopEnd - loop.loopStart,
      };
    });
  }, [loops, duration, width]);

  if (regions.length === 0) {
    return null;
  }

  return (
    <svg
      className={cn('absolute inset-0', className)}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {regions.map((region) => {
        const isSelected = selectedLoopId === region.id;
        const isActive = region.isActive;
        const opacity = isActive ? 0.3 : 0.15;
        const strokeOpacity = isActive ? 0.6 : 0.4;

        return (
          <g key={region.id}>
            {/* Región sombreada */}
            <rect
              x={region.x}
              y={0}
              width={region.width}
              height={height}
              fill={isActive ? '#10b981' : '#6b7280'}
              opacity={opacity}
              onClick={() => onLoopClick?.(region)}
              className={cn(
                'cursor-pointer transition-all',
                isSelected && 'stroke-2'
              )}
              stroke={isActive ? '#10b981' : '#6b7280'}
              strokeWidth={isSelected ? 2 : 1}
              strokeOpacity={strokeOpacity}
            />

            {/* Marcador de inicio */}
            <g
              onClick={() => onLoopClick?.(region)}
              className={cn(
                onLoopStartDrag && 'cursor-ew-resize hover:opacity-80'
              )}
            >
              <line
                x1={region.x}
                y1={0}
                x2={region.x}
                y2={height}
                stroke={isActive ? '#10b981' : '#6b7280'}
                strokeWidth={isSelected ? 3 : 2}
                opacity={strokeOpacity}
              />
              <rect
                x={region.x - 3}
                y={height / 2 - 15}
                width={6}
                height={30}
                fill={isActive ? '#10b981' : '#6b7280'}
                opacity={strokeOpacity + 0.2}
                rx={2}
              />
            </g>

            {/* Marcador de fin */}
            <g
              onClick={() => onLoopClick?.(region)}
              className={cn(
                onLoopEndDrag && 'cursor-ew-resize hover:opacity-80'
              )}
            >
              <line
                x1={region.x + region.width}
                y1={0}
                x2={region.x + region.width}
                y2={height}
                stroke={isActive ? '#10b981' : '#6b7280'}
                strokeWidth={isSelected ? 3 : 2}
                opacity={strokeOpacity}
              />
              <rect
                x={region.x + region.width - 3}
                y={height / 2 - 15}
                width={6}
                height={30}
                fill={isActive ? '#10b981' : '#6b7280'}
                opacity={strokeOpacity + 0.2}
                rx={2}
              />
            </g>

            {/* Label con duración */}
            <g>
              <rect
                x={region.x + region.width / 2 - 40}
                y={height / 2 - 12}
                width={80}
                height={24}
                fill="black"
                opacity={0.7}
                rx={4}
              />
              <text
                x={region.x + region.width / 2}
                y={height / 2}
                fontSize={11}
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="bold"
                className="select-none"
              >
                {region.label || 'Loop'}
              </text>
              <text
                x={region.x + region.width / 2}
                y={height / 2 + 10}
                fontSize={9}
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
                opacity={0.8}
                className="select-none"
              >
                {formatDuration(region.loopDuration)}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

LoopEditor.displayName = 'LoopEditor';
