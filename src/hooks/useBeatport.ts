/**
 * Hook para integración con Beatport
 * 
 * Proporciona los mutations useFixTags y useFindArtwork para corregir tags
 * y buscar artwork de tracks, y escucha eventos de progreso desde el backend.
 * 
 * También incluye useSearchCandidates y useApplySelectedTags para el nuevo
 * flujo de selección manual de matches.
 */

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { 
  BatchFixResult, 
  FixTagsProgress,
  SearchCandidatesResult,
  TrackSelection,
} from "../types/beatport";

/**
 * Hook para escuchar eventos de progreso de fix_tags/find_artwork
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
 * Hook para buscar y aplicar SOLO artwork desde Beatport
 * 
 * @returns Mutation de TanStack Query con métodos y estado
 */
export function useFindArtwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trackIds: string[]): Promise<BatchFixResult> => {
      return await invoke<BatchFixResult>("find_artwork", { trackIds });
    },
    onSuccess: () => {
      // Invalidar queries de tracks para refrescar artwork en la UI
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["artwork"] });
    },
    onError: (error) => {
      console.error("Error en find_artwork:", error);
    },
  });
}

// ============================================================================
// Nuevos hooks para selección manual de candidatos
// ============================================================================

/**
 * Hook para buscar candidatos de Beatport para tracks seleccionados
 * 
 * Devuelve hasta 4 candidatos por track con scores de similitud,
 * permitiendo al usuario elegir el match correcto.
 * 
 * @returns Mutation de TanStack Query con métodos y estado
 */
export function useSearchCandidates() {
  return useMutation({
    mutationFn: async (trackIds: string[]): Promise<SearchCandidatesResult> => {
      return await invoke<SearchCandidatesResult>("search_beatport_candidates", { trackIds });
    },
    onError: (error) => {
      console.error("Error en search_beatport_candidates:", error);
    },
  });
}

/**
 * Hook para aplicar tags de los candidatos seleccionados por el usuario
 * 
 * @returns Mutation de TanStack Query con métodos y estado
 */
export function useApplySelectedTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (selections: TrackSelection[]): Promise<BatchFixResult> => {
      return await invoke<BatchFixResult>("apply_selected_tags", { selections });
    },
    onSuccess: () => {
      // Invalidar queries de tracks para refrescar la tabla
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({ queryKey: ["library-stats"] });
      queryClient.invalidateQueries({ queryKey: ["artwork"] });
    },
    onError: (error) => {
      console.error("Error en apply_selected_tags:", error);
    },
  });
}

/**
 * Hook combinado que proporciona tanto el mutation como el progreso
 * 
 * @example
 * ```tsx
 * const { fixTags, findArtwork, progress, isFixing, result } = useBeatport();
 * 
 * const handleFixTags = async () => {
 *   await fixTags.mutateAsync(selectedTrackIds);
 * };
 * 
 * const handleFindArtwork = async () => {
 *   await findArtwork.mutateAsync(selectedTrackIds);
 * };
 * ```
 */
export function useBeatport() {
  const fixTags = useFixTags();
  const findArtwork = useFindArtwork();
  const searchCandidates = useSearchCandidates();
  const applySelectedTags = useApplySelectedTags();
  const { progress, isActive, reset } = useBeatportProgress();

  return {
    // Operaciones originales (automáticas)
    fixTags,
    findArtwork,
    // Nuevas operaciones (con selección manual)
    searchCandidates,
    applySelectedTags,
    // Estado compartido
    progress: progress ?? { current: 0, total: 0, current_track_title: "", phase: "searching" as const },
    isFixing: fixTags.isPending || findArtwork.isPending || searchCandidates.isPending || applySelectedTags.isPending || isActive,
    isSearching: searchCandidates.isPending,
    isApplying: applySelectedTags.isPending,
    result: fixTags.data || findArtwork.data || applySelectedTags.data,
    candidatesResult: searchCandidates.data,
    error: fixTags.error || findArtwork.error || searchCandidates.error || applySelectedTags.error,
    reset,
  };
}
