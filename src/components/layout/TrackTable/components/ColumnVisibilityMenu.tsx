/**
 * Menú contextual para gestionar visibilidad de columnas
 * Aparece con click derecho en headers de tabla
 * 
 * AIDEV-NOTE: Usa createPortal para renderizar fuera de la tabla
 * ya que <button> no puede ser hijo de <table>
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';
import type { SortColumn } from '../hooks/useTrackSorting';

/** Props para ColumnVisibilityMenu */
export interface ColumnVisibilityMenuProps {
  /** Si el menú está abierto */
  isOpen: boolean;
  /** Posición del menú (x, y) en píxeles */
  position: { x: number; y: number };
  /** Set de columnas visibles */
  visibleColumns: Set<SortColumn>;
  /** Callback al hacer toggle de una columna */
  onToggleColumn: (column: SortColumn) => void;
  /** Callback al resetear todas las columnas */
  onResetColumns: () => void;
  /** Callback al cerrar el menú */
  onClose: () => void;
}

/** Metadata de columnas para el menú */
const COLUMN_LABELS: Record<SortColumn, string> = {
  position: '#',
  fixed: 'Fixed',
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  duration: 'Duration',
  bpm: 'BPM',
  rating: 'Rating',
  year: 'Year',
  dateAdded: 'Date Added',
  bitrate: 'Bitrate',
  genre: 'Genre',
  key: 'Key',
};

/** Columnas que no se pueden ocultar */
const REQUIRED_COLUMNS: Set<SortColumn> = new Set(['title', 'artist']);

/** Orden de las columnas en el menú */
const COLUMN_ORDER: SortColumn[] = [
  'fixed',
  'title',
  'artist',
  'album',
  'duration',
  'bpm',
  'rating',
  'year',
  'dateAdded',
  'bitrate',
  'genre',
  'key',
];

/**
 * Menú contextual para seleccionar qué columnas mostrar/ocultar
 * 
 * Features:
 * - Checkboxes para cada columna
 * - Columnas obligatorias deshabilitadas (title, artist)
 * - Botón Reset para mostrar todas
 * - Cierre con Escape o click fuera
 * - Contador de columnas visibles
 * - Tooltips para columnas obligatorias
 */
export const ColumnVisibilityMenu = ({
  isOpen,
  position,
  visibleColumns,
  onToggleColumn,
  onResetColumns,
  onClose,
}: ColumnVisibilityMenuProps) => {
  /**
   * Manejo de teclas de atajo
   * - Escape: Cerrar menú
   * - Ctrl+R: Reset columnas
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        onResetColumns();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onResetColumns]);

  if (!isOpen) return null;

  const totalColumns = COLUMN_ORDER.length;
  const visibleCount = visibleColumns.size;

  const isRequired = (column: SortColumn) => REQUIRED_COLUMNS.has(column);

  // Usar portal para renderizar fuera de la tabla
  return createPortal(
    <>
      {/* Backdrop para cerrar al hacer click fuera */}
      <button
        type="button"
        data-testid="column-visibility-backdrop"
        className="fixed inset-0 z-40 bg-transparent border-none cursor-default"
        onClick={onClose}
        aria-label="Close menu"
      />

      {/* Menú flotante */}
      <div
        data-testid="column-visibility-menu"
        className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-[250px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Column visibility settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Column Visibility
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {visibleCount}/{totalColumns} columns visible
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Lista de columnas */}
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {COLUMN_ORDER.map((column) => {
            const isVisible = visibleColumns.has(column);
            const required = isRequired(column);

            return (
              <label
                key={column}
                className={`
                  flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                  ${required ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                `}
                title={required ? 'Required column - cannot be hidden' : ''}
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  disabled={required}
                  onChange={() => onToggleColumn(column)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                  aria-label={COLUMN_LABELS[column]}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                  {COLUMN_LABELS[column]}
                </span>
                {required && (
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                    Required
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Footer con botón Reset */}
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onResetColumns}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>

        {/* Hint de atajos */}
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
            Esc
          </kbd>{' '}
          to close •{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
            Ctrl+R
          </kbd>{' '}
          to reset
        </div>
      </div>
    </>,
    document.body
  );
};

ColumnVisibilityMenu.displayName = 'ColumnVisibilityMenu';
