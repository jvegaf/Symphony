/**
 * Sección del reproductor con waveform y análisis
 *
 * AIDEV-NOTE: Integra los componentes de análisis (Milestone 4):
 * - BeatgridOverlay: muestra grid de beats sobre el waveform
 * - Control de volumen: slider inline en la sección de controles (play/pause/stop)
 * - Tags (BPM, Key, Year, Genre): ubicadas debajo de los controles de reproducción
 * - Auto-play: cuando termina un track, reproduce automáticamente el siguiente de la lista
 *   - Usa el evento audio:end_of_track del backend
 *   - Requiere props opcionales: tracks[] y onTrackChange callback
 */

import { useState, useRef, useEffect } from "react";
import type { Track } from "../../types/library";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { useArtwork } from "../../hooks/useArtwork";
import {
  useGetBeatgrid,
  useAnalyzeBeatgrid,
} from "../../hooks/useAnalysis";
import { WaveformCanvas } from "../WaveformCanvas";
import { BeatgridOverlay } from "../analysis";
import { Toast } from "../Toast";

interface PlayerSectionProps {
  track: Track | null;
  tracks?: Track[];
  onTrackChange?: (track: Track) => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const PlayerSection = ({ track, tracks = [], onTrackChange }: PlayerSectionProps) => {
  const {
    play,
    pause,
    resume,
    stop,
    seek,
    isPlaying,
    position,
    duration,
    error,
    state,
    volume,
    setVolume,
  } = useAudioPlayer();

  // AIDEV-NOTE: Hook para obtener artwork on-demand
  const { artwork } = useArtwork(track?.id);

  // Ref para obtener dimensiones del waveform
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const [waveformDimensions, setWaveformDimensions] = useState({
    width: 0,
    height: 96,
  });

  // AIDEV-NOTE: Si no hay track, no hacer queries a la DB
  const trackId = track?.id ?? "";

  // Analysis hooks - solo cargar si hay track
  const { data: beatgrid } = useGetBeatgrid(trackId);
  const analyzeBeatgrid = useAnalyzeBeatgrid();

  // Actualizar dimensiones del waveform
  useEffect(() => {
    const updateDimensions = () => {
      if (waveformContainerRef.current) {
        const rect = waveformContainerRef.current.getBoundingClientRect();
        setWaveformDimensions({ width: rect.width, height: 64 });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // AIDEV-NOTE: Auto-play siguiente track cuando termina el actual
  // Escucha el evento audio:end_of_track del backend para reproducir automáticamente el siguiente
  useEffect(() => {
    if (!track || !onTrackChange || tracks.length === 0) return;

    const currentIndex = tracks.findIndex((t) => t.id === track.id);
    if (currentIndex === -1) return;

    const handleAutoPlay = async () => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < tracks.length) {
        const nextTrack = tracks[nextIndex];
        try {
          await play(nextTrack.path);
          onTrackChange(nextTrack);
        } catch (error) {
          console.error("Error al reproducir siguiente track:", error);
        }
      }
    };

    // Subscribirse al evento de fin de track
    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      return await listen("audio:end_of_track", handleAutoPlay);
    };

    let unlisten: any;
    setupListener().then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [track, tracks, onTrackChange, play]);

  const handlePlayPause = async () => {
    if (!track) return;

    try {
      if (isPlaying) {
        await pause();
      } else if (state === "paused") {
        await resume();
      } else {
        await play(track.path);
      }
    } catch (error) {
      console.error("Error al controlar reproducción:", error);
    }
  };

  // Analizar beatgrid
  const handleAnalyzeBeatgrid = async () => {
    if (!trackId || !track) return;

    try {
      await analyzeBeatgrid.mutateAsync({
        trackId: trackId,
        trackPath: track.path,
      });
    } catch (err) {
      console.error("Error analizando beatgrid:", err);
    }
  };

  // AIDEV-NOTE: Siempre renderizar el mismo layout (altura fija)
  // Si track es null, mostrar placeholders vacíos pero mantener estructura
  return (
    <div
      className="p-4 border-b border-gray-200/50 dark:border-gray-700/50"
      data-testid="player-section"
    >
      {/* Error Toast */}
      {error && (
        <Toast
          message={error}
          type="error"
          duration={5000}
          onClose={() => {
            /* Error will be cleared on next action */
          }}
        />
      )}

      {/* Track Info */}
      <div className="flex items-start">
        {/* Album Art */}
        <div
          className="w-16 h-16 rounded mr-4 bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden"
          data-testid="player-album-art"
        >
          {artwork ? (
            <img
              src={artwork}
              alt={`Artwork de ${track?.title || "track"}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-icons text-3xl text-gray-400">
              {track ? "album" : "library_music"}
            </span>
          )}
        </div>

        {/* Track Details - ALTURA FIJA */}
        <div className="flex-1">
          <h1
            className="text-2xl font-bold text-gray-900 dark:text-white truncate"
            data-testid="player-track-title"
          >
            {track ? track.title : ""}
          </h1>
          <p
            className="text-gray-500 dark:text-gray-400 truncate"
            data-testid="player-track-artist"
          >
            {track ? track.artist : " "}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <button
            type="button"
            data-testid="play-pause-button"
            onClick={handlePlayPause}
            disabled={!track}
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons">
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
          <button
            type="button"
            data-testid="stop-button"
            onClick={() => stop()}
            disabled={!track}
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons">stop</span>
          </button>
          {/* Analyze Beatgrid Button */}
          <button
            type="button"
            data-testid="analyze-beatgrid-button"
            onClick={handleAnalyzeBeatgrid}
            disabled={!track || analyzeBeatgrid.isPending}
            title="Analizar BPM"
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons">
              {analyzeBeatgrid.isPending ? "hourglass_top" : "speed"}
            </span>
          </button>
          <button
            type="button"
            data-testid="info-button"
            disabled={!track}
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons">info_outline</span>
          </button>

          {/* Volume Control - AIDEV-NOTE: Alineado a la derecha con los demás controles */}
          <div className="flex items-center space-x-2 ml-4">
            <span className="material-icons text-lg">
              {volume === 0 ? "volume_off" : volume < 0.5 ? "volume_down" : "volume_up"}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              data-testid="volume-slider"
              className="w-24 h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title={`Volumen: ${Math.round(volume * 100)}%`}
            />
          </div>
        </div>
      </div>

      {/* Tags - Debajo de los controles */}
      <div className="flex space-x-2 text-xs mt-3">
        {/* Mostrar BPM del beatgrid analizado o del metadata */}
        {(beatgrid?.bpm || track?.bpm) && (
          <div
            className={`rounded px-2 py-1 ${beatgrid?.bpm ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200" : "bg-gray-200 dark:bg-gray-800"}`}
          >
            {beatgrid?.bpm?.toFixed(1) || track?.bpm}BPM
            {beatgrid?.confidence && (
              <span className="ml-1 text-xs opacity-75">
                ({beatgrid.confidence.toFixed(0)}%)
              </span>
            )}
          </div>
        )}
        {track?.key && (
          <div className="bg-primary/20 text-primary border border-primary/50 rounded px-2 py-1">
            {track.key}
          </div>
        )}
        {track?.year && (
          <div className="bg-gray-200 dark:bg-gray-800 text-primary rounded px-2 py-1 ">
            {track.year}
          </div>
        )}
        {track?.genre && (
          <div className="bg-gray-200 dark:bg-gray-800 text-primary rounded px-2 py-1">
            {track.genre}
          </div>
        )}
      </div>

      {/* Waveform con overlays - CONTENEDOR RELATIVO */}
      {/* AIDEV-NOTE: El contenedor es relative para que los overlays se posicionen absolute */}
      <div
        ref={waveformContainerRef}
        className="mt-3 relative"
        data-testid="waveform-container"
      >
        {/* Waveform Canvas */}
        <WaveformCanvas
          trackId={track?.id}
          trackPath={track?.path}
          duration={track?.duration}
          currentTime={position}
          height={96}
          onSeek={seek}
          shouldGenerate={
            !!track && (state === "playing" || state === "paused")
          }
        />

        {/* Beatgrid Overlay - solo si hay beatgrid */}
        {beatgrid && waveformDimensions.width > 0 && (
          <BeatgridOverlay
            duration={track?.duration ?? 0}
            bpm={beatgrid.bpm}
            offset={beatgrid.offset}
            width={waveformDimensions.width}
            height={waveformDimensions.height}
            confidence={beatgrid.confidence}
            showBeatNumbers={false}
            className="pointer-events-none"
          />
        )}
      </div>

      {/* Time - ALTURA FIJA */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span
          className="font-mono font-bold text-blue-600"
          data-testid="player-current-time"
        >
          {formatDuration(position)}
        </span>
        <span className="font-mono" data-testid="player-duration">
          {formatDuration(duration > 0 ? duration : (track?.duration ?? 0))}
        </span>
      </div>
    </div>
  );
};
