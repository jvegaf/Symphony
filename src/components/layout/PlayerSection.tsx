/**
 * Sección del reproductor con waveform y análisis
 *
 * AIDEV-NOTE: Integra los componentes de análisis (Milestone 4):
 * - BeatgridOverlay: muestra grid de beats sobre el waveform
 * - CuePointEditor: muestra y permite editar cue points
 * - LoopEditor: muestra y permite editar loops (futuro)
 * - Botones de cue points funcionales
 * - Control de volumen: slider inline en la sección de controles (play/pause/stop)
 * - Tags (BPM, Key, Year, Genre): movidos a la derecha de los cue points en la misma fila
 * - Auto-play: cuando termina un track, reproduce automáticamente el siguiente de la lista
 *   - Usa el evento audio:end_of_track del backend
 *   - Requiere props opcionales: tracks[] y onTrackChange callback
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { Track } from "../../types/library";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { useArtwork } from "../../hooks/useArtwork";
import {
  useGetBeatgrid,
  useAnalyzeBeatgrid,
  useGetCuePoints,
  useCreateCuePoint,
  useDeleteCuePoint,
} from "../../hooks/useAnalysis";
import { WaveformCanvas } from "../WaveformCanvas";
import { BeatgridOverlay, CuePointEditor } from "../analysis";
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

  // Estado para cue point seleccionado (para futura implementación de edición)
  const [selectedCuePointId, _setSelectedCuePointId] = useState<
    string | undefined
  >();

  // AIDEV-NOTE: Si no hay track, no hacer queries a la DB
  const trackId = track?.id ?? "";

  // Analysis hooks - solo cargar si hay track
  const { data: beatgrid } = useGetBeatgrid(trackId);
  const { data: cuePoints = [] } = useGetCuePoints(trackId);
  const analyzeBeatgrid = useAnalyzeBeatgrid();
  const createCuePoint = useCreateCuePoint();
  const deleteCuePoint = useDeleteCuePoint();

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

  // Crear cue point en posición actual
  const handleCreateCuePoint = useCallback(
    async (hotkey?: number) => {
      if (!trackId || position === undefined) return;

      try {
        await createCuePoint.mutateAsync({
          trackId: trackId,
          position: position,
          label: hotkey ? `Cue ${hotkey}` : `Cue @ ${formatDuration(position)}`,
          type: "cue",
          hotkey: hotkey,
        });
      } catch (err) {
        console.error("Error creando cue point:", err);
      }
    },
    [trackId, position, createCuePoint],
  );

  // Click en cue point para hacer seek
  const handleCuePointClick = useCallback(
    (cuePoint: { position: number }) => {
      seek(cuePoint.position);
    },
    [seek],
  );

  // Analizar beatgrid
  const handleAnalyzeBeatgrid = useCallback(async () => {
    if (!trackId || !track) return;

    try {
      await analyzeBeatgrid.mutateAsync({
        trackId: trackId,
        trackPath: track.path,
      });
    } catch (err) {
      console.error("Error analizando beatgrid:", err);
    }
  }, [trackId, track, analyzeBeatgrid]);

  // Obtener cue points por hotkey (1-4 para la UI)
  const getCuePointByHotkey = (hotkey: number) => {
    return cuePoints.find((cp) => cp.hotkey === hotkey);
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

        {/* Cue Point Editor - solo si hay cue points */}
        {cuePoints.length > 0 && waveformDimensions.width > 0 && (
          <CuePointEditor
            cuePoints={cuePoints}
            duration={track?.duration ?? 0}
            width={waveformDimensions.width}
            height={waveformDimensions.height}
            selectedCuePointId={selectedCuePointId}
            onCuePointClick={handleCuePointClick}
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

      {/* Cue Points - FUNCIONALES */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex space-x-2">
          {/* Dropdown Cues */}
          <button
            type="button"
            disabled={!track}
            className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cues ({cuePoints.length})
            <span className="material-icons text-base ml-1">
              arrow_drop_down
            </span>
          </button>

          {/* Cue Point Buttons 1-4 */}
          {[1, 2, 3, 4].map((hotkey) => {
            const cuePoint = getCuePointByHotkey(hotkey);
            const hasCue = !!cuePoint;

            return (
              <button
                key={hotkey}
                type="button"
                disabled={!track}
                onClick={() => {
                  if (hasCue && cuePoint) {
                    // Si existe, hacer seek
                    handleCuePointClick(cuePoint);
                  } else {
                    // Si no existe, crear en posición actual
                    handleCreateCuePoint(hotkey);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (hasCue && cuePoint && trackId) {
                    // Click derecho para eliminar
                    deleteCuePoint.mutate({
                      id: cuePoint.id,
                      trackId: trackId,
                    });
                  }
                }}
                title={
                  hasCue && cuePoint
                    ? `Cue ${hotkey}: ${formatDuration(cuePoint.position)} (click derecho para eliminar)`
                    : `Click para crear Cue ${hotkey} en ${formatDuration(position)}`
                }
                className={`w-20 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  hasCue
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {hasCue ? (
                  <span className="font-bold">{hotkey}</span>
                ) : (
                  <span className="material-icons text-base">add</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tags - AIDEV-NOTE: Movidos a la derecha de los cue points */}
        <div className="flex space-x-2 text-xs">
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
      </div>
    </div>
  );
};
