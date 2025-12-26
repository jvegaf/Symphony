/**
 * Tabla de tracks de la biblioteca
 * 
 * AIDEV-NOTE: Cambios recientes:
 * - Selección múltiple con Ctrl+Click (toggle individual) y Shift+Click (rango)
 * - Selección visual mediante background color al hacer click
 * - Ratings editables inline con StarRating component
 * - Double-click para reproducir track
 * - Sort estado levantado a App.tsx para persistir al navegar a Settings
 * - Context menu nativo de Tauri con opciones:
 *   - "Details": abrir modal de metadatos (TrackDetail component)
 *   - "Filename→Tags (N tracks)": batch update desde filename para selección múltiple
 *   - "Delete Track": elimina de la biblioteca y borra el archivo del disco
 *   - "Open DevTools (F12)": ayuda para debugging
 * - Usa LogicalPosition para popup menu (clientX/clientY son logical pixels en browser)
 */

import { useState, useEffect } from "react";
import type { Track } from "../../types/library";
import { StarRating } from "../ui/StarRating";
import { useUpdateTrackRating, useDeleteTrack } from "../../hooks/useLibrary";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { confirm } from "@tauri-apps/plugin-dialog";

// AIDEV-NOTE: Tipos exportados para que App.tsx pueda usarlos
export type SortColumn = 'title' | 'artist' | 'album' | 'duration' | 'bpm' | 'rating' | 'year' | 'dateAdded' | 'bitrate';
export type SortDirection = 'asc' | 'desc';

interface TrackTableProps {
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
  isLoading: boolean;
  // AIDEV-NOTE: Props para sort controlado desde App.tsx (persiste al navegar)
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  onSortChange?: (column: SortColumn, direction: SortDirection) => void;
  // AIDEV-NOTE: Callback para notificar cuando cambian los tracks ordenados
  // Esto permite a App.tsx regenerar la cola de reproducción cuando cambia el orden
  onSortedTracksChange?: (sortedTracks: Track[], playingTrackIndex: number) => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const TrackTable = ({
  tracks,
  selectedTracks,
  playingTrack,
  onTracksSelect,
  onTrackDoubleClick,
  onTrackDetails,
  onBatchFilenameToTags,
  isLoading,
  sortColumn: externalSortColumn,
  sortDirection: externalSortDirection,
  onSortChange,
  onSortedTracksChange,
}: TrackTableProps) => {
  // AIDEV-NOTE: Hook para actualizar rating en DB y archivo MP3
  const { mutate: updateRating } = useUpdateTrackRating();
  
  // AIDEV-NOTE: Hook para eliminar track de DB y borrar archivo
  const { mutate: deleteTrack } = useDeleteTrack();

  // AIDEV-NOTE: Índice del último track clickeado para Shift+Click range selection
  const [lastClickedIndex, setLastClickedIndex] = useState<number>(-1);
  
  // AIDEV-NOTE: Índice del track con foco actual (para navegación con teclado)
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // AIDEV-NOTE: Estado de ordenamiento - usar props externas si están disponibles
  // Esto permite que App.tsx mantenga el estado al navegar a Settings
  const sortColumn = externalSortColumn ?? 'title';
  const sortDirection = externalSortDirection ?? 'asc';

  // AIDEV-NOTE: Función para manejar click en header (cambiar ordenamiento)
  const handleSort = (column: SortColumn) => {
    const newDirection = sortColumn === column
      ? (sortDirection === 'asc' ? 'desc' : 'asc')
      : 'asc';
    
    // Si hay callback externo, usarlo; sino no hacer nada (estado es controlado)
    if (onSortChange) {
      onSortChange(column, newDirection);
    }
  };

  // AIDEV-NOTE: Ordenar tracks según columna y dirección
  const sortedTracks = [...tracks].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortColumn) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'artist':
        aValue = a.artist.toLowerCase();
        bValue = b.artist.toLowerCase();
        break;
      case 'album':
        aValue = (a.album ?? '').toLowerCase();
        bValue = (b.album ?? '').toLowerCase();
        break;
      case 'duration':
        aValue = a.duration;
        bValue = b.duration;
        break;
      case 'bpm':
        aValue = a.bpm ?? 0;
        bValue = b.bpm ?? 0;
        break;
      case 'rating':
        aValue = a.rating ?? 0;
        bValue = b.rating ?? 0;
        break;
      case 'year':
        aValue = a.year ?? 0;
        bValue = b.year ?? 0;
        break;
      case 'dateAdded':
        aValue = new Date(a.dateAdded).getTime();
        bValue = new Date(b.dateAdded).getTime();
        break;
      case 'bitrate':
        aValue = a.bitrate ?? 0;
        bValue = b.bitrate ?? 0;
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // AIDEV-NOTE: Notificar a App.tsx cuando cambian los tracks ordenados
  // Esto permite regenerar la cola de reproducción cuando cambia el orden
  useEffect(() => {
    if (onSortedTracksChange && playingTrack) {
      const playingIndex = sortedTracks.findIndex(t => t.id === playingTrack.id);
      if (playingIndex !== -1) {
        onSortedTracksChange(sortedTracks, playingIndex);
      }
    }
  }, [sortColumn, sortDirection, onSortedTracksChange, playingTrack, sortedTracks]);

  // AIDEV-NOTE: Keyboard shortcuts (Ctrl+A = Select All, Escape = Deselect All)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+A o Cmd+A: Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        onTracksSelect(sortedTracks);
        return;
      }

      // Escape: Deselect All (solo si hay selección)
      if (e.key === 'Escape' && selectedTracks.length > 0) {
        e.preventDefault();
        onTracksSelect([]);
        return;
      }

      // AIDEV-NOTE: Navegación con arrow keys (sin Shift = mover foco, con Shift = seleccionar)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        let newIndex = focusedIndex;
        if (e.key === 'ArrowDown' && focusedIndex < sortedTracks.length - 1) {
          newIndex = focusedIndex + 1;
        } else if (e.key === 'ArrowUp' && focusedIndex > 0) {
          newIndex = focusedIndex - 1;
        }

        setFocusedIndex(newIndex);

        if (e.shiftKey) {
          // Shift+Arrow: Agregar a selección
          const trackToAdd = sortedTracks[newIndex];
          const isAlreadySelected = selectedTracks.some(t => t.id === trackToAdd.id);
          if (!isAlreadySelected) {
            onTracksSelect([...selectedTracks, trackToAdd]);
          }
        } else {
          // Arrow sin Shift: Seleccionar solo el track con foco
          onTracksSelect([sortedTracks[newIndex]]);
        }

        setLastClickedIndex(newIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedTracks, selectedTracks, onTracksSelect, focusedIndex]);

  // AIDEV-NOTE: Manejar selección con Ctrl (toggle) y Shift (rango)
  const handleTrackClick = (track: Track, index: number, e: React.MouseEvent) => {
    // Prevenir que el double-click también ejecute el single-click
    if (e.detail === 2) return;

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click: toggle individual
      const isSelected = selectedTracks.some(t => t.id === track.id);
      if (isSelected) {
        onTracksSelect(selectedTracks.filter(t => t.id !== track.id));
      } else {
        onTracksSelect([...selectedTracks, track]);
      }
      setLastClickedIndex(index);
    } else if (e.shiftKey && lastClickedIndex !== -1) {
      // Shift+Click: seleccionar rango
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const rangeSelection = sortedTracks.slice(start, end + 1);
      
      // Merge con selección existente (union)
      const newSelection = [...selectedTracks];
      rangeSelection.forEach(t => {
        if (!newSelection.some(s => s.id === t.id)) {
          newSelection.push(t);
        }
      });
      onTracksSelect(newSelection);
    } else {
      // Click normal: seleccionar solo este track
      onTracksSelect([track]);
      setLastClickedIndex(index);
    }
  };

  // AIDEV-NOTE: Context menu con opciones para single o batch edit
  const handleContextMenu = async (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    
    // Si el track clickeado no está en la selección, seleccionarlo solo
    const isTrackSelected = selectedTracks.some(t => t.id === track.id);
    if (!isTrackSelected) {
      onTracksSelect([track]);
    }

    const menuItems: MenuItem[] = [];

    // Opción "Details" solo si hay 1 track seleccionado
    if (selectedTracks.length === 1 && onTrackDetails) {
      const detailsItem = await MenuItem.new({
        id: 'details',
        text: 'Details',
        action: () => {
          onTrackDetails(selectedTracks[0]);
        }
      });
      menuItems.push(detailsItem);
    }

    // Opción "Filename→Tags" para batch edit
    if (selectedTracks.length > 0 && onBatchFilenameToTags) {
      const batchFilenameItem = await MenuItem.new({
        id: 'batch-filename-tags',
        text: `Filename→Tags (${selectedTracks.length} track${selectedTracks.length > 1 ? 's' : ''})`,
        action: () => {
          onBatchFilenameToTags(isTrackSelected ? selectedTracks : [track]);
        }
      });
      menuItems.push(batchFilenameItem);
    }

    // Opción "Delete Track" - elimina de DB y borra archivo
    // AIDEV-NOTE: Solo se muestra si hay tracks seleccionados
    const tracksToDelete = isTrackSelected ? selectedTracks : [track];
    const deleteItem = await MenuItem.new({
      id: 'delete-track',
      text: `Delete Track${tracksToDelete.length > 1 ? `s (${tracksToDelete.length})` : ''}`,
      action: async () => {
        // Confirmar antes de eliminar
        const trackNames = tracksToDelete.slice(0, 3).map(t => `"${t.title}"`).join(', ');
        const moreText = tracksToDelete.length > 3 ? ` and ${tracksToDelete.length - 3} more` : '';
        
        const confirmed = await confirm(
          `Are you sure you want to delete ${trackNames}${moreText}?\n\nThis will remove the track${tracksToDelete.length > 1 ? 's' : ''} from the library AND delete the file${tracksToDelete.length > 1 ? 's' : ''} from disk.`,
          { title: 'Delete Track', kind: 'warning' }
        );
        
        if (confirmed) {
          // Eliminar cada track seleccionado
          for (const t of tracksToDelete) {
            if (t.id) {
              deleteTrack(t.id);
            }
          }
          // Limpiar selección después de eliminar
          onTracksSelect([]);
        }
      }
    });
    menuItems.push(deleteItem);

    // Opción DevTools
    const devToolsItem = await MenuItem.new({
      id: 'devtools',
      text: 'Open DevTools (F12)',
      action: () => {
        alert('Press F12 to open DevTools\n\nOr use:\n- Windows/Linux: Ctrl+Shift+I\n- macOS: Cmd+Option+I');
      }
    });
    menuItems.push(devToolsItem);

    const menu = await Menu.new({ items: menuItems });
    await menu.popup(new LogicalPosition(e.clientX, e.clientY));
  };

  // AIDEV-NOTE: Double-click handler - deselecciona todos y reproduce el track
  // Pasa sortedTracks y el índice para que App.tsx pueda generar la cola correctamente
  const handleDoubleClick = (track: Track, index: number) => {
    onTracksSelect([]); // Deseleccionar todos
    onTrackDoubleClick(track, sortedTracks, index); // Reproducir track con contexto de orden
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="track-table-loading">
        <div className="text-center text-gray-400">
          <span className="material-icons text-4xl animate-spin">refresh</span>
          <p className="mt-2">Cargando pistas...</p>
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="track-table-empty">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <span className="material-icons text-6xl mb-4">library_music</span>
          <h2 className="text-xl font-semibold mb-2">No hay pistas en tu biblioteca</h2>
          <p className="text-sm">Haz clic en "Import" para agregar tu música</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto flex flex-col select-none" data-testid="track-table">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
          <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Art</th>
            <th 
              className="p-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort('dateAdded')}
            >
              <div className="flex items-center gap-1">
                Added
                {sortColumn === 'dateAdded' && (
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="p-2 font-medium text-gray-800 dark:text-gray-200 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort('title')}
            >
              <div className="flex items-center gap-1">
                Title
                {sortColumn === 'title' && (
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="p-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort('artist')}
            >
              <div className="flex items-center gap-1">
                Artist
                {sortColumn === 'artist' && (
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="p-2 font-medium text-gray-600 dark:text-gray-400 max-w-32 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort('album')}
            >
              <div className="flex items-center gap-1">
                Album
                {sortColumn === 'album' && (
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="p-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort('duration')}
            >
              <div className="flex items-center gap-1">
                Time
                {sortColumn === 'duration' && (
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="p-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort('bitrate')}
            >
              <div className="flex items-center gap-1">
                Bitrate
                {sortColumn === 'bitrate' && (
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="p-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort('bpm')}
            >
              <div className="flex items-center gap-1">
                BPM
                {sortColumn === 'bpm' && (
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                )}
              </div>
            </th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Key</th>
            <th 
              className="p-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort('rating')}
            >
              <div className="flex items-center gap-1">
                Rating
                {sortColumn === 'rating' && (
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                )}
              </div>
            </th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Genre</th>
            <th 
              className="p-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort('year')}
            >
              <div className="flex items-center gap-1">
                Year
                {sortColumn === 'year' && (
                  <span className="material-icons text-base">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200/30 dark:divide-gray-700/50">
          {sortedTracks.map((track, index) => {
            const isSelected = selectedTracks.some(t => t.id === track.id);
            const isPlaying = playingTrack?.id === track.id;
            const isFocused = index === focusedIndex;
            return (
              <tr
                key={track.id ?? track.path}
                data-testid="track-row"
                data-track-id={track.id}
                onClick={(e) => handleTrackClick(track, index, e)}
                onDoubleClick={() => handleDoubleClick(track, index)}
                onContextMenu={(e) => handleContextMenu(e, track)}
                className={`
                  cursor-pointer transition-colors
                  ${
                    isPlaying
                      ? "bg-blue-500/20 dark:bg-blue-400/20 hover:bg-blue-500/30 dark:hover:bg-blue-400/30"
                      : isSelected
                        ? "bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30"
                        : "hover:bg-gray-100/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300"
                  }
                  ${
                    isFocused && !isSelected && !isPlaying
                      ? "ring-2 ring-primary/40 ring-inset"
                      : ""
                  }
                `}
              >
                <td className="p-2">
                  <span className={`material-icons text-2xl ${isPlaying ? "text-primary" : "text-gray-400 dark:text-gray-600"}`}>
                    music_note
                  </span>
                </td>
                <td className={`p-2 ${isPlaying || isSelected ? "text-primary font-medium" : ""}`}>
                  {formatDate(track.dateAdded)}
                </td>
                <td className={`p-2 ${isPlaying || isSelected ? "text-primary font-medium" : ""}`} data-testid="track-title">
                  {track.title}
                </td>
                <td className={`p-2 ${isPlaying || isSelected ? "text-primary font-medium" : ""}`} data-testid="track-artist">
                  {track.artist}
                </td>
                <td className={`p-2 max-w-32 truncate ${isPlaying || isSelected ? "text-primary font-medium" : ""}`} data-testid="track-album">
                  {track.album ?? ""}
                </td>
                <td className={`p-2 ${isPlaying || isSelected ? "text-primary font-medium" : ""}`} data-testid="track-duration">
                  {formatDuration(track.duration)}
                </td>
                <td className={`p-2 ${isPlaying || isSelected ? "text-primary font-medium" : ""}`} data-testid="track-bitrate">
                  {track.bitrate ? `${track.bitrate}` : ""}
                </td>
                <td className={`p-2 ${isPlaying || isSelected ? "text-primary font-medium" : ""}`}>
                  {track.bpm ? track.bpm.toFixed(2) : ""}
                </td>
                <td className={`p-2 ${isPlaying || isSelected ? "text-primary font-medium" : ""}`}>
                  {track.key && (
                    <span className="bg-primary/20 text-primary border border-primary/50 rounded px-1 text-[10px]">
                      {track.key}
                    </span>
                  )}
                </td>
                <td className="p-2">
                  <StarRating
                    value={track.rating ?? 0}
                    readOnly={false}
                    size="md"
                    onChange={(newRating) => {
                      if (track.id) {
                        updateRating({ trackId: track.id, rating: newRating });
                      }
                    }}
                  />
                </td>
                <td className={`p-2 ${isPlaying || isSelected ? "text-primary font-medium" : ""}`}>
                  {track.genre ?? ""}
                </td>
                <td className={`p-2 ${isPlaying || isSelected ? "text-primary font-medium" : ""}`}>
                  {track.year ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
