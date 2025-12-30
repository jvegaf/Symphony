import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useGetPlaylist,
  useGetPlaylistTracks,
  useReorderPlaylistTracks,
  useAddTrackToPlaylist,
  useRemoveTrackFromPlaylist,
} from "../hooks/playlists";
import { Track } from "../types/library";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface PlaylistDetailProps {
  playlistId: string;
}

interface SortableTrackItemProps {
  track: Track;
  onRemove: () => void;
}

/**
 * Componente para item de track sortable con drag & drop
 */
const SortableTrackItem: React.FC<SortableTrackItemProps> = ({
  track,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id || "" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {track.title}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {track.artist}
        </div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        {formatDuration(track.duration)}
      </div>

      <Button
        onClick={onRemove}
        variant="secondary"
        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        Quitar
      </Button>
    </div>
  );
};

/**
 * Componente para mostrar y editar detalles de una playlist
 * Incluye drag & drop para reordenar tracks
 */
export const PlaylistDetail: React.FC<PlaylistDetailProps> = ({
  playlistId,
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [trackIdToAdd, setTrackIdToAdd] = useState<string>("");
  const [localTracks, setLocalTracks] = useState<Track[]>([]);

  const { data: playlist, isLoading: isLoadingPlaylist, isError: isErrorPlaylist } = useGetPlaylist(playlistId);
  const { data: tracks, isLoading: isLoadingTracks, isError: isErrorTracks } = useGetPlaylistTracks(playlistId);
  const reorderMutation = useReorderPlaylistTracks();
  const addTrackMutation = useAddTrackToPlaylist();
  const removeTrackMutation = useRemoveTrackFromPlaylist();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sincronizar localTracks con tracks del servidor
  React.useEffect(() => {
    if (tracks && Array.isArray(tracks)) {
      setLocalTracks(tracks);
    }
  }, [tracks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localTracks.findIndex((t) => t.id === active.id);
    const newIndex = localTracks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedTracks = arrayMove(localTracks, oldIndex, newIndex);
    setLocalTracks(reorderedTracks);

    // Auto-guardar reordenamiento
    reorderMutation.mutate({
      playlist_id: playlistId,
      track_ids: reorderedTracks.map((t) => t.id).filter((id): id is string => id !== undefined),
    });
  };

  const handleAddTrack = () => {
    if (!trackIdToAdd.trim()) {
      return;
    }

    addTrackMutation.mutate(
      {
        playlist_id: playlistId,
        track_id: trackIdToAdd,
      },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setTrackIdToAdd("");
        },
      }
    );
  };

  const handleRemoveTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    setShowRemoveDialog(true);
  };

  const confirmRemoveTrack = () => {
    if (selectedTrackId === null) {
      return;
    }

    removeTrackMutation.mutate(
      {
        playlist_id: playlistId,
        track_id: selectedTrackId,
      },
      {
        onSuccess: () => {
          setShowRemoveDialog(false);
          setSelectedTrackId(null);
        },
      }
    );
  };

  if (isLoadingPlaylist || isLoadingTracks) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">
          Cargando playlist...
        </div>
      </div>
    );
  }

  if (isErrorPlaylist || isErrorTracks) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400">
          Error al cargar la playlist
        </div>
      </div>
    );
  }

  if (!playlist) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header de Playlist */}
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {playlist.name}
        </h1>
        {playlist.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {playlist.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {localTracks.length} {localTracks.length === 1 ? "track" : "tracks"}
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            Agregar Track
          </Button>
        </div>
      </Card>

      {/* Lista de Tracks con Drag & Drop */}
      {localTracks.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No hay tracks en esta playlist
          </p>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={Array.isArray(localTracks) ? localTracks.map((t) => t.id || "").filter((id): id is string => id.length > 0) : []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {localTracks.map((track) => track.id && (
                <SortableTrackItem
                  key={track.id}
                  track={track}
                  onRemove={() => handleRemoveTrack(track.id!)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Diálogo para Agregar Track */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Seleccionar Track
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ID del Track
                </label>
                <input
                  type="number"
                  value={trackIdToAdd}
                  onChange={(e) => setTrackIdToAdd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                  placeholder="Ingrese ID del track"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddDialog(false);
                    setTrackIdToAdd("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddTrack}
                  disabled={addTrackMutation.isPending}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Diálogo de Confirmación de Eliminación */}
      {showRemoveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Confirmar Eliminación
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro de que deseas quitar este track de la playlist?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRemoveDialog(false);
                  setSelectedTrackId(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmRemoveTrack}
                disabled={removeTrackMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirmar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

PlaylistDetail.displayName = "PlaylistDetail";
