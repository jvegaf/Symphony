import type { Track } from "../../types/library";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { WaveformCanvas } from "../WaveformCanvas";
import { Toast } from "../Toast";

interface PlayerSectionProps {
  track: Track | null;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const PlayerSection = ({ track }: PlayerSectionProps) => {
  const { play, pause, resume, stop, seek, isPlaying, position, duration, error, state } = useAudioPlayer();

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

  // AIDEV-NOTE: Siempre renderizar el mismo layout (altura fija)
  // Si track es null, mostrar placeholders vacíos pero mantener estructura
  return (
    <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
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
        <div className="w-16 h-16 rounded mr-4 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
          <span className="material-icons text-3xl text-gray-400">
            {track ? "album" : "library_music"}
          </span>
        </div>

        {/* Track Details - ALTURA FIJA */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {track ? track.title : "Sin pista seleccionada"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 truncate">
            {track ? track.artist : "—"}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <button 
            type="button"
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
            onClick={() => stop()}
            disabled={!track}
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons">stop</span>
          </button>
          <button 
            type="button"
            disabled={!track}
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-icons">info_outline</span>
          </button>
        </div>
      </div>

      {/* Tags - ALTURA FIJA: siempre ocupa mismo espacio */}
      <div className="mt-3 flex space-x-2 text-xs" style={{ minHeight: '28px' }}>
        {track?.bpm && (
          <div className="bg-gray-200 dark:bg-gray-800 rounded px-2 py-1">
            {track.bpm}BPM
          </div>
        )}
        {track?.key && (
          <div className="bg-primary/20 text-primary border border-primary/50 rounded px-2 py-1">
            {track.key}
          </div>
        )}
        {track?.year && (
          <div className="bg-gray-200 dark:bg-gray-800 rounded px-2 py-1">
            {track.year}
          </div>
        )}
        {track?.genre && (
          <div className="bg-gray-200 dark:bg-gray-800 rounded px-2 py-1">
            {track.genre}
          </div>
        )}
      </div>

      {/* Waveform Viewer - Canvas SIEMPRE visible (64px fijo) */}
      {/* AIDEV-NOTE: Canvas con altura fija para evitar saltos de layout.
          Solo genera si track existe Y está reproduciendo/pausado. */}
      <div className="mt-3">
        <WaveformCanvas
          trackId={track?.id}
          trackPath={track?.path}
          duration={track?.duration}
          currentTime={position}
          height={64}
          onSeek={seek}
          shouldGenerate={!!track && (state === "playing" || state === "paused")}
        />
      </div>

      {/* Time - ALTURA FIJA */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span className="font-mono font-bold text-blue-600">{formatDuration(position)}</span>
        <span className="font-mono">{formatDuration(duration > 0 ? duration : (track?.duration ?? 0))}</span>
      </div>

      {/* Cue Points - ALTURA FIJA */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex space-x-2">
          <button 
            type="button"
            disabled={!track}
            className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cues
            <span className="material-icons text-base ml-1">arrow_drop_down</span>
          </button>
          {[1, 2, 3, 4].map((i) => (
            <button
              key={i}
              type="button"
              disabled={!track}
              className="bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 w-20 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-icons text-base">add</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
