/**
 * PlaylistCard - Tarjeta individual de playlist
 * Muestra información y acciones de una playlist
 */
import React from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import type { Playlist } from "../../types/playlist";

export interface PlaylistCardProps {
  /** Datos de la playlist */
  playlist: Playlist;
  /** Número de pistas en la playlist */
  trackCount?: number;
  /** Callback al abrir playlist */
  onOpen: (playlist: Playlist) => void;
  /** Callback al eliminar playlist */
  onDelete: (id: string) => void;
}

/**
 * Tarjeta que muestra información de una playlist
 */
export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  trackCount = 0,
  onOpen,
  onDelete,
}) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-2">{playlist.name}</h3>
      
      {playlist.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {playlist.description}
        </p>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
        {trackCount} pistas
      </p>
      
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => onOpen(playlist)}>
          Abrir
        </Button>
        <Button
          variant="primary"
          onClick={() => onDelete(playlist.id)}
          className="bg-red-600 hover:bg-red-700"
        >
          Eliminar
        </Button>
      </div>
    </Card>
  );
};

PlaylistCard.displayName = "PlaylistCard";
