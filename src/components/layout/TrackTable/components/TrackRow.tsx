import { Check } from 'lucide-react';
import { StarRating } from '../../../ui/StarRating';
import { formatDuration, formatDate } from '../utils/formatters';
import type { Track } from '../../../../types/library';

export interface TrackRowProps {
  track: Track;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  isFocused: boolean;
  onClick: (e: React.MouseEvent, index: number) => void;
  onDoubleClick: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  onUpdateRating: (trackId: string, rating: number) => void;
}

/**
 * Fila de track con todos los datos y estilos visuales
 * Maneja selección, focus, reproducción activa, y contexto
 */
export const TrackRow = ({
  track,
  index,
  isSelected,
  isPlaying,
  isFocused,
  onClick,
  onDoubleClick,
  onContextMenu,
  onUpdateRating,
}: TrackRowProps) => {
  return (
    <tr
      data-track-id={track.id}
      className={`
        border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors
        ${
          isPlaying
            ? 'bg-blue-100 dark:bg-blue-950'
            : isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
        ${isFocused ? 'ring-2 ring-blue-400 dark:ring-blue-600 ring-inset' : ''}
      `}
      onClick={(e) => onClick(e, index)}
      onDoubleClick={() => onDoubleClick(track)}
      onContextMenu={(e) => onContextMenu(e, track)}
    >
      {/* Fixed indicator */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
        {track.beatportId && (
          <span className="inline-flex items-center">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          </span>
        )}
      </td>

      {/* Title */}
      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
        {track.title}
      </td>

      {/* Artist */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {track.artist}
      </td>

      {/* Album */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {track.album || '-'}
      </td>

      {/* Duration */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {formatDuration(track.duration)}
      </td>

      {/* BPM */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {track.bpm ?? '-'}
      </td>

      {/* Rating */}
      <td className="px-3 py-2 whitespace-nowrap text-sm">
        <StarRating
          rating={track.rating ?? 0}
          onChange={(newRating) => onUpdateRating(track.id, newRating)}
          size="small"
        />
      </td>

      {/* Year */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {track.year ?? '-'}
      </td>

      {/* Date Added */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {formatDate(track.dateAdded)}
      </td>

      {/* Bitrate */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {track.bitrate ? `${track.bitrate} kbps` : '-'}
      </td>

      {/* Genre */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {track.genre ?? '-'}
      </td>

      {/* Key */}
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
        {track.key ?? '-'}
      </td>
    </tr>
  );
};
