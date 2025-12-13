import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Star } from "lucide-react";
import type { Track } from "../types/library";

interface TrackDetailProps {
  trackId: number;
}

interface UpdateTrackMetadataRequest {
  track_id: number;
  metadata: {
    title: string;
    artist: string;
    album: string;
    year: number;
    genre: string;
    rating: number;
  };
}

/**
 * Componente para ver y editar metadatos de un track individual
 */
export const TrackDetail: React.FC<TrackDetailProps> = ({ trackId }) => {
  const queryClient = useQueryClient();

  // Estado local para campos editables
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [year, setYear] = useState<number>(0);
  const [genre, setGenre] = useState("");
  const [rating, setRating] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Query para obtener el track
  const {
    data: track,
    isLoading,
    isError,
  } = useQuery<Track>({
    queryKey: ["track", trackId],
    queryFn: async () => {
      const result = await invoke<Track>("get_track", { id: trackId });
      return result;
    },
  });

  // Sincronizar estado local con datos del servidor
  useEffect(() => {
    if (track) {
      setTitle(track.title || "");
      setArtist(track.artist || "");
      setAlbum(track.album || "");
      setYear(track.year || 0);
      setGenre(track.genre || "");
      setRating(track.rating || 0);
    }
  }, [track]);

  // Mutation para actualizar metadatos
  const updateMutation = useMutation({
    mutationFn: async (metadata: UpdateTrackMetadataRequest["metadata"]) => {
      await invoke("update_track_metadata", {
        track_id: trackId,
        metadata,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", trackId] });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      title,
      artist,
      album,
      year,
      genre,
      rating,
    });
  };

  const handleRatingChange = (newRating: number) => {
    const clampedRating = Math.max(0, Math.min(5, newRating));
    setRating(clampedRating);
    
    // Auto-save rating
    updateMutation.mutate({
      title,
      artist,
      album,
      year,
      genre,
      rating: clampedRating,
    });
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
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Editar Track
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Modifica los metadatos del track
          </p>
        </div>

        <div className="space-y-4">
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
              />
            </div>
          </div>

          {/* Rating con estrellas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rating
            </label>
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
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

TrackDetail.displayName = "TrackDetail";
