import React, { useState, useMemo } from "react";
import type { Track } from "../types/library";
import { useSearchTracks } from "../hooks/useLibrary";

export interface TrackListProps {
  tracks: Track[];
  onTrackClick?: (track: Track) => void;
  onTrackDoubleClick?: (track: Track) => void;
  height?: number;
  loading?: boolean;
}

type SortColumn = "title" | "artist" | "album" | "duration" | "bpm" | "rating";
type SortOrder = "asc" | "desc";

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const renderRating = (rating: number | null | undefined): string => {
  if (!rating || rating === 0) return "-";
  return "⭐".repeat(Math.min(Math.max(rating, 0), 5));
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { data: searchResults, isLoading: isSearching } = useSearchTracks(
    searchQuery,
    searchQuery.length >= 2
  );

  const displayTracks = useMemo(() => {
    const tracksToDisplay =
      searchQuery.length >= 2 ? searchResults || [] : initialTracks;

    return tracksToDisplay.slice().sort((a, b) => {
      let aValue: string | number | null | undefined = a[sortColumn];
      let bValue: string | number | null | undefined = b[sortColumn];

      // Handle null/undefined values
      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";

      // For strings, use localeCompare
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === "asc" ? comparison : -comparison;
      }

      // For numbers, use subtraction
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

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

  const handleRowClick = (index: number) => {
    setSelectedIndex(index);
    const track = displayTracks[index];
    if (track) {
      onTrackClick?.(track);
    }
  };

  const handleRowDoubleClick = (index: number) => {
    const track = displayTracks[index];
    if (track) {
      onTrackDoubleClick?.(track);
    }
  };

  const TrackRow: React.FC<{ track: Track; index: number }> = ({ track, index }) => {
    const isSelected = selectedIndex === index;

    return (
      <div
        className={`
          flex items-center px-4 py-3 cursor-pointer
          ${
            isSelected
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:bg-gray-800"
          }
          border-b border-gray-700
        `}
        onClick={() => handleRowClick(index)}
        onDoubleClick={() => handleRowDoubleClick(index)}
        role="row"
      >
        <div className="flex-1 truncate font-medium">{track.title}</div>
        <div className="w-48 truncate text-gray-400">{track.artist}</div>
        <div className="w-48 truncate text-gray-400">
          {track.album || "-"}
        </div>
        <div className="w-20 text-right text-gray-400">
          {formatDuration(track.duration)}
        </div>
        <div className="w-16 text-right text-gray-400">
          {track.bpm?.toFixed(0) || "-"}
        </div>
        <div className="w-24 text-center text-yellow-500">
          {renderRating(track.rating)}
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
          hover:text-white transition-colors
        `}
        onClick={() => handleSort(column)}
        aria-sort={isActive ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
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
    <div className="flex flex-col bg-gray-900 dark:bg-slate-950 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-800">
        <input
          type="text"
          placeholder="Buscar pistas (mínimo 2 caracteres)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Buscar pistas"
        />
      </div>

      <div className="flex items-center border-b-2 border-gray-700 bg-gray-800 dark:bg-slate-900">
        <SortButton column="title" label="Título" />
        <SortButton column="artist" label="Artista" width="w-48" />
        <SortButton column="album" label="Álbum" width="w-48" />
        <SortButton column="duration" label="Duración" width="w-20" />
        <SortButton column="bpm" label="BPM" width="w-16" />
        <SortButton column="rating" label="Rating" width="w-24" />
      </div>

      <div 
        className="overflow-y-auto" 
        style={{ height: height - 120 }}
        role="table"
        aria-label="Lista de pistas"
      >
        {displayTracks.map((track, index) => (
          <TrackRow key={track.id} track={track} index={index} />
        ))}
      </div>

      <div className="p-3 bg-gray-800 border-t border-gray-700">
        <span className="text-sm text-gray-400">
          {displayTracks.length} pista{displayTracks.length !== 1 ? "s" : ""}
          {searchQuery.length >= 2 && ` (filtradas)`}
        </span>
      </div>
    </div>
  );
};
