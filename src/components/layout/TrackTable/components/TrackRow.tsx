import { memo, DragEvent } from 'react';
import { Check, GripVertical } from 'lucide-react';
import { StarRating } from '../../../ui/StarRating';
import { formatDuration, formatDate } from '../utils/formatters';
import type { Track } from '../../../../types/library';
import type { SortColumn } from '../hooks/useTrackSorting';

export interface TrackRowProps {
  track: Track;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  isFocused: boolean;
  visibleColumns: Set<SortColumn>;
  onClick: (track: Track, index: number, e: React.MouseEvent) => void;
  onDoubleClick: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  onUpdateRating: (trackId: string, rating: number) => void;
  /** Habilitar drag and drop */
  draggable?: boolean;
  /** IDs de tracks seleccionados (para drag múltiple) */
  selectedTrackIds?: string[];
  /** Callback cuando se inicia el drag */
  onDragStart?: (trackIds: string[], e: DragEvent<HTMLTableRowElement>) => void;
  /** Callback cuando termina el drag */
  onDragEnd?: () => void;
  /** Modo reordenamiento (muestra grip handle) */
  reorderMode?: boolean;
  /** Callback para reordenamiento por drop */
  onDragOver?: (e: DragEvent<HTMLTableRowElement>, index: number) => void;
  /** Callback para drop en reordenamiento */
  onDrop?: (e: DragEvent<HTMLTableRowElement>, targetIndex: number) => void;
  /** Indica si este row es el drop target actual */
  isDropTarget?: boolean;
  /** Indica si estamos mostrando una playlist (muestra posición en lugar de fixed) */
  isPlaylistView?: boolean;
}

/**
 * Fila de track con todos los datos y estilos visuales
 * Maneja selección, focus, reproducción activa, y contexto
 * Solo renderiza columnas visibles según visibleColumns
 * 
 * AIDEV-NOTE: El orden de las columnas debe coincidir EXACTAMENTE con TableHeader
 * AIDEV-NOTE: Memoizado con React.memo para evitar re-renders innecesarios
 * cuando otras filas de la tabla cambian. Solo se re-renderiza cuando
 * cambian sus props específicas (track, isSelected, isPlaying, etc.)
 */
const TrackRowComponent = ({
  track,
  index,
  isSelected,
  isPlaying,
  isFocused,
  visibleColumns,
  onClick,
  onDoubleClick,
  onContextMenu,
  onUpdateRating,
  draggable = false,
  selectedTrackIds = [],
  onDragStart,
  onDragEnd,
  reorderMode = false,
  onDragOver,
  onDrop,
  isDropTarget = false,
  isPlaylistView = false,
}: TrackRowProps) => {
  /**
   * Maneja el inicio del drag
   * Si el track está seleccionado, arrastra todos los seleccionados
   * Si no, solo arrastra este track
   */
  const handleDragStart = (e: DragEvent<HTMLTableRowElement>) => {
    if (!onDragStart || !track.id) return;
    
    const trackIds = isSelected && selectedTrackIds.length > 0
      ? selectedTrackIds
      : [track.id];
    
    onDragStart(trackIds, e);
  };

  const handleDragOver = (e: DragEvent<HTMLTableRowElement>) => {
    if (reorderMode && onDragOver) {
      e.preventDefault();
      onDragOver(e, index);
    }
  };

  const handleDrop = (e: DragEvent<HTMLTableRowElement>) => {
    if (reorderMode && onDrop) {
      e.preventDefault();
      onDrop(e, index);
    }
  };

  return (
    <tr
      data-track-id={track.id}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors
        ${
          isPlaying
            ? 'bg-blue-100 dark:bg-blue-950'
            : isSelected
            ? 'bg-blue-100/70 dark:bg-blue-800/50'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
        ${isFocused ? 'ring-2 ring-blue-400 dark:ring-blue-600 ring-inset' : ''}
        ${isDropTarget ? 'border-t-2 border-t-primary' : ''}
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      onClick={(e) => onClick(track, index, e)}
      onDoubleClick={() => onDoubleClick(track)}
      onContextMenu={(e) => onContextMenu(e, track)}
    >
      {/* Grip handle para reordenamiento */}
      {reorderMode && (
        <td className="px-1 py-2 w-8 text-gray-400 dark:text-gray-500">
          <GripVertical className="w-4 h-4" />
        </td>
      )}
      {/* Columna de posición - solo en vista de playlist */}
      {isPlaylistView && (
        <td className="px-2 py-2 text-sm text-center text-gray-500 dark:text-gray-400 w-10">
          {index + 1}
        </td>
      )}
      {/* Fixed indicator - solo en vista de biblioteca (no playlist) */}
      {!isPlaylistView && visibleColumns.has('fixed') && (
        <td className="px-2 py-2 text-sm text-center w-10">
          {track.beatportId && (
            <span className="inline-flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </span>
          )}
        </td>
      )}

      {/* Title */}
      {visibleColumns.has('title') && (
        <td className="px-2 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={track.title}>
          {track.title}
        </td>
      )}

      {/* Artist */}
      {visibleColumns.has('artist') && (
        <td className="px-2 py-2 text-sm text-gray-700 dark:text-gray-300 truncate" title={track.artist}>
          {track.artist}
        </td>
      )}

      {/* Album */}
      {visibleColumns.has('album') && (
        <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 truncate" title={track.album || '-'}>
          {track.album || '-'}
        </td>
      )}

      {/* Duration */}
      {visibleColumns.has('duration') && (
        <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-16">
          {formatDuration(track.duration)}
        </td>
      )}

      {/* BPM */}
      {visibleColumns.has('bpm') && (
        <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-14">
          {track.bpm ?? '-'}
        </td>
      )}

      {/* Rating */}
      {visibleColumns.has('rating') && (
        <td className="px-2 py-2 text-sm w-24">
          <StarRating
            value={track.rating ?? 0}
            onChange={(newRating) => onUpdateRating(track.id ?? '', newRating)}
            size="sm"
          />
        </td>
      )}

      {/* Year */}
      {visibleColumns.has('year') && (
        <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-14">
          {track.year ?? '-'}
        </td>
      )}

      {/* Date Added */}
      {visibleColumns.has('dateAdded') && (
        <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-24">
          {formatDate(track.dateAdded)}
        </td>
      )}

      {/* Bitrate */}
      {visibleColumns.has('bitrate') && (
        <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-20">
          {track.bitrate ? `${track.bitrate}` : '-'}
        </td>
      )}

      {/* Genre */}
      {visibleColumns.has('genre') && (
        <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-24 truncate" title={track.genre ?? '-'}>
          {track.genre ?? '-'}
        </td>
      )}

      {/* Key */}
      {visibleColumns.has('key') && (
        <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 w-20 whitespace-nowrap" title={track.key ?? '-'}>
          {track.key ?? '-'}
        </td>
      )}
    </tr>
  );
};

/**
 * Memoized TrackRow - solo se re-renderiza cuando sus props cambian
 * AIDEV-NOTE: Comparación superficial por defecto es suficiente porque:
 * - track.id cambia solo si el track cambia
 * - isSelected/isPlaying/isFocused son booleanos
 * - visibleColumns es un Set que solo cambia cuando el usuario modifica columnas
 */
export const TrackRow = memo(TrackRowComponent);
TrackRow.displayName = 'TrackRow';
