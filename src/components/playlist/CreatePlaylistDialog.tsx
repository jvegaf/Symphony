/**
 * CreatePlaylistDialog - Modal para crear nuevas playlists
 */
import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useCreatePlaylist } from "../../hooks/playlists";

export interface CreatePlaylistDialogProps {
  /** Si el diálogo está visible */
  isOpen: boolean;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al crear exitosamente */
  onSuccess?: () => void;
}

/**
 * Modal para crear una nueva playlist
 */
export const CreatePlaylistDialog: React.FC<CreatePlaylistDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createPlaylist = useCreatePlaylist();

  // Limpiar campos cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
    }
  }, [isOpen]);

  const handleCreate = () => {
    if (!name.trim()) return;

    createPlaylist.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
      },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.();
        },
      }
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-xl font-bold mb-4">Crear Playlist</h3>
        <div className="space-y-4">
          <Input
            placeholder="Nombre de la playlist"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createPlaylist.isPending}
            >
              Crear
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

CreatePlaylistDialog.displayName = "CreatePlaylistDialog";
