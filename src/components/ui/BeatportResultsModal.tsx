import React from 'react';
import { cn } from '../../utils/cn';
import type { BatchFixResult } from '../../types/beatport';

interface BeatportResultsModalProps {
  /** Resultado del proceso batch de Beatport */
  result: BatchFixResult;
  /** Callback para cerrar el modal */
  onClose: () => void;
  /** Mapa de track_id -> título para mostrar nombres */
  trackTitles?: Map<string, string>;
}

/**
 * Modal que muestra los resultados del proceso de Fix Tags con Beatport
 * 
 * Muestra un resumen y lista las canciones que no se pudieron encontrar.
 * 
 * @component
 * @example
 * <BeatportResultsModal 
 *   result={batchResult} 
 *   onClose={() => setShowModal(false)}
 *   trackTitles={trackTitlesMap}
 * />
 */
export const BeatportResultsModal: React.FC<BeatportResultsModalProps> = ({
  result,
  onClose,
  trackTitles,
}) => {
  const failedResults = result.results.filter(r => !r.success);
  const successResults = result.results.filter(r => r.success);

  const getTrackTitle = (trackId: string): string => {
    return trackTitles?.get(trackId) ?? trackId;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="material-icons text-primary">
              {result.failed_count === 0 ? 'check_circle' : 'info'}
            </span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resultados de Beatport
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Summary */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <div className={cn(
              "flex-1 rounded-lg p-3 text-center",
              "bg-green-50 dark:bg-green-900/20"
            )}>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {result.success_count}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Encontradas
              </div>
            </div>
            <div className={cn(
              "flex-1 rounded-lg p-3 text-center",
              result.failed_count > 0 
                ? "bg-red-50 dark:bg-red-900/20" 
                : "bg-gray-50 dark:bg-gray-700/50"
            )}>
              <div className={cn(
                "text-2xl font-bold",
                result.failed_count > 0 
                  ? "text-red-600 dark:text-red-400" 
                  : "text-gray-400 dark:text-gray-500"
              )}>
                {result.failed_count}
              </div>
              <div className={cn(
                "text-sm",
                result.failed_count > 0 
                  ? "text-red-700 dark:text-red-300" 
                  : "text-gray-500 dark:text-gray-400"
              )}>
                No encontradas
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Canciones no encontradas */}
          {failedResults.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="material-icons text-red-500 text-base">error_outline</span>
                Canciones no encontradas en Beatport
              </h3>
              <div className="space-y-2">
                {failedResults.map((r) => (
                  <div 
                    key={r.track_id}
                    className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-md"
                  >
                    <span className="material-icons text-red-400 text-sm mt-0.5">
                      music_off
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {getTrackTitle(r.track_id)}
                      </div>
                      {r.error && (
                        <div className="text-xs text-red-600 dark:text-red-400 truncate">
                          {r.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canciones encontradas (colapsable) */}
          {successResults.length > 0 && (
            <details className="group">
              <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 cursor-pointer list-none">
                <span className="material-icons text-green-500 text-base transition-transform group-open:rotate-90">
                  chevron_right
                </span>
                <span className="material-icons text-green-500 text-base">check_circle</span>
                Canciones actualizadas ({successResults.length})
              </summary>
              <div className="space-y-1 mt-2 ml-6">
                {successResults.map((r) => (
                  <div 
                    key={r.track_id}
                    className="flex items-center gap-2 p-1.5 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span className="material-icons text-green-400 text-sm">
                      music_note
                    </span>
                    <span className="truncate">{getTrackTitle(r.track_id)}</span>
                    {r.tags_applied?.bpm && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        • {r.tags_applied.bpm} BPM
                      </span>
                    )}
                    {r.tags_applied?.key && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        • {r.tags_applied.key}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Mensaje si todo fue exitoso */}
          {result.failed_count === 0 && result.success_count > 0 && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <span className="material-icons text-green-500 text-4xl mb-2">
                celebration
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                ¡Todas las canciones se actualizaron correctamente!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

BeatportResultsModal.displayName = 'BeatportResultsModal';
