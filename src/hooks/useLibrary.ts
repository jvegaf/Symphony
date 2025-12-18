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
}

/**
 * Extrae artista y título del filename usando patrón "Artista - Título"
 * 
 * @param path - Path completo del archivo
 * @returns Objeto con artist y title extraídos
 */
export const extractMetadataFromFilename = (path: string): { artist: string; title: string } => {
  // Extraer filename sin extensión
  const fullFilename = path.split('/').pop() || path.split('\\').pop() || '';
  const lastDotIndex = fullFilename.lastIndexOf('.');
  const filename = lastDotIndex > 0 ? fullFilename.substring(0, lastDotIndex) : fullFilename;
  
  // Buscar el separador "-" en el filename
  const separatorIndex = filename.indexOf('-');
  
  if (separatorIndex > 0 && separatorIndex < filename.length - 1) {
    // Extraer y limpiar artista y título
    const artist = filename.substring(0, separatorIndex).trim();
    const title = filename.substring(separatorIndex + 1).trim();
    return { artist, title };
  } else {
    // Si no hay separador, asignar todo al título
    return { artist: '', title: filename.trim() };
  }
};

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

/**
 * Hook para actualizar metadatos desde nombre de archivo (batch)
 * 
 * AIDEV-NOTE: Extrae Artist y Title desde filename con formato "Artist - Title.ext"
 * y actualiza múltiples tracks en paralelo con Promise.allSettled (continúa si hay errores)
 * 
 * @example
 * ```tsx
 * const { mutate: batchUpdate, isPending } = useBatchFilenameToTags();
 * 
 * batchUpdate({
 *   tracks: selectedTracks,
 *   onProgress: (current, total) => setProgress({ current, total })
 * }, {
 *   onSuccess: (result) => {
 *     console.log(`${result.success} tracks actualizados, ${result.failed} fallidos`);
 *   }
 * });
 * ```
 */
export const useBatchFilenameToTags = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: number; failed: number; errors: string[] },
    Error,
    { tracks: Track[]; onProgress?: (current: number, total: number) => void }
  >({
    mutationFn: async ({ tracks, onProgress }) => {
      const total = tracks.length;
      let completed = 0;

      const results = await Promise.allSettled(
        tracks.map(async (track) => {
          if (!track.id) {
            throw new Error(`Track sin ID: ${track.path}`);
          }

          const { artist, title } = extractMetadataFromFilename(track.path);
          
          const request: UpdateTrackMetadataRequest = {
            id: track.id,
            title: title || undefined,
            artist: artist || undefined,
          };

          await invoke<void>("update_track_metadata", { request });
          
          // Actualizar progreso
          completed++;
          if (onProgress) {
            onProgress(completed, total);
          }
          
          return track.id;
        })
      );

      const success = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason?.message || String(r.reason));

      return { success, failed, errors };
    },
    onSuccess: (result) => {
      // Invalidar queries para refrescar UI
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      
      // Log resultado
      console.log(`Batch update complete: ${result.success} success, ${result.failed} failed`);
      if (result.errors.length > 0) {
        console.error('Batch errors:', result.errors);
      }
    },
    onError: (error) => {
      console.error("Error in batch filename→tags update:", error);
    },
  });
};
