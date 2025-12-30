/**
 * Tests para componente PlaylistCard
 * Tarjeta individual de playlist
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaylistCard } from "./PlaylistCard";
import type { Playlist } from "../../types/playlist";

describe("PlaylistCard", () => {
  const mockPlaylist: Playlist = {
    id: "playlist-1",
    name: "Mi Playlist",
    description: "Descripción de prueba",
    date_created: "2024-01-01T00:00:00Z",
    date_modified: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    playlist: mockPlaylist,
    trackCount: 10,
    onOpen: vi.fn(),
    onDelete: vi.fn(),
  };

  it("debería renderizar nombre de playlist", () => {
    render(<PlaylistCard {...defaultProps} />);

    expect(screen.getByText("Mi Playlist")).toBeInTheDocument();
  });

  it("debería renderizar descripción si existe", () => {
    render(<PlaylistCard {...defaultProps} />);

    expect(screen.getByText("Descripción de prueba")).toBeInTheDocument();
  });

  it("no debería renderizar descripción si no existe", () => {
    const playlistSinDescripcion = { ...mockPlaylist, description: null };
    render(<PlaylistCard {...defaultProps} playlist={playlistSinDescripcion} />);

    expect(screen.queryByText("Descripción de prueba")).not.toBeInTheDocument();
  });

  it("debería llamar onOpen al hacer click en Abrir", () => {
    const onOpen = vi.fn();
    render(<PlaylistCard {...defaultProps} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("button", { name: /abrir/i }));

    expect(onOpen).toHaveBeenCalledWith(mockPlaylist);
  });

  it("debería llamar onDelete al hacer click en Eliminar", () => {
    const onDelete = vi.fn();
    render(<PlaylistCard {...defaultProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));

    expect(onDelete).toHaveBeenCalledWith(mockPlaylist.id);
  });

  it("debería mostrar contador de tracks si está disponible", () => {
    render(<PlaylistCard {...defaultProps} />);

    expect(screen.getByText(/10 pistas/i)).toBeInTheDocument();
  });
});
