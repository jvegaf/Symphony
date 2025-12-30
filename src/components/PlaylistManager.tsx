import React, { useState } from "react";
import { useGetPlaylists, useDeletePlaylist } from "../hooks/playlists";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { PlaylistCard, CreatePlaylistDialog } from "./playlist";
import type { Playlist } from "../types/playlist";

/**
 * PlaylistManager - Componente para gestionar playlists
 * Permite crear, eliminar y visualizar playlists
 * 
 * Refactorizado para usar componentes extraídos:
 * - ConfirmDialog: Modal genérico de confirmación
 * - CreatePlaylistDialog: Modal de creación de playlist
 * - PlaylistCard: Tarjeta individual de playlist
 */
const PlaylistManager: React.FC = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const { data: playlists, isLoading, isError } = useGetPlaylists();
  const deletePlaylist = useDeletePlaylist();

  const handleDelete = () => {
    if (selectedPlaylistId === null) return;

    deletePlaylist.mutate(selectedPlaylistId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        setSelectedPlaylistId(null);
      },
    });
  };

  const openDeleteDialog = (id: string) => {
    setSelectedPlaylistId(id);
    setShowDeleteDialog(true);
  };

  const handleOpenPlaylist = (_playlist: Playlist) => {
    // TODO: Implementar navegación a vista de playlist
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500 dark:text-gray-400">Cargando playlists...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-red-500">Error al cargar playlists</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Mis Playlists</h2>
        <Button onClick={() => setShowCreateDialog(true)}>Nueva Playlist</Button>
      </div>

      {playlists && playlists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No hay playlists. Crea una para comenzar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playlists?.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            onOpen={handleOpenPlaylist}
            onDelete={openDeleteDialog}
          />
        ))}
      </div>

      {/* Diálogo de Creación */}
      <CreatePlaylistDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {/* Diálogo de Eliminación */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Confirmar Eliminación"
        message="¿Estás seguro de eliminar esta playlist?"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedPlaylistId(null);
        }}
        confirmText="Confirmar"
        variant="destructive"
        isLoading={deletePlaylist.isPending}
      />
    </div>
  );
};

export default PlaylistManager;
