import type { Track } from "../../types/library";

interface PlayerSectionProps {
  track: Track | null;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const PlayerSection = ({ track }: PlayerSectionProps) => {
  if (!track) {
    return (
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <span className="material-icons text-4xl mb-2">library_music</span>
            <p className="text-sm">Selecciona una pista para reproducir</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
      {/* Track Info */}
      <div className="flex items-start">
        {/* Album Art */}
        <div className="w-16 h-16 rounded mr-4 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
          <span className="material-icons text-3xl text-gray-400">album</span>
        </div>

        {/* Track Details */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {track.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{track.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <button className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <span className="material-icons">play_arrow</span>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <span className="material-icons">fast_rewind</span>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <span className="material-icons">fast_forward</span>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
            <span className="material-icons">info_outline</span>
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-3 flex space-x-2 text-xs">
        {track.bpm && (
          <div className="bg-gray-200 dark:bg-gray-800 rounded px-2 py-1">
            {track.bpm}BPM
          </div>
        )}
        {track.key && (
          <div className="bg-primary/20 text-primary border border-primary/50 rounded px-2 py-1">
            {track.key}
          </div>
        )}
        {track.year && (
          <div className="bg-gray-200 dark:bg-gray-800 rounded px-2 py-1">
            {track.year}
          </div>
        )}
        {track.genre && (
          <div className="bg-gray-200 dark:bg-gray-800 rounded px-2 py-1">
            {track.genre}
          </div>
        )}
      </div>

      {/* Waveform Placeholder */}
      <div className="mt-3 flex items-center space-x-2">
        <span className="material-icons text-primary text-xl">play_circle_filled</span>
        <div className="relative flex-1 h-16 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
          {/* Waveform placeholder */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
            <span className="material-icons">graphic_eq</span>
          </div>
          {/* Progress */}
          <div
            className="absolute top-0 left-0 h-full bg-primary/30"
            style={{ width: "0%" }}
          />
        </div>
        <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 text-xs">
          <span className="material-icons text-lg">remove_circle_outline</span>
          <span className="material-icons text-lg">add_circle_outline</span>
        </div>
      </div>

      {/* Time */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0:00</span>
        <span>{formatDuration(track.duration)}</span>
      </div>

      {/* Cue Points */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex space-x-2">
          <button className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm flex items-center">
            Cues
            <span className="material-icons text-base ml-1">arrow_drop_down</span>
          </button>
          {[1, 2, 3, 4].map((i) => (
            <button
              key={i}
              className="bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 w-20 py-1 rounded text-sm"
            >
              <span className="material-icons text-base">add</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
