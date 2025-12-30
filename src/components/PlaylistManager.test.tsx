import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import PlaylistManager from "./PlaylistManager";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

const mockPlaylists = [
  { id: "1", name: "Favorites", description: "My favorite tracks", date_created: "2024-01-01", date_modified: "2024-01-01" },
  { id: "2", name: "Workout", description: null, date_created: "2024-01-02", date_modified: "2024-01-02" },
];

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("PlaylistManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debería renderizar lista de playlists", async () => {
    mockInvoke.mockResolvedValue(mockPlaylists);
    render(<PlaylistManager />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Favorites")).toBeInTheDocument();
      expect(screen.getByText("Workout")).toBeInTheDocument();
    });
  });

  it("debería mostrar loading state", () => {
    mockInvoke.mockImplementation(() => new Promise(() => {}));
    render(<PlaylistManager />, { wrapper: createWrapper() });
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("debería mostrar estado vacío cuando hay error (resiliente)", async () => {
    // El hook useGetPlaylists retorna [] en caso de error para mejor UX
    mockInvoke.mockRejectedValue(new Error("Failed to load"));
    render(<PlaylistManager />, { wrapper: createWrapper() });
    await waitFor(() => {
      // Muestra mensaje de "no hay playlists" en lugar de error
      expect(screen.getByText(/no hay playlists/i)).toBeInTheDocument();
    });
  });

  it("debería abrir diálogo de creación al hacer click en botón", async () => {
    mockInvoke.mockResolvedValue(mockPlaylists);
    render(<PlaylistManager />, { wrapper: createWrapper() });
    const createButton = await screen.findByRole("button", { name: /nueva playlist/i });
    fireEvent.click(createButton);
    expect(screen.getByText(/crear playlist/i)).toBeInTheDocument();
  });

  it("debería crear nueva playlist", async () => {
    mockInvoke.mockResolvedValueOnce(mockPlaylists).mockResolvedValueOnce(3);
    render(<PlaylistManager />, { wrapper: createWrapper() });
    const createButton = await screen.findByRole("button", { name: /nueva playlist/i });
    fireEvent.click(createButton);
    const nameInput = screen.getByPlaceholderText(/nombre/i);
    fireEvent.change(nameInput, { target: { value: "New Playlist" } });
    const submitButton = screen.getByRole("button", { name: /crear/i });
    fireEvent.click(submitButton);
    await waitFor(() => {
      // CreatePlaylistDialog usa null en lugar de undefined
      expect(mockInvoke).toHaveBeenCalledWith("create_playlist", { name: "New Playlist", description: null });
    });
  });

  it("debería eliminar playlist con confirmación", async () => {
    mockInvoke.mockResolvedValueOnce(mockPlaylists).mockResolvedValueOnce(undefined);
    render(<PlaylistManager />, { wrapper: createWrapper() });
    const deleteButton = await screen.findAllByRole("button", { name: /eliminar/i });
    fireEvent.click(deleteButton[0]);
    expect(screen.getByText(/confirmar eliminación/i)).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: /confirmar/i });
    fireEvent.click(confirmButton);
    await waitFor(() => {
      // deletePlaylist.mutate recibe String(id)
      expect(mockInvoke).toHaveBeenCalledWith("delete_playlist", { id: "1" });
    });
  });

  it("debería mostrar playlist vacía", async () => {
    mockInvoke.mockResolvedValue([]);
    render(<PlaylistManager />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/no hay playlists/i)).toBeInTheDocument();
    });
  });
});
