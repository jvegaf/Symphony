/**
 * Tabla de tracks de la biblioteca
 * 
 * Features:
 * - Selección múltiple con Ctrl+Click (toggle) y Shift+Click (rango)
 * - Navegación con teclado (Ctrl+A, Escape, Arrow keys)
 * - Ratings editables inline
 * - Double-click para reproducir track
 * - Sort estado controlado desde padre (persiste al navegar)
 * - Context menu con opciones: Details, Search, Filename→Tags, Fix Tags, Find Artwork, Delete
 */

import { useEffect, useRef } from "react";
import type { Track } from "../../../types/library";
import { useUpdateTrackRating, useDeleteTrack } from "../../../hooks/library";
import { TableHeader, TrackRow, EmptyState, LoadingState } from "./components";
import { useTrackSorting, useTrackSelection, useContextMenu, useColumnVisibility, type SortColumn, type SortDirection } from "./hooks";

// Re-exportar tipos para compatibilidad
export type { SortColumn, SortDirection };

export interface TrackTableProps {
  tracks: Track[];
  selectedTracks: Track[];
  playingTrack: Track | null;
  onTracksSelect: (tracks: Track[]) => void;
  /** 
   * Callback cuando se hace doble click en un track
   * @param track - Track clickeado
   * @param sortedTracks - Lista de tracks en el orden visual actual de la tabla
   * @param index - Índice del track en sortedTracks
   */
  onTrackDoubleClick: (track: Track, sortedTracks: Track[], index: number) => void;
  onTrackDetails?: (track: Track) => void;
  onBatchFilenameToTags?: (tracks: Track[]) => void;
  onFixTags?: (trackIds: string[]) => void;
  onFindArtwork?: (trackIds: string[]) => void;
  isLoading: boolean;
  // Props para sort controlado desde padre (persiste al navegar)
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  onSortChange?: (column: SortColumn, direction: SortDirection) => void;
  // Callback para notificar cuando cambian los tracks ordenados
  // Permite al padre regenerar la cola de reproducción cuando cambia el orden
  onSortedTracksChange?: (sortedTracks: Track[], playingTrackIndex: number) => void;
}

export const TrackTable = ({
  tracks,
  selectedTracks,
  playingTrack,
  onTracksSelect,
  onTrackDoubleClick,
  onTrackDetails,
  onBatchFilenameToTags,
  onFixTags,
  onFindArtwork,
  isLoading,
  sortColumn: externalSortColumn,
  sortDirection: externalSortDirection,
  onSortChange,
  onSortedTracksChange,
}: TrackTableProps) => {
  // Hook para actualizar rating en DB y archivo MP3
  const { mutate: updateRating } = useUpdateTrackRating();
  
  // Hook para eliminar track de DB y borrar archivo
  const { mutate: deleteTrack } = useDeleteTrack();

  // Hook para visibilidad de columnas
  const { visibleColumns, toggleColumn, resetColumns } = useColumnVisibility();
  const visibleColumnsSet = new Set(visibleColumns);

  // Estado de ordenamiento - usar props externas si están disponibles
  const sortColumn = externalSortColumn ?? 'title';
  const sortDirection = externalSortDirection ?? 'asc';

  // Función para manejar click en header (cambiar ordenamiento)
  const handleSort = (column: SortColumn) => {
    const newDirection = sortColumn === column
      ? (sortDirection === 'asc' ? 'desc' : 'asc')
      : 'asc';
    
    if (onSortChange) {
      onSortChange(column, newDirection);
    }
  };

  // Hook para ordenar tracks
  const sortedTracks = useTrackSorting({ tracks, sortColumn, sortDirection });

  // Hook para selección de tracks
  const { focusedIndex, handleTrackClick } = useTrackSelection({
    sortedTracks,
    selectedTracks,
    onTracksSelect,
  });

  // Hook para context menu
  const { handleContextMenu } = useContextMenu({
    selectedTracks,
    onTracksSelect,
    onTrackDetails,
    onBatchFilenameToTags,
    onFixTags,
    onFindArtwork,
    deleteTrack,
  });

  // Referencia para evitar llamadas redundantes a onSortedTracksChange
  const lastNotifiedRef = useRef<{ sortColumn: SortColumn; sortDirection: SortDirection; playingId: string | undefined } | null>(null);

  // Notificar al padre cuando cambian los tracks ordenados
  // Esto permite regenerar la cola de reproducción cuando cambia el orden
  useEffect(() => {
    if (!onSortedTracksChange || !playingTrack) return;

    const currentState = {
      sortColumn,
      sortDirection,
      playingId: playingTrack.id,
    };

    // Comparar con el último estado notificado
    const lastState = lastNotifiedRef.current;
    if (
      lastState &&
      lastState.sortColumn === currentState.sortColumn &&
      lastState.sortDirection === currentState.sortDirection &&
      lastState.playingId === currentState.playingId
    ) {
      return; // No ha cambiado nada relevante
    }

    const playingIndex = sortedTracks.findIndex(t => t.id === playingTrack.id);
    if (playingIndex !== -1) {
      lastNotifiedRef.current = currentState;
      onSortedTracksChange(sortedTracks, playingIndex);
    }
  }, [sortColumn, sortDirection, onSortedTracksChange, playingTrack, sortedTracks]);

  // Double-click handler - deselecciona todos y reproduce el track
  const handleDoubleClick = (track: Track, index: number) => {
    onTracksSelect([]); // Deseleccionar todos
    onTrackDoubleClick(track, sortedTracks, index);
  };

  // Estados condicionales
  if (isLoading) {
    return <LoadingState />;
  }

  if (tracks.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 overflow-auto flex flex-col select-none" data-testid="track-table">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <TableHeader
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          visibleColumns={visibleColumnsSet}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumns}
        />
        <tbody>
          {sortedTracks.map((track, index) => {
            const isSelected = selectedTracks.some(t => t.id === track.id);
            const isPlaying = playingTrack?.id === track.id;
            const isFocused = index === focusedIndex;

            return (
              <TrackRow
                key={track.id ?? track.path}
                track={track}
                index={index}
                isSelected={isSelected}
                isPlaying={isPlaying}
                isFocused={isFocused}
                visibleColumns={visibleColumnsSet}
                onClick={handleTrackClick}
                onDoubleClick={() => handleDoubleClick(track, index)}
                onContextMenu={handleContextMenu}
                onUpdateRating={(trackId, rating) => {
                  updateRating({ trackId, rating });
                }}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

TrackTable.displayName = 'TrackTable';
