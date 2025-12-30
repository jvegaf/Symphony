import { ArrowUp, ArrowDown, Check } from 'lucide-react';
import type { SortColumn, SortDirection } from '../hooks/useTrackSorting';

export interface TableHeaderProps {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}

/**
 * Header de tabla con columnas ordenables
 * Muestra flechas indicando dirección de ordenamiento
 */
export const TableHeader = ({ sortColumn, sortDirection, onSort }: TableHeaderProps) => {
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 w-3 h-3 inline" />
    ) : (
      <ArrowDown className="ml-1 w-3 h-3 inline" />
    );
  };

  return (
    <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
      <tr>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('fixed')}
        >
          <span className="inline-flex items-center">
            <Check className="w-4 h-4" />
            {getSortIcon('fixed')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('title')}
        >
          <span className="inline-flex items-center">
            Title {getSortIcon('title')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('artist')}
        >
          <span className="inline-flex items-center">
            Artist {getSortIcon('artist')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('album')}
        >
          <span className="inline-flex items-center">
            Album {getSortIcon('album')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('duration')}
        >
          <span className="inline-flex items-center">
            Duration {getSortIcon('duration')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('bpm')}
        >
          <span className="inline-flex items-center">
            BPM {getSortIcon('bpm')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('rating')}
        >
          <span className="inline-flex items-center">
            Rating {getSortIcon('rating')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('year')}
        >
          <span className="inline-flex items-center">
            Year {getSortIcon('year')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('dateAdded')}
        >
          <span className="inline-flex items-center">
            Date Added {getSortIcon('dateAdded')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('bitrate')}
        >
          <span className="inline-flex items-center">
            Bitrate {getSortIcon('bitrate')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('genre')}
        >
          <span className="inline-flex items-center">
            Genre {getSortIcon('genre')}
          </span>
        </th>
        <th
          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
          onClick={() => onSort('key')}
        >
          <span className="inline-flex items-center">
            Key {getSortIcon('key')}
          </span>
        </th>
      </tr>
    </thead>
  );
};
