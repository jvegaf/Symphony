/**
 * Library Batch Operations - Operaciones batch para biblioteca
 * Separado siguiendo Single Responsibility Principle
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Track } from "../../types/library";
import type { UpdateTrackMetadataRequest } from "./useLibraryMutations";

/**
 * Extrae artista y título del filename usando patrón "Artista - Título"
 * 
 * @param path - Path completo del archivo
 * @returns Objeto con artist, title y matched (si coincidió con el patrón)
 */
export const extractMetadataFromFilename = (path: string): { artist: string; title: string; matched: boolean } => {
  // Normalizar path para manejar tanto / como \
  const normalizedPath = path.replace(/\\/g, '/');
  
  // Extraer filename sin extensión
  const fullFilename = normalizedPath.split('/').pop() || '';
  const lastDotIndex = fullFilename.lastIndexOf('.');
  const filename = lastDotIndex > 0 ? fullFilename.substring(0, lastDotIndex) : fullFilename;
  
  // Buscar el separador "-" en el filename
  const separatorIndex = filename.indexOf('-');
  
  if (separatorIndex > 0 && separatorIndex < filename.length - 1) {
    // Extraer y limpiar artista y título
    const artist = filename.substring(0, separatorIndex).trim();
    const title = filename.substring(separatorIndex + 1).trim();
    // Solo es match válido si ambos tienen contenido
    const matched = artist.length > 0 && title.length > 0;
    return { artist, title, matched };
  } else {
    // Si no hay separador, no coincide con el patrón
    return { artist: '', title: filename.trim(), matched: false };
  }
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
    { success: number; failed: number; skipped: number; errors: string[] },
    Error,
    { tracks: Track[]; onProgress?: (current: number, total: number) => void }
  >({
    mutationFn: async ({ tracks, onProgress }) => {
      const total = tracks.length;
      let completed = 0;
      let skipped = 0;

      const results = await Promise.allSettled(
        tracks.map(async (track) => {
          if (!track.id) {
            throw new Error(`Track sin ID: ${track.path}`);
          }

          const { artist, title, matched } = extractMetadataFromFilename(track.path);
          
          // Solo actualizar si coincide con el patrón "Artista - Título"
          if (!matched) {
            skipped++;
            completed++;
            if (onProgress) {
              onProgress(completed, total);
            }
            // Retornar null para indicar que fue saltado (no es error)
            return null;
          }
          
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

      // Contar solo los que realmente se procesaron (no nulls)
      const success = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason?.message || String(r.reason));

      return { success, failed, skipped, errors };
    },
    onSuccess: (result) => {
      // Invalidar queries para refrescar UI
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      
      // Log resultado
      console.log(`Batch update complete: ${result.success} success, ${result.failed} failed, ${result.skipped} skipped (no pattern match)`);
      if (result.errors.length > 0) {
        console.error('Batch errors:', result.errors);
      }
    },
    onError: (error) => {
      console.error("Error in batch filename→tags update:", error);
    },
  });
};
