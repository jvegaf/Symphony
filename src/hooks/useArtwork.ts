/**
 * Hook para obtener el artwork (portada) de pistas de audio
 *
 * AIDEV-NOTE: Extrae artwork on-demand desde archivos de audio.
 * Incluye cache en memoria para evitar re-extracciones.
 *
 * @example
 * const { artwork, isLoading, error, refetch } = useArtwork(trackId);
 * // artwork es base64 data URI listo para usar en <img src={artwork} />
 */
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

interface UseArtworkResult {
  /** Base64 data URI de la imagen, null si no hay artwork */
  artwork: string | null;
  /** Indica si está cargando */
  isLoading: boolean;
  /** Error si la extracción falló */
  error: string | null;
  /** Refetch manual del artwork */
  refetch: () => void;
}

// Cache en memoria para evitar re-extracciones
const artworkCache = new Map<string, string | null>();

/**
 * Hook para obtener el artwork de una pista
 *
 * @param trackId - UUID de la pista, null/undefined para no cargar
 * @returns Estado de la carga y el artwork
 */
export function useArtwork(trackId: string | null | undefined): UseArtworkResult {
  const [artwork, setArtwork] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArtwork = useCallback(async () => {
    if (!trackId) {
      setArtwork(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Verificar cache
    if (artworkCache.has(trackId)) {
      setArtwork(artworkCache.get(trackId) ?? null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<string | null>("get_track_artwork", { id: trackId });
      artworkCache.set(trackId, result);
      setArtwork(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setArtwork(null);
    } finally {
      setIsLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    fetchArtwork();
  }, [fetchArtwork]);

  return {
    artwork,
    isLoading,
    error,
    refetch: fetchArtwork,
  };
}

/**
 * Limpia el cache de artwork
 * Útil cuando se actualiza el artwork de una pista
 */
export function clearArtworkCache(trackId?: string): void {
  if (trackId) {
    artworkCache.delete(trackId);
  } else {
    artworkCache.clear();
  }
}

export default useArtwork;
