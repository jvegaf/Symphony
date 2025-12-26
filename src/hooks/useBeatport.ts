/**
 * Hook para integración con Beatport
 * 
 * Proporciona el mutation useFixTags para corregir tags de tracks
 * y escucha eventos de progreso desde el backend.
 */

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { BatchFixResult, FixTagsProgress } from "../types/beatport";

/**
 * Hook para escuchar eventos de progreso de fix_tags
 * 
 * @returns Estado actual del progreso y función para resetear
 */
export function useBeatportProgress() {
  const [progress, setProgress] = useState<FixTagsProgress | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      unlisten = await listen<FixTagsProgress>("beatport:progress", (event) => {
        setProgress(event.payload);
        setIsActive(true);

        // Si completó, desactivar después de un delay
        if (event.payload.phase === "complete") {
          setTimeout(() => {
            setIsActive(false);
          }, 2000);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    setIsActive(false);
  }, []);

  return { progress, isActive, reset };
}

/**
 * Hook para ejecutar fix_tags en tracks seleccionados
 * 
 * @returns Mutation de TanStack Query con métodos y estado
 */
export function useFixTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackIds: string[]): Promise<BatchFixResult> => {
      return await invoke<BatchFixResult>("fix_tags", { trackIds });
    },
    onSuccess: () => {
      // Invalidar queries de tracks para refrescar la tabla
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["library-stats"] });
    },
    onError: (error) => {
      console.error("Error en fix_tags:", error);
    },
  });
}

/**
 * Hook combinado que proporciona tanto el mutation como el progreso
 * 
 * @example
 * ```tsx
 * const { fixTags, progress, isFixing, result } = useBeatport();
 * 
 * const handleFixTags = async () => {
 *   await fixTags.mutateAsync(selectedTrackIds);
 * };
 * ```
 */
export function useBeatport() {
  const fixTags = useFixTags();
  const { progress, isActive, reset } = useBeatportProgress();

  return {
    fixTags,
    progress,
    isFixing: fixTags.isPending || isActive,
    result: fixTags.data,
    error: fixTags.error,
    reset,
  };
}
