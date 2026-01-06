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
 * - Drag and drop para agregar tracks a playlists
 * - Reordenamiento de tracks dentro de playlist seleccionada
 */

import { useEffect, useRef, useState, useCallback, DragEvent } from "react";
import type { Track } from "../../../types/library";
import { useUpdateTrackRating, useDeleteTrack } from "../../../hooks/library";
import { useReorderPlaylistTracks, useRemoveTrackFromPlaylist } from "../../../hooks/playlists";
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
  /** Callback para crear nuevo playlist con los tracks seleccionados */
  onAddToNewPlaylist?: (trackIds: string[]) => void;
  isLoading: boolean;
  // Props para sort controlado desde padre (persiste al navegar)
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  onSortChange?: (column: SortColumn, direction: SortDirection) => void;
  // Callback para notificar cuando cambian los tracks ordenados
  // Permite al padre regenerar la cola de reproducción cuando cambia el orden
  onSortedTracksChange?: (sortedTracks: Track[], playingTrackIndex: number) => void;
  /** ID de playlist seleccionada (habilita reordenamiento) */
  selectedPlaylistId?: string | null;
  /** Callback cuando se inicia el drag de tracks */
  onDragStart?: (trackIds: string[]) => void;
  /** Callback cuando termina el drag */
  onDragEnd?: () => void;
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
  onAddToNewPlaylist,
  isLoading,
  sortColumn: externalSortColumn,
  sortDirection: externalSortDirection,
  onSortChange,
  onSortedTracksChange,
  selectedPlaylistId,
  onDragStart,
  onDragEnd,
}: TrackTableProps) => {
  // Hook para actualizar rating en DB y archivo MP3
  const { mutate: updateRating } = useUpdateTrackRating();
  
  // Hook para eliminar track de DB y borrar archivo
  const { mutate: deleteTrack } = useDeleteTrack();
  
  // Hook para reordenar tracks en playlist
  const { mutate: reorderTracks } = useReorderPlaylistTracks();
  
  // Hook para eliminar track de playlist (sin borrar archivo)
  const { mutate: removeFromPlaylist } = useRemoveTrackFromPlaylist();

  // Hook para visibilidad de columnas
  const { visibleColumns, toggleColumn, resetColumns } = useColumnVisibility();
  const visibleColumnsSet = new Set(visibleColumns);

  // Estado de ordenamiento - usar props externas si están disponibles
  const sortColumn = externalSortColumn ?? 'title';
  const sortDirection = externalSortDirection ?? 'asc';
  
  // Estado para drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
  // Modo reordenamiento: activo cuando hay playlist seleccionada
  const reorderMode = selectedPlaylistId !== null && selectedPlaylistId !== undefined;

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
    onAddToNewPlaylist,
    deleteTrack,
    selectedPlaylistId,
    onRemoveFromPlaylist: (playlistId, trackId) => {
      removeFromPlaylist({ playlistId, trackId });
    },
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

  // Handlers para drag and drop
  const handleDragStartRow = useCallback((trackIds: string[], e: DragEvent<HTMLTableRowElement>) => {
    setIsDragging(true);
    e.dataTransfer.setData("application/json", JSON.stringify({ 
      type: reorderMode ? "playlist-track" : "tracks",
      trackIds,
      sourceIndex: sortedTracks.findIndex(t => t.id === trackIds[0])
    }));
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(trackIds);
  }, [reorderMode, sortedTracks, onDragStart]);

  const handleDragEndRow = useCallback(() => {
    setIsDragging(false);
    setDropTargetIndex(null);
    onDragEnd?.();
  }, [onDragEnd]);

  const handleDragOverRow = useCallback((e: DragEvent<HTMLTableRowElement>, index: number) => {
    if (reorderMode) {
      e.preventDefault();
      setDropTargetIndex(index);
    }
  }, [reorderMode]);

  const handleDropRow = useCallback((e: DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    if (!reorderMode || !selectedPlaylistId) return;
    
    e.preventDefault();
    setDropTargetIndex(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.type === "playlist-track" && data.sourceIndex !== undefined) {
        const sourceIndex = data.sourceIndex as number;
        if (sourceIndex === targetIndex) return;
        
        // Crear nuevo orden de tracks
        const newOrder = [...sortedTracks];
        const [movedTrack] = newOrder.splice(sourceIndex, 1);
        newOrder.splice(targetIndex, 0, movedTrack);
        
        // Extraer IDs en nuevo orden
        const trackIds = newOrder.map(t => t.id).filter((id): id is string => id !== undefined);
        
        // Llamar al backend para persistir el nuevo orden
        reorderTracks({ playlistId: selectedPlaylistId, trackIds });
      }
    } catch {
      // Ignorar errores de parsing
    }
  }, [reorderMode, selectedPlaylistId, sortedTracks, reorderTracks]);

  // IDs de tracks seleccionados para drag múltiple
  const selectedTrackIds = selectedTracks
    .map(t => t.id)
    .filter((id): id is string => id !== undefined);

  // Estados condicionales
  if (isLoading) {
    return <LoadingState />;
  }

  if (tracks.length === 0) {
    return <EmptyState />;
  }

  // Determinar si estamos en vista de playlist
  const isPlaylistView = selectedPlaylistId !== null && selectedPlaylistId !== undefined;

  return (
    <div className="flex-1 overflow-auto flex flex-col select-none" data-testid="track-table">
      <table className="w-full table-fixed text-left text-sm">
        <TableHeader
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          visibleColumns={visibleColumnsSet}
          onToggleColumn={toggleColumn}
          onResetColumns={resetColumns}
          isPlaylistView={isPlaylistView}
          reorderMode={reorderMode}
        />
        <tbody className={isDragging ? "opacity-75" : ""}>
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
                // Drag and drop props
                draggable
                selectedTrackIds={selectedTrackIds}
                onDragStart={handleDragStartRow}
                onDragEnd={handleDragEndRow}
                reorderMode={reorderMode}
                onDragOver={(e) => handleDragOverRow(e, index)}
                onDrop={(e) => handleDropRow(e, index)}
                isDropTarget={dropTargetIndex === index}
                isPlaylistView={isPlaylistView}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

TrackTable.displayName = 'TrackTable';
