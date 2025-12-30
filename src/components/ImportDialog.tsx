import React, { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useImportLibrary } from "../hooks/library";
import type { ImportResult } from "../types/library";

export interface ImportDialogProps {
  onComplete?: (result: ImportResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Diálogo para importar biblioteca musical
 * 
 * Permite seleccionar carpeta, muestra progreso en tiempo real
 * y notifica al completarse la importación.
 * 
 * @example
 * ```tsx
 * <ImportDialog
 *   onComplete={(result) => console.log(`Importadas ${result.imported} pistas`)}
 * />
 * ```
 */
export const ImportDialog: React.FC<ImportDialogProps> = ({
  onComplete,
  onError,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>("");
  const { mutate, progress, isPending, isError, error } = useImportLibrary();

  const handleSelectFolder = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: "Seleccionar carpeta de música",
      });

      if (result) {
        setSelectedPath(result);
      }
    } catch (err) {
      console.error("Error al seleccionar carpeta:", err);
    }
  };

  const handleImport = () => {
    if (!selectedPath) return;

    mutate(selectedPath, {
      onSuccess: (result) => {
        onComplete?.(result);
      },
      onError: (err) => {
        onError?.(err as Error);
      },
    });
  };

  const progressPercentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full" data-testid="import-dialog">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Importar Biblioteca
      </h2>

      {/* Selección de carpeta */}
      <div className="mb-4">
        <button
          type="button"
          data-testid="select-folder-button"
          onClick={handleSelectFolder}
          disabled={isPending}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Seleccionar Carpeta
        </button>

        {selectedPath && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 truncate" data-testid="selected-path">
            {selectedPath}
          </p>
        )}
      </div>

      {/* Botón de importar */}
      {selectedPath && !isPending && (
        <button
          type="button"
          data-testid="import-button"
          onClick={handleImport}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mb-4"
        >
          Importar
        </button>
      )}

      {/* Progreso */}
      {isPending && (
        <div className="mb-4" data-testid="import-progress">
          <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-2">
            <span className="capitalize" data-testid="import-phase">{progress.phase}</span>
            <span data-testid="import-count">
              {progress.current} / {progress.total}
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              data-testid="import-progress-bar"
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {progressPercentage.toFixed(1)}% completado
          </p>
        </div>
      )}

      {/* Error */}
      {isError && error && (
        <div
          className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded mb-4"
          role="alert"
          data-testid="import-error"
        >
          <p className="font-semibold">Error:</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Completado */}
      {progress.phase === "complete" && !isPending && (
        <div
          className="p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded"
          role="status"
          data-testid="import-complete"
        >
          <p className="font-semibold">✓ Importación completada</p>
        </div>
      )}
    </div>
  );
};
