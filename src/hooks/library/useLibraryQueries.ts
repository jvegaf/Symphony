/**
 * Library Queries - Hooks de solo lectura para biblioteca
 * Separado siguiendo Single Responsibility Principle
 */
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { LibraryStats, Track } from "../../types/library";

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
  // Validar que el ID sea un UUID válido o al menos no sea "0"
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
          ratingDistribution: [0, 0, 0, 0, 0, 0],
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false,
  });
};
