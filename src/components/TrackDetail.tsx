/**
 * Componente para ver y editar metadatos de un track individual
 *
 * AIDEV-NOTE: Rediseño basado en mockup detail.html
 * - Header con icono, filename y botones Save/Cancel
 * - Layout 2 columnas: izquierda (artwork + botones), derecha (todos los campos)
 * - Inputs con estilo rounded-full y colores oscuros
 * - Soporte para navegación entre tracks (Previous/Next)
 */

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Track } from "../types/library";
import { useArtwork } from "../hooks/useArtwork";

interface TrackDetailProps {
  trackId: string;
  tracks?: Track[];
  onNavigate?: (trackId: string) => void;
  onFixTags?: (trackIds: string[]) => void;
  onClose?: () => void;
}

export const TrackDetail: React.FC<TrackDetailProps> = ({
  trackId,
  tracks = [],
  onNavigate,
  onFixTags,
  onClose,
}) => {
  const queryClient = useQueryClient();

  // Estado local para campos editables
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [year, setYear] = useState<number>(0);
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState<number>(0);
  const [key, setKey] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Estados originales para detectar cambios
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalArtist, setOriginalArtist] = useState("");
  const [originalAlbum, setOriginalAlbum] = useState("");
  const [originalYear, setOriginalYear] = useState<number>(0);
  const [originalGenre, setOriginalGenre] = useState("");
  const [originalBpm, setOriginalBpm] = useState<number>(0);
  const [originalKey, setOriginalKey] = useState("");
  const [originalRating, setOriginalRating] = useState(0);
  const [originalComment, setOriginalComment] = useState("");

  // Query para obtener el track
  const {
    data: track,
    isLoading,
    isError,
  } = useQuery<Track>({
    queryKey: ["track", trackId],
    queryFn: async () => {
      const result = await invoke<Track>("get_track_by_id", { id: trackId });
      return result;
    },
  });

  // Hook para obtener artwork
  const { artwork, isLoading: isArtworkLoading } = useArtwork(trackId);

  // Navegación entre tracks
  const currentIndex = tracks.findIndex((t) => t.id === trackId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < tracks.length - 1;

  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      const prevTrack = tracks[currentIndex - 1];
      if (prevTrack.id) onNavigate(prevTrack.id);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      const nextTrack = tracks[currentIndex + 1];
      if (nextTrack.id) onNavigate(nextTrack.id);
    }
  };

  // Extraer filename del path
  const getFilename = (path: string): string => {
    return path.split("/").pop() || path.split("\\").pop() || "";
  };

  // Extraer artista y título del filename usando patrón {artista} - {titulo}
  const handleExtractFromFilename = () => {
    if (!track) return;
    const filename = getFilename(track.path);
    // Quitar extensión
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    // Buscar separador " - "
    const separatorIndex = nameWithoutExt.indexOf(" - ");
    if (separatorIndex > 0) {
      setArtist(nameWithoutExt.substring(0, separatorIndex).trim());
      setTitle(nameWithoutExt.substring(separatorIndex + 3).trim());
    } else {
      // Sin separador, todo es título
      setTitle(nameWithoutExt.trim());
    }
  };

  const filename = track ? getFilename(track.path) : "";

  // Sincronizar estado local con datos del servidor
  useEffect(() => {
    if (track) {
      const trackTitle = track.title || "";
      const trackArtist = track.artist || "";
      const trackAlbum = track.album || "";
      const trackYear = track.year || 0;
      const trackGenre = track.genre || "";
      const trackBpm = track.bpm || 0;
      const trackKey = track.key || "";
      const trackRating = track.rating || 0;

      setTitle(trackTitle);
      setArtist(trackArtist);
      setAlbum(trackAlbum);
      setYear(trackYear);
      setGenre(trackGenre);
      setBpm(trackBpm);
      setKey(trackKey);
      setRating(trackRating);
      setComment("");

      setOriginalTitle(trackTitle);
      setOriginalArtist(trackArtist);
      setOriginalAlbum(trackAlbum);
      setOriginalYear(trackYear);
      setOriginalGenre(trackGenre);
      setOriginalBpm(trackBpm);
      setOriginalKey(trackKey);
      setOriginalRating(trackRating);
      setOriginalComment("");
    }
  }, [track]);

  // Detectar cambios
  const hasChanges =
    title !== originalTitle ||
    artist !== originalArtist ||
    album !== originalAlbum ||
    year !== originalYear ||
    genre !== originalGenre ||
    bpm !== originalBpm ||
    key !== originalKey ||
    rating !== originalRating ||
    comment !== originalComment;

  // Manejar tecla Escape para cerrar el modal
  // AIDEV-NOTE: Usamos capture:true para interceptar el evento antes que TrackTable
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation(); // Evita que TrackTable también lo procese
        if (hasChanges) {
          setShowConfirmDialog(true);
        } else {
          onClose?.();
        }
      }
    };

    // Capturar en la fase de capture para que se ejecute antes que otros listeners
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [hasChanges, onClose]);

  // Mutation para actualizar metadatos
  const updateMutation = useMutation({
    mutationFn: async () => {
      const request = {
        id: trackId,
        title,
        artist,
        album,
        year,
        genre,
        rating,
        bpm,
        key,
      };
      await invoke("update_track_metadata", { request });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["track", trackId] });
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      // Actualizar valores originales
      setOriginalTitle(title);
      setOriginalArtist(artist);
      setOriginalAlbum(album);
      setOriginalYear(year);
      setOriginalGenre(genre);
      setOriginalBpm(bpm);
      setOriginalKey(key);
      setOriginalRating(rating);
      setOriginalComment(comment);
    },
    onError: (error) => {
      console.error("Error saving track metadata:", error);
      alert(`Error al guardar: ${error}`);
    },
  });

  // Manejo de rating con auto-save
  const handleRatingChange = (newRating: number) => {
    const clampedRating = Math.max(0, Math.min(5, newRating));
    setRating(clampedRating);
  };

  const handleSave = () => {
    updateMutation.mutate();
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      // Restaurar valores originales
      setTitle(originalTitle);
      setArtist(originalArtist);
      setAlbum(originalAlbum);
      setYear(originalYear);
      setGenre(originalGenre);
      setBpm(originalBpm);
      setKey(originalKey);
      setComment(originalComment);
      onClose?.();
    }
  };

  // Confirmar y guardar cambios antes de cerrar
  const handleConfirmSave = () => {
    setShowConfirmDialog(false);
    updateMutation.mutate(undefined, {
      onSuccess: () => {
        onClose?.();
      },
    });
  };

  // Descartar cambios y cerrar
  const handleDiscardChanges = () => {
    setShowConfirmDialog(false);
    setTitle(originalTitle);
    setArtist(originalArtist);
    setAlbum(originalAlbum);
    setYear(originalYear);
    setGenre(originalGenre);
    setBpm(originalBpm);
    setKey(originalKey);
    setRating(originalRating);
    setComment(originalComment);
    onClose?.();
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
        <p className="text-red-600 dark:text-red-400">Error al cargar el track</p>
      </div>
    );
  }

  // Estilos comunes para inputs (matching mockup)
  const inputClass =
    "form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-full text-white focus:outline-none focus:ring-2 focus:ring-primary/80 border border-[#55483a] bg-[#2a2a2a] h-14 placeholder:text-[#bbac9b] px-5 text-base font-normal leading-normal";
  const labelClass = "text-white text-base font-medium leading-normal pb-2";

  return (
    <div className="w-full rounded-lg bg-[#231a0f] text-white">
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#3a3127] px-6 py-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="size-6 text-primary flex-shrink-0">
            <span className="material-icons text-3xl">music_note</span>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] truncate">
            {filename}
          </h2>
        </div>

        {/* Botones de navegación (si hay tracks) */}
        {tracks.length > 1 && onNavigate && (
          <div className="flex items-center gap-2 mx-4 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="p-2 rounded-full hover:bg-[#3a3127] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Track anterior"
            >
              <span className="material-icons text-white">chevron_left</span>
            </button>
            <span className="text-sm text-[#bbac9b]">
              {currentIndex + 1} / {tracks.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext}
              className="p-2 rounded-full hover:bg-[#3a3127] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Track siguiente"
            >
              <span className="material-icons text-white">chevron_right</span>
            </button>
          </div>
        )}

        {/* Botones de acción */}
        <div className="hidden md:flex gap-2 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-primary text-[#181511] text-sm font-bold leading-normal tracking-[0.015em] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <span className="truncate">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </span>
          </button>
          <button
            onClick={handleCancel}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-[#3a3127] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#4a4137] transition-colors"
          >
            <span className="truncate">Cancel</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="px-6 py-4">
        {/* Success message */}
        {showSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/20 text-green-400 text-sm">
            ✓ Guardado correctamente
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
          {/* Columna izquierda: Artwork + Botones */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Artwork */}
            <div
              className="relative group aspect-square w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-[#2a2a2a] rounded-lg"
              style={artwork ? { backgroundImage: `url("${artwork}")` } : {}}
            >
              {!artwork && !isArtworkLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-icons text-6xl text-[#55483a]">album</span>
                    <p className="text-sm text-[#bbac9b] mt-2">Sin artwork</p>
                  </div>
                </div>
              )}
              {isArtworkLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                </div>
              )}
              {/* Hover overlay para cambiar artwork */}
              <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex flex-col items-center text-white">
                  <span className="material-icons text-4xl">upload_file</span>
                  <span className="text-sm font-semibold">Change Art</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col gap-2">
              {/* Fix Tags button */}
              {onFixTags && (
                <button
                  type="button"
                  onClick={() => onFixTags([trackId])}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-purple-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-purple-700 transition-colors"
                >
                  <span className="material-icons text-lg">search</span>
                  <span className="truncate">Fix Tags (Beatport)</span>
                </button>
              )}

              {/* Filename to Tags button */}
              <button
                type="button"
                onClick={handleExtractFromFilename}
                className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-[#3a3127] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#4a4137] transition-colors"
              >
                <span className="material-icons text-lg">drive_file_rename_outline</span>
                <span className="truncate">Filename → Tags</span>
              </button>

              {/* Search buttons row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Search in Google */}
                <button
                  type="button"
                  onClick={() => {
                    const query = encodeURIComponent(`${artist} ${title}`.trim());
                    window.open(`https://www.google.com/search?q=${query}`, "_blank");
                  }}
                  disabled={!artist && !title}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-blue-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Buscar en Google"
                >
                  <span className="material-icons text-lg">travel_explore</span>
                  <span className="truncate">Google</span>
                </button>

                {/* Search in Beatport */}
                <button
                  type="button"
                  onClick={() => {
                    const query = encodeURIComponent(`${artist} ${title}`.trim());
                    window.open(`https://www.beatport.com/search?q=${query}`, "_blank");
                  }}
                  disabled={!artist && !title}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-green-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Buscar en Beatport"
                >
                  <span className="material-icons text-lg">library_music</span>
                  <span className="truncate">Beatport</span>
                </button>
              </div>
            </div>

            {/* Rating */}
            <div className="flex flex-col gap-2">
              <p className={labelClass}>Rating</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(star === rating ? 0 : star)}
                    className="text-2xl transition-colors hover:scale-110"
                  >
                    <span
                      className={`material-icons ${
                        star <= rating ? "text-yellow-400" : "text-[#55483a]"
                      }`}
                    >
                      {star <= rating ? "star" : "star_border"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Columna derecha: Todos los campos */}
          <div className="flex flex-col gap-4 lg:col-span-3">
            {/* Title y Artist */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col w-full">
                <p className={labelClass}>Title</p>
                <div className="relative flex items-center">
                  <input
                    className={inputClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                  />
                  {title && (
                    <button
                      type="button"
                      onClick={() => setTitle("")}
                      className="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
                      title="Borrar título"
                    >
                      <span className="material-icons text-lg">close</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col w-full">
                <p className={labelClass}>Artist</p>
                <div className="relative flex items-center">
                  <input
                    className={inputClass}
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Artist"
                  />
                  {artist && (
                    <button
                      type="button"
                      onClick={() => setArtist("")}
                      className="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
                      title="Borrar artista"
                    >
                      <span className="material-icons text-lg">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Album */}
            <div className="flex flex-col w-full">
              <p className={labelClass}>Album</p>
              <div className="relative flex items-center">
                <input
                  className={inputClass}
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  placeholder="Album"
                />
                {album && (
                  <button
                    type="button"
                    onClick={() => setAlbum("")}
                    className="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
                    title="Borrar álbum"
                  >
                    <span className="material-icons text-lg">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Year y Genre */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col w-full">
                <p className={labelClass}>Year</p>
                <div className="relative flex items-center">
                  <input
                    className={inputClass}
                    type="number"
                    value={year || ""}
                    onChange={(e) => setYear(parseInt(e.target.value) || 0)}
                    placeholder="Year"
                  />
                  {year > 0 && (
                    <button
                      type="button"
                      onClick={() => setYear(0)}
                      className="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
                      title="Borrar año"
                    >
                      <span className="material-icons text-lg">close</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col w-full">
                <p className={labelClass}>Genre</p>
                <div className="relative flex items-center">
                  <input
                    className={inputClass}
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Genre"
                  />
                  {genre && (
                    <button
                      type="button"
                      onClick={() => setGenre("")}
                      className="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
                      title="Borrar género"
                    >
                      <span className="material-icons text-lg">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BPM y Key */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col w-full">
                <p className={labelClass}>BPM</p>
                <div className="relative flex items-center">
                  <input
                    className={inputClass}
                    type="number"
                    value={bpm || ""}
                    onChange={(e) => setBpm(parseFloat(e.target.value) || 0)}
                    placeholder="BPM"
                  />
                  {bpm > 0 && (
                    <button
                      type="button"
                      onClick={() => setBpm(0)}
                      className="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
                      title="Borrar BPM"
                    >
                      <span className="material-icons text-lg">close</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col w-full">
                <p className={labelClass}>Key</p>
                <div className="relative flex items-center">
                  <input
                    className={inputClass}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="Am, C#m..."
                  />
                  {key && (
                    <button
                      type="button"
                      onClick={() => setKey("")}
                      className="absolute right-3 text-[#bbac9b] hover:text-white transition-colors"
                      title="Borrar key"
                    >
                      <span className="material-icons text-lg">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="flex flex-col w-full">
              <p className={labelClass}>Comments</p>
              <div className="relative">
                <textarea
                  className="form-textarea flex w-full min-w-0 flex-1 resize-y overflow-hidden rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/80 border border-[#55483a] bg-[#2a2a2a] min-h-24 placeholder:text-[#bbac9b] p-4 pr-10 text-base font-normal leading-normal"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add comments..."
                />
                {comment && (
                  <button
                    type="button"
                    onClick={() => setComment("")}
                    className="absolute right-3 top-3 text-[#bbac9b] hover:text-white transition-colors"
                    title="Borrar comentarios"
                  >
                    <span className="material-icons text-lg">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer móvil */}
      <footer className="flex md:hidden gap-2 px-6 pb-4">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-4 bg-primary text-[#181511] text-sm font-bold leading-normal tracking-[0.015em] disabled:opacity-50"
        >
          <span className="truncate">
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </span>
        </button>
        <button
          onClick={handleCancel}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-4 bg-[#3a3127] text-white text-sm font-bold leading-normal tracking-[0.015em]"
        >
          <span className="truncate">Cancel</span>
        </button>
      </footer>

      {/* Diálogo de confirmación para cambios sin guardar */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#231a0f] border border-[#3a3127] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-icons text-yellow-500 text-2xl">warning</span>
              <h3 className="text-white text-lg font-bold">Cambios sin guardar</h3>
            </div>
            <p className="text-[#bbac9b] mb-6">
              Tienes cambios sin guardar. ¿Qué deseas hacer?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmSave}
                disabled={updateMutation.isPending}
                className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-primary text-[#181511] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <span className="material-icons text-lg">save</span>
                <span>{updateMutation.isPending ? "Guardando..." : "Guardar cambios"}</span>
              </button>
              <button
                onClick={handleDiscardChanges}
                className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-red-600 text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors"
              >
                <span className="material-icons text-lg">delete</span>
                <span>Descartar cambios</span>
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full h-10 px-4 bg-[#3a3127] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#4a4137] transition-colors"
              >
                <span>Seguir editando</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

TrackDetail.displayName = "TrackDetail";
