import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type {
  Track,
  ImportProgress,
  ImportResult,
  LibraryStats,
} from "../types/library";

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

/**
 * Hook para obtener todas las pistas de la biblioteca
 * 
 * @example
 * ```tsx
 * const { data: tracks, isLoading } = useGetAllTracks();
 * ```
 */
export const useGetAllTracks = () => {
  return useQuery<Track[], Error>({
    queryKey: ["tracks", "all"],
    queryFn: async () => {
      const tracks = await invoke<Track[]>("get_all_tracks");
      return tracks;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para buscar pistas
 * 
 * @param query - Término de búsqueda
 * @param enabled - Si la búsqueda está habilitada (default: true)
 * 
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState("");
 * const { data: tracks } = useSearchTracks(searchQuery, searchQuery.length > 0);
 * ```
 */
export const useSearchTracks = (query: string, enabled = true) => {
  return useQuery<Track[], Error>({
    queryKey: ["tracks", "search", query],
    queryFn: async () => {
      const tracks = await invoke<Track[]>("search_tracks", { query });
      return tracks;
    },
    enabled: enabled && query.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

/**
 * Hook para obtener una pista por ID
 * 
 * @param id - ID de la pista
 * @param enabled - Si la query está habilitada (default: true)
 * 
 * @example
 * ```tsx
 * const { data: track } = useGetTrack(123);
 * ```
 */
export const useGetTrack = (id: number, enabled = true) => {
  return useQuery<Track, Error>({
    queryKey: ["tracks", "byId", id],
    queryFn: async () => {
      const track = await invoke<Track>("get_track_by_id", { id });
      return track;
    },
    enabled: enabled && id > 0,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para obtener estadísticas de la biblioteca
 * 
 * @example
 * ```tsx
 * const { data: stats } = useLibraryStats();
 * console.log(`Total pistas: ${stats?.totalTracks}`);
 * ```
 */
export const useLibraryStats = () => {
  return useQuery<LibraryStats, Error>({
    queryKey: ["library-stats"],
    queryFn: async () => {
      const stats = await invoke<LibraryStats>("get_library_stats");
      return stats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};
