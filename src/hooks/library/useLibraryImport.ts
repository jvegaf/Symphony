/**
 * Library Import - Hook para importación de biblioteca
 * Separado siguiendo Single Responsibility Principle
 */
import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { ImportProgress, ImportResult } from "../../types/library";

/**
 * Hook para importar biblioteca musical
 * 
 * @example
 * ```tsx
 * const { mutate, progress, isLoading } = useImportLibrary();
 * 
 * const handleImport = async () => {
 *   mutate("/path/to/music", {
 *     onSuccess: (result) => {
 *       console.log(`Importadas ${result.imported} pistas`);
 *     }
 *   });
 * };
 * ```
 */
export const useImportLibrary = () => {
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    phase: "scanning",
  });
  const queryClient = useQueryClient();

  // Escuchar eventos de progreso
  useEffect(() => {
    let unlistenProgress: UnlistenFn | undefined;
    let unlistenComplete: UnlistenFn | undefined;

    const setupListeners = async () => {
      // Listener para progreso
      unlistenProgress = await listen<ImportProgress>(
        "library:import-progress",
        (event) => {
          setProgress(event.payload);
        }
      );

      // Listener para completado
      unlistenComplete = await listen<ImportResult>(
        "library:import-complete",
        () => {
          // Invalidar queries para refrescar datos
          queryClient.invalidateQueries({ queryKey: ["tracks"] });
          queryClient.invalidateQueries({ queryKey: ["library-stats"] });
        }
      );
    };

    setupListeners();

    return () => {
      unlistenProgress?.();
      unlistenComplete?.();
    };
  }, [queryClient]);

  const mutation = useMutation<ImportResult, Error, string>({
    mutationFn: async (path: string) => {
      const result = await invoke<ImportResult>("import_library", { path });
      return result;
    },
    onSuccess: () => {
      // Reset progress después de éxito
      setProgress({ current: 0, total: 0, phase: "complete" });
    },
  });

  return {
    ...mutation,
    progress,
  };
};
