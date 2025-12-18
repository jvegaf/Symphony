import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Star, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import type { Track } from "../types/library";

interface TrackDetailProps {
  trackId: string; // AIDEV-NOTE: UUID v4, no number
  tracks?: Track[]; // Lista completa de tracks para navegación
  onNavigate?: (trackId: string) => void; // Callback para cambiar de track
}

interface UpdateTrackMetadataRequest {
  track_id: string; // AIDEV-NOTE: UUID v4, no number
  metadata: {
    title: string;
    artist: string;
    album: string;
    year: number;
    genre: string;
    rating: number;
    bpm?: number;
    key?: string;
  };
}

/**
 * Componente para ver y editar metadatos de un track individual
 * 
 * AIDEV-NOTE: Cambios recientes:
 * - Filename SIN extensión mostrado en título del header (reemplaza "Editar Track")
 * - Path completo mostrado en subtítulo con fuente monospace (reemplaza texto descriptivo)
 * - Ambos con truncate y tooltip para rutas largas
 * - Agregados botones de navegación Previous/Next para cambiar entre tracks
 * - Soporte para navegación sin cerrar el modal
 * - Header usa min-w-0 y flex-1 para truncar correctamente en containers flex
 * - Función getFilenameWithoutExtension() maneja casos edge (archivos ocultos, sin extensión)
 * - Botón "Filename→Tags" extrae artista y título del nombre del archivo
 * - Tracking de cambios: campos modificados se marcan con ring-2 ring-yellow-400
 * - Botón "Guardar" solo aparece cuando hay cambios pendientes (hasChanges)
 * - Fix: comando update_track_metadata usa 'id' y campos directos (no 'track_id' y 'metadata')
 * - Fix: Removido campo 'comment' (no existe en DB schema ni en Track model)
 * - Fix: Agregado 'key' parameter a queries::update_track_metadata en Rust
 */
export const TrackDetail: React.FC<TrackDetailProps> = ({ trackId, tracks = [], onNavigate }) => {
  const queryClient = useQueryClient();

  // Estado local para campos editables
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [year, setYear] = useState<number>(0);
  const [genre, setGenre] = useState("");
  const [rating, setRating] = useState(0);
  const [bpm, setBpm] = useState<number>(0);
  const [key, setKey] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // AIDEV-NOTE: Estados originales para detectar cambios
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalArtist, setOriginalArtist] = useState("");
  const [originalAlbum, setOriginalAlbum] = useState("");
  const [originalYear, setOriginalYear] = useState<number>(0);
  const [originalGenre, setOriginalGenre] = useState("");
  const [originalRating, setOriginalRating] = useState(0);
  const [originalBpm, setOriginalBpm] = useState<number>(0);
  const [originalKey, setOriginalKey] = useState("");

  // Query para obtener el track
  const {
    data: track,
    isLoading,
    isError,
  } = useQuery<Track>({
    queryKey: ["track", trackId],
    queryFn: async () => {
      // AIDEV-NOTE: Comando correcto es get_track_by_id con parámetro 'id'
      const result = await invoke<Track>("get_track_by_id", { id: trackId });
      return result;
    },
  });

  // AIDEV-NOTE: Lógica de navegación entre tracks
  const currentIndex = tracks.findIndex((t) => t.id === trackId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < tracks.length - 1;

  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      const prevTrack = tracks[currentIndex - 1];
      if (prevTrack.id) {
        onNavigate(prevTrack.id);
      }
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      const nextTrack = tracks[currentIndex + 1];
      if (nextTrack.id) {
        onNavigate(nextTrack.id);
      }
    }
  };

  // AIDEV-NOTE: Extraer filename y path del track
  // Extrae el nombre del archivo sin la extensión
  const getFilenameWithoutExtension = (path: string): string => {
    const fullFilename = path.split('/').pop() || path.split('\\').pop() || '';
    const lastDotIndex = fullFilename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return fullFilename; // No hay extensión o archivo oculto tipo .gitignore
    }
    return fullFilename.substring(0, lastDotIndex);
  };
  
  const filename = track ? getFilenameWithoutExtension(track.path) : '';
  const filepath = track?.path || '';

  // Sincronizar estado local con datos del servidor
  useEffect(() => {
    if (track) {
      const trackTitle = track.title || "";
      const trackArtist = track.artist || "";
      const trackAlbum = track.album || "";
      const trackYear = track.year || 0;
      const trackGenre = track.genre || "";
      const trackRating = track.rating || 0;
      const trackBpm = track.bpm || 0;
      const trackKey = track.key || "";

      setTitle(trackTitle);
      setArtist(trackArtist);
      setAlbum(trackAlbum);
      setYear(trackYear);
      setGenre(trackGenre);
      setRating(trackRating);
      setBpm(trackBpm);
      setKey(trackKey);

      // Guardar valores originales
      setOriginalTitle(trackTitle);
      setOriginalArtist(trackArtist);
      setOriginalAlbum(trackAlbum);
      setOriginalYear(trackYear);
      setOriginalGenre(trackGenre);
      setOriginalRating(trackRating);
      setOriginalBpm(trackBpm);
      setOriginalKey(trackKey);
    }
  }, [track]);

  // AIDEV-NOTE: Detectar si hay cambios comparando con valores originales
  const hasChanges = 
    title !== originalTitle ||
    artist !== originalArtist ||
    album !== originalAlbum ||
    year !== originalYear ||
    genre !== originalGenre ||
    rating !== originalRating ||
    bpm !== originalBpm ||
    key !== originalKey;

  // Helper para obtener clases de campo modificado
  const getModifiedFieldClass = (current: string | number, original: string | number): string => {
    return current !== original ? "ring-2 ring-yellow-400 dark:ring-yellow-500" : "";
  };

  // Mutation para actualizar metadatos
  const updateMutation = useMutation({
    mutationFn: async (metadata: UpdateTrackMetadataRequest["metadata"]) => {
      // AIDEV-NOTE: El comando Rust espera un objeto 'request' con los campos
      const request = {
        id: trackId,
        title: metadata.title || null,
        artist: metadata.artist || null,
        album: metadata.album || null,
        year: metadata.year > 0 ? metadata.year : null,
        genre: metadata.genre || null,
        rating: metadata.rating,
        bpm: metadata.bpm && metadata.bpm > 0 ? metadata.bpm : null,
        key: metadata.key || null,
      };
      
      console.log("=== SAVING TRACK METADATA ===");
      console.log("Request:", JSON.stringify(request, null, 2));
      
      try {
        // El comando espera { request: {...} }
        await invoke("update_track_metadata", { request });
        console.log("✅ Save successful");
      } catch (error) {
        console.error("❌ Error saving track metadata:");
        console.error("Error object:", error);
        console.error("Error type:", typeof error);
        console.error("Error stringified:", JSON.stringify(error, null, 2));
        
        // Show alert with error details
        const errorMessage = typeof error === 'string' 
          ? error 
          : error instanceof Error 
            ? error.message 
            : JSON.stringify(error);
        
        alert(`Error al guardar:\n\n${errorMessage}\n\nMira la consola (F12) para más detalles.`);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", trackId] });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("=== MUTATION ERROR ===");
      console.error(error);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      title: title || "",
      artist: artist || "",
      album: album || "",
      year: year || 0,
      genre: genre || "",
      rating,
      bpm: bpm || 0,
      key: key || "",
    });
  };

  const handleRatingChange = (newRating: number) => {
    const clampedRating = Math.max(0, Math.min(5, newRating));
    setRating(clampedRating);
    
    // Auto-save rating
    updateMutation.mutate({
      title: title || "",
      artist: artist || "",
      album: album || "",
      year: year || 0,
      genre: genre || "",
      rating: clampedRating,
      bpm: bpm || 0,
      key: key || "",
    });
  };

  // AIDEV-NOTE: Extrae artista y título del filename usando patrón {artista}-{titulo}
  const handleExtractFromFilename = () => {
    if (!filename) return;

    // Buscar el separador "-" en el filename
    const separatorIndex = filename.indexOf('-');
    
    if (separatorIndex > 0 && separatorIndex < filename.length - 1) {
      // Extraer y limpiar artista y título
      const extractedArtist = filename.substring(0, separatorIndex).trim();
      const extractedTitle = filename.substring(separatorIndex + 1).trim();
      
      // Actualizar estados
      setArtist(extractedArtist);
      setTitle(extractedTitle);
    } else {
      // Si no hay separador, asignar todo al título
      setTitle(filename.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 dark:text-gray-400">Cargando track...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600 dark:text-red-400">
          Error al cargar el track
        </p>
      </div>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        {/* Header con botones de navegación */}
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate" title={filename}>
                {filename || 'Editar Track'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate font-mono" title={filepath}>
                {filepath || 'Modifica los metadatos del track'}
              </p>
            </div>
            
            {/* Botones de navegación */}
            {tracks.length > 0 && onNavigate && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={!hasPrevious}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Track anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {currentIndex + 1} / {tracks.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Track siguiente"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AIDEV-NOTE: Layout de dos columnas - Imagen del disco y campos de edición */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columna izquierda: Artwork del disco */}
          <div className="md:col-span-1 flex items-center justify-center">
            <div className="w-full max-w-[280px] aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg shadow-lg flex items-center justify-center">
              {/* AIDEV-NOTE: Placeholder para artwork - TODO: implementar extracción de artwork desde MP3 */}
              <div className="text-center p-6">
                <span className="material-icons text-6xl text-gray-400 dark:text-gray-500 mb-2">
                  album
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No artwork
                </p>
              </div>
            </div>
          </div>

          {/* Columna derecha: Campos de edición */}
          <div className="md:col-span-2 space-y-4">
          {/* Botón para extraer artista y título del filename */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExtractFromFilename}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              title="Extrae Artista y Título del nombre del archivo (formato: Artista-Título)"
            >
              <FileText className="w-4 h-4" />
              <span>Filename→Tags</span>
            </button>
          </div>

          {/* Título */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Título
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del track"
              className={getModifiedFieldClass(title, originalTitle)}
            />
          </div>

          {/* Artista */}
          <div>
            <label
              htmlFor="artist"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Artista
            </label>
            <Input
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artista"
              className={getModifiedFieldClass(artist, originalArtist)}
            />
          </div>

          {/* Álbum */}
          <div>
            <label
              htmlFor="album"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Álbum
            </label>
            <Input
              id="album"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              placeholder="Álbum"
              className={getModifiedFieldClass(album, originalAlbum)}
            />
          </div>

          {/* Año y Género en fila */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="year"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Año
              </label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 0)}
                placeholder="Año"
                className={getModifiedFieldClass(year, originalYear)}
              />
            </div>
            <div>
              <label
                htmlFor="genre"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Género
              </label>
              <Input
                id="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Género"
                className={getModifiedFieldClass(genre, originalGenre)}
              />
            </div>
          </div>

          {/* BPM y Key en fila */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="bpm"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                BPM
              </label>
              <Input
                id="bpm"
                type="number"
                value={bpm || ""}
                onChange={(e) => setBpm(parseFloat(e.target.value) || 0)}
                placeholder="BPM"
                className={getModifiedFieldClass(bpm, originalBpm)}
              />
            </div>
            <div>
              <label
                htmlFor="key"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tonalidad
              </label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Ej: Am, C#m"
                className={getModifiedFieldClass(key, originalKey)}
              />
            </div>
          </div>

          {/* Rating con estrellas */}
          <div>
            <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rating
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingChange(star)}
                  className="p-1 hover:scale-110 transition-transform"
                  aria-label={`Star ${star}`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between pt-4">
            <div>
              {showSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Guardado correctamente
                </p>
              )}
              {updateMutation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error al guardar cambios
                </p>
              )}
            </div>
            {hasChanges && (
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

TrackDetail.displayName = "TrackDetail";
