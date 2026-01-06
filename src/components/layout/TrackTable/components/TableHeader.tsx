import { useState } from 'react';
import { ArrowUp, ArrowDown, Check } from 'lucide-react';
import type { SortColumn, SortDirection } from '../hooks/useTrackSorting';
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu';

export interface TableHeaderProps {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  visibleColumns: Set<SortColumn>;
  onToggleColumn: (column: SortColumn) => void;
  onResetColumns: () => void;
  /** Indica si estamos mostrando una playlist (cambia columnas visibles) */
  isPlaylistView?: boolean;
  /** Indica si estamos en modo de reordenamiento (muestra columna de grip) */
  reorderMode?: boolean;
}

/**
 * Header de tabla con columnas ordenables
 * Muestra flechas indicando dirección de ordenamiento
 * Click derecho abre menú para mostrar/ocultar columnas
 * 
 * AIDEV-NOTE: Este componente recibe visibleColumns como prop desde el padre
 * para mantener sincronización con TrackRow
 */
export const TableHeader = ({ 
  sortColumn, 
  sortDirection, 
  onSort,
  visibleColumns,
  onToggleColumn,
  onResetColumns,
  isPlaylistView = false,
  reorderMode = false,
}: TableHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 w-3 h-3 inline" />
    ) : (
      <ArrowDown className="ml-1 w-3 h-3 inline" />
    );
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  return (
    <>
      <thead 
        className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10"
        onContextMenu={handleContextMenu}
      >
        <tr>
          {/* Columna vacía para grip handle - solo en modo reordenamiento */}
          {reorderMode && (
            <th className="w-8" />
          )}
          {/* Columna de posición - solo en vista de playlist */}
          {isPlaylistView && (
            <th
              className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"
              title="Posición en playlist"
            >
              #
            </th>
          )}
          {/* Columna fixed - solo en vista de biblioteca (no playlist) */}
          {!isPlaylistView && visibleColumns.has('fixed') && (
            <th
              className="px-2 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-10"
              onClick={() => onSort('fixed')}
            >
              <span className="inline-flex items-center">
                <Check className="w-4 h-4" />
                {getSortIcon('fixed')}
              </span>
            </th>
          )}
          {visibleColumns.has('title') && (
            <th
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => onSort('title')}
            >
              <span className="inline-flex items-center">
                Title {getSortIcon('title')}
              </span>
            </th>
          )}
          {visibleColumns.has('artist') && (
            <th
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => onSort('artist')}
            >
              <span className="inline-flex items-center">
                Artist {getSortIcon('artist')}
              </span>
            </th>
          )}
          {visibleColumns.has('album') && (
            <th
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => onSort('album')}
            >
              <span className="inline-flex items-center">
                Album {getSortIcon('album')}
              </span>
            </th>
          )}
          {visibleColumns.has('duration') && (
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-16"
              onClick={() => onSort('duration')}
            >
              <span className="inline-flex items-center">
                Time {getSortIcon('duration')}
              </span>
            </th>
          )}
          {visibleColumns.has('bpm') && (
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-14"
              onClick={() => onSort('bpm')}
            >
              <span className="inline-flex items-center">
                BPM {getSortIcon('bpm')}
              </span>
            </th>
          )}
          {visibleColumns.has('rating') && (
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-24"
              onClick={() => onSort('rating')}
            >
              <span className="inline-flex items-center">
                Rating {getSortIcon('rating')}
              </span>
            </th>
          )}
          {visibleColumns.has('year') && (
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-14"
              onClick={() => onSort('year')}
            >
              <span className="inline-flex items-center">
                Year {getSortIcon('year')}
              </span>
            </th>
          )}
          {visibleColumns.has('dateAdded') && (
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-24"
              onClick={() => onSort('dateAdded')}
            >
              <span className="inline-flex items-center">
                Added {getSortIcon('dateAdded')}
              </span>
            </th>
          )}
          {visibleColumns.has('bitrate') && (
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-20"
              onClick={() => onSort('bitrate')}
            >
              <span className="inline-flex items-center">
                Bitrate {getSortIcon('bitrate')}
              </span>
            </th>
          )}
          {visibleColumns.has('genre') && (
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-24"
              onClick={() => onSort('genre')}
            >
              <span className="inline-flex items-center truncate">
                Genre {getSortIcon('genre')}
              </span>
            </th>
          )}
          {visibleColumns.has('key') && (
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 w-20"
              onClick={() => onSort('key')}
            >
              <span className="inline-flex items-center">
                Key {getSortIcon('key')}
              </span>
            </th>
          )}
        </tr>
      </thead>
      
      <ColumnVisibilityMenu
        isOpen={menuOpen}
        position={menuPosition}
        visibleColumns={visibleColumns}
        onToggleColumn={onToggleColumn}
        onResetColumns={onResetColumns}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
};
