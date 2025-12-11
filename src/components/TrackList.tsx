import React, { useState, useMemo } from "react";
import { FixedSizeList } from "react-window";
import { Track } from "@/types/library";
import { useSearchTracks } from "@/hooks/useLibrary";

export interface TrackListProps {
  tracks: Track[];
  onTrackClick?: (track: Track) => void;
  onTrackDoubleClick?: (track: Track) => void;
  height?: number;
  loading?: boolean;
}

type SortColumn = "title" | "artist" | "album" | "duration" | "bpm";
type SortOrder = "asc" | "desc";

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

export const TrackList: React.FC<TrackListProps> = ({
  tracks: initialTracks,
  onTrackClick,
  onTrackDoubleClick,
  height = 600,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("title");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const { data: searchResults, isLoading: isSearching } = useSearchTracks(
    searchQuery,
    searchQuery.length >= 2
  );

  const displayTracks = useMemo(() => {
    const tracks = searchQuery.length >= 2 ? searchResults || [] : initialTracks;

    return [...tracks].sort((a, b) => {
      let aValue: string | number | null;
      let bValue: string | number | null;

      switch (sortColumn) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "artist":
          aValue = a.artist?.toLowerCase() || "";
          bValue = b.artist?.toLowerCase() || "";
          break;
        case "album":
          aValue = a.album?.toLowerCase() || "";
          bValue = b.album?.toLowerCase() || "";
          break;
        case "duration":
          aValue = a.duration;
          bValue = b.duration;
          break;
        case "bpm":
          aValue = a.bpm || 0;
          bValue = b.bpm || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [initialTracks, searchResults, searchQuery, sortColumn, sortOrder]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const handleRowClick = (track: Track) => {
    setSelectedTrackId(track.id);
    onTrackClick?.(track);
  };

  const handleRowDoubleClick = (track: Track) => {
    onTrackDoubleClick?.(track);
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const track = displayTracks[index];
    const isSelected = track.id === selectedTrackId;

    return (
      <div
        style={style}
        className={`
          flex items-center px-4 cursor-pointer border-b border-gray-800
          ${isSelected ? "bg-blue-600 dark:bg-blue-700" : "hover:bg-gray-800 dark:hover:bg-gray-700"}
        `}
        onClick={() => handleRowClick(track)}
        onDoubleClick={() => handleRowDoubleClick(track)}
        role="row"
        aria-selected={isSelected}
      >
        <div className="flex-1 truncate" title={track.title}>
          {track.title}
        </div>
        <div className="w-48 truncate text-gray-400" title={track.artist || ""}>
          {track.artist || "-"}
        </div>
        <div className="w-48 truncate text-gray-400" title={track.album || ""}>
          {track.album || "-"}
        </div>
        <div className="w-20 text-right text-gray-400">
          {formatDuration(track.duration)}
        </div>
        <div className="w-16 text-right text-gray-400">
          {track.bpm?.toFixed(0) || "-"}
        </div>
      </div>
    );
  };

  const SortButton: React.FC<{
    column: SortColumn;
    label: string;
    width?: string;
  }> = ({ column, label, width }) => {
    const isActive = sortColumn === column;
    return (
      <button
        className={`
          px-4 py-2 text-left font-medium
          ${width || "flex-1"}
          ${isActive ? "text-white" : "text-gray-400"}
          hover:text-white
        `}
        onClick={() => handleSort(column)}
        aria-sort={isActive ? sortOrder : "none"}
      >
        {label}
        {isActive && (
          <span className="ml-1">
            {sortOrder === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    );
  };

  if (loading || isSearching) {
    return (
      <div
        className="flex items-center justify-center bg-gray-900 dark:bg-slate-950"
        style={{ height }}
      >
        <div className="text-gray-400">Cargando pistas...</div>
      </div>
    );
  }

  if (displayTracks.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-8 bg-gray-900 dark:bg-slate-950">
        <input
          type="text"
          placeholder="Buscar pistas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div
          className="flex items-center justify-center text-gray-400"
          style={{ height: height - 80 }}
        >
          {searchQuery.length >= 2
            ? "No se encontraron pistas"
            : "No hay pistas disponibles"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-900 dark:bg-slate-950">
      <div className="p-4">
        <input
          type="text"
          placeholder="Buscar pistas (mínimo 2 caracteres)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Buscar pistas"
        />
      </div>

      <div className="flex items-center border-b-2 border-gray-700 bg-gray-800 dark:bg-slate-900">
        <SortButton column="title" label="Título" />
        <SortButton column="artist" label="Artista" width="w-48" />
        <SortButton column="album" label="Álbum" width="w-48" />
        <SortButton column="duration" label="Duración" width="w-20" />
        <SortButton column="bpm" label="BPM" width="w-16" />
      </div>

      <FixedSizeList
        height={height - 120}
        itemCount={displayTracks.length}
        itemSize={50}
        width="100%"
        role="table"
        aria-label="Lista de pistas"
      >
        {Row}
      </FixedSizeList>

      <div className="p-2 text-sm text-gray-400 text-right border-t border-gray-800">
        {displayTracks.length} pistas
      </div>
    </div>
  );
};

TrackList.displayName = "TrackList";
