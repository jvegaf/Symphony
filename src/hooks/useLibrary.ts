import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type {
  ImportProgress,
  ImportResult,
  LibraryStats,
  Track,
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
      try {
        const tracks = await invoke<Track[]>("get_all_tracks");
        return tracks;
      } catch (error) {
        console.warn("Error fetching tracks:", error);
        return []; // Retornar array vacío en caso de error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false, // No reintentar automáticamente
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
 * @param id - ID de la pista (UUID)
 * @param enabled - Si la query está habilitada (default: true)
 * 
 * @example
 * ```tsx
 * const { data: track } = useGetTrack("550e8400-e29b-41d4-a716-446655440000");
 * ```
 */
export const useGetTrack = (id: string, enabled = true) => {
  // AIDEV-NOTE: Validar que el ID sea un UUID válido o al menos no sea "0"
  // UUIDs son strings de 36 caracteres (incluyendo guiones) o números válidos
  const isValidId = id.length > 0 && id !== "0";
  
  return useQuery<Track, Error>({
    queryKey: ["tracks", "byId", id],
    queryFn: async () => {
      const track = await invoke<Track>("get_track_by_id", { id });
      return track;
    },
    enabled: enabled && isValidId,
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
      try {
        const stats = await invoke<LibraryStats>("get_library_stats");
        return stats;
      } catch (error) {
        console.warn("Error fetching library stats:", error);
        // Retornar estadísticas vacías en caso de error
        return {
          totalTracks: 0,
          totalArtists: 0,
          totalAlbums: 0,
          totalDurationHours: 0,
          totalSizeGb: 0,
          ratingDistribution: [0, 0, 0, 0, 0, 0], // [0-5 stars]
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false, // No reintentar automáticamente
  });
};

/**
 * Payload para actualizar metadatos de un track
 * AIDEV-NOTE: Debe coincidir con UpdateTrackMetadataRequest en Rust
 */
interface UpdateTrackMetadataRequest {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  bpm?: number;
  key?: string;
  rating?: number; // 0-5 estrellas
  comment?: string;
}

/**
 * Hook para actualizar rating de un track
 * 
 * AIDEV-NOTE: Actualiza tanto la DB como el archivo físico MP3 (frame POPM)
 * El backend convierte automáticamente 0-5 estrellas → 0-255 POPM
 * 
 * @example
 * ```tsx
 * const { mutate: updateRating } = useUpdateTrackRating();
 * 
 * const handleRatingChange = (trackId: string, rating: number) => {
 *   updateRating({ trackId, rating });
 * };
 * ```
 */
export const useUpdateTrackRating = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { trackId: string; rating: number }
  >({
    mutationFn: async ({ trackId, rating }) => {
      // Validar rating en frontend (0-5)
      const clampedRating = Math.max(0, Math.min(rating, 5));
      
      const request: UpdateTrackMetadataRequest = {
        id: trackId,
        rating: clampedRating,
      };

      await invoke<void>("update_track_metadata", { request });
    },
    onSuccess: (_, variables) => {
      // Invalidar queries para refrescar UI
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({
        queryKey: ["tracks", "byId", variables.trackId],
      });
    },
    onError: (error) => {
      console.error("Error updating track rating:", error);
    },
  });
};

/**
 * Hook para actualizar metadatos completos de un track
 * 
 * @example
 * ```tsx
 * const { mutate: updateMetadata } = useUpdateTrackMetadata();
 * 
 * updateMetadata({
 *   trackId: "uuid",
 *   title: "New Title",
 *   artist: "New Artist",
 *   rating: 5
 * });
 * ```
 */
export const useUpdateTrackMetadata = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    UpdateTrackMetadataRequest
  >({
    mutationFn: async (request) => {
      await invoke<void>("update_track_metadata", { request });
    },
    onSuccess: (_, variables) => {
      // Invalidar queries para refrescar UI
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      queryClient.invalidateQueries({
        queryKey: ["tracks", "byId", variables.id],
      });
    },
    onError: (error) => {
      console.error("Error updating track metadata:", error);
    },
  });
};
