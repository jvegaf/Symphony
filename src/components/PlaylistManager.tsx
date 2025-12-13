import React, { useState } from "react";
import { useGetPlaylists, useCreatePlaylist, useDeletePlaylist } from "../hooks/usePlaylists";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { cn } from "../utils/cn";

/**
 * PlaylistManager - Componente para gestionar playlists
 * Permite crear, eliminar y visualizar playlists
 */
const PlaylistManager: React.FC = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");

  const { data: playlists, isLoading, isError } = useGetPlaylists();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();

  const handleCreate = () => {
    if (!newPlaylistName.trim()) return;

    createPlaylist.mutate(
      {
        name: newPlaylistName,
        description: newPlaylistDescription || undefined,
      },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          setNewPlaylistName("");
          setNewPlaylistDescription("");
        },
      }
    );
  };

  const handleDelete = () => {
    if (selectedPlaylistId === null) return;

    deletePlaylist.mutate(selectedPlaylistId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        setSelectedPlaylistId(null);
      },
    });
  };

  const openDeleteDialog = (id: number) => {
    setSelectedPlaylistId(id);
    setShowDeleteDialog(true);
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
          <Card key={playlist.id} className="p-4">
            <h3 className="text-lg font-semibold mb-2">{playlist.name}</h3>
            {playlist.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {playlist.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm">
                Abrir
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openDeleteDialog(playlist.id)}
              >
                Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Diálogo de Creación */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Crear Playlist</h3>
            <div className="space-y-4">
              <Input
                placeholder="Nombre de la playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
              />
              <Input
                placeholder="Descripción (opcional)"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewPlaylistName("");
                    setNewPlaylistDescription("");
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!newPlaylistName.trim()}>
                  Crear
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Diálogo de Eliminación */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Confirmar Eliminación</h3>
            <p className="mb-6">¿Estás seguro de eliminar esta playlist?</p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSelectedPlaylistId(null);
                }}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Confirmar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PlaylistManager;
