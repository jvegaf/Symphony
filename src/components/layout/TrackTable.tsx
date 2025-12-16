import type { Track } from "../../types/library";
import { StarRating } from "../ui/StarRating";
import { useUpdateTrackRating } from "../../hooks/useLibrary";

interface TrackTableProps {
  tracks: Track[];
  selectedTrack: Track | null;
  onTrackSelect: (track: Track) => void;
  onTrackDoubleClick: (track: Track) => void;
  isLoading: boolean;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const TrackTable = ({
  tracks,
  selectedTrack,
  onTrackSelect,
  onTrackDoubleClick,
  isLoading,
}: TrackTableProps) => {
  // AIDEV-NOTE: Hook para actualizar rating en DB y archivo MP3
  const { mutate: updateRating } = useUpdateTrackRating();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <span className="material-icons text-4xl animate-spin">refresh</span>
          <p className="mt-2">Cargando pistas...</p>
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <span className="material-icons text-6xl mb-4">library_music</span>
          <h2 className="text-xl font-semibold mb-2">No hay pistas en tu biblioteca</h2>
          <p className="text-sm">Haz clic en "Import" para agregar tu música</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
          <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
            <th className="p-2 w-8">
              <input
                type="checkbox"
                className="rounded border-gray-400 dark:border-gray-600 bg-transparent focus:ring-primary"
              />
            </th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Art</th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Added</th>
            <th className="p-2 font-medium text-gray-800 dark:text-gray-200 flex items-center">
              Title
              <span className="material-icons text-base ml-1">arrow_upward</span>
            </th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Artist</th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Album</th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Time</th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">BPM</th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Key</th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Rating</th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Genre</th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Kind</th>
            <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Year</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200/30 dark:divide-gray-700/50">
          {tracks.map((track) => {
            const isSelected = selectedTrack?.id === track.id;
            return (
              <tr
                key={track.id ?? track.path}
                onClick={() => onTrackSelect(track)}
                onDoubleClick={() => onTrackDoubleClick(track)}
                className={`
                  cursor-pointer transition-colors
                  ${
                    isSelected
                      ? "bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30"
                      : "hover:bg-gray-100/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300"
                  }
                `}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className={`rounded focus:ring-primary ${
                      isSelected
                        ? "border-primary bg-primary text-primary"
                        : "border-gray-400 dark:border-gray-600 bg-transparent"
                    }`}
                  />
                </td>
                <td className="p-2">
                  <span className="material-icons text-gray-400 dark:text-gray-600 text-2xl">
                    music_note
                  </span>
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {formatDate(track.dateAdded)}
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {track.title}
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {track.artist}
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {track.album ?? ""}
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {formatDuration(track.duration)}
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {track.bpm ? track.bpm.toFixed(2) : ""}
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {track.key && (
                    <span className="bg-primary/20 text-primary border border-primary/50 rounded px-1 text-[10px]">
                      {track.key}
                    </span>
                  )}
                </td>
                <td className="p-2">
                  <StarRating
                    value={track.rating ?? 0}
                    readOnly={false}
                    size="md"
                    onChange={(newRating) => {
                      if (track.id) {
                        updateRating({ trackId: track.id, rating: newRating });
                      }
                    }}
                  />
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {track.genre ?? ""}
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {track.path.split(".").pop()?.toUpperCase() ?? ""}
                </td>
                <td className={`p-2 ${isSelected ? "text-primary font-medium" : ""}`}>
                  {track.year ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
