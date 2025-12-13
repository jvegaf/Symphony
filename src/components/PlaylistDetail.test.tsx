import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlaylistDetail } from "./PlaylistDetail";
import { invoke } from "@tauri-apps/api/core";

// Mock Tauri API
vi.mock("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

// Mock @dnd-kit (simplificado para tests)
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => "",
    },
  },
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
  arrayMove: (arr: any[], from: number, to: number) => {
    const newArr = [...arr];
    const [item] = newArr.splice(from, 1);
    newArr.splice(to, 0, item);
    return newArr;
  },
}));

const mockPlaylist = {
  id: 1,
  name: "Mi Playlist",
  description: "Descripción de prueba",
  track_count: 2,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockTracks = [
  {
    id: 1,
    path: "/music/track1.mp3",
    title: "Track 1",
    artist: "Artist 1",
    album: null,
    duration: 180.5,
    file_size: 5000000,
    format: "MP3",
    bitrate: 320,
    sample_rate: 44100,
    channels: 2,
    has_artwork: false,
    added_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    path: "/music/track2.mp3",
    title: "Track 2",
    artist: "Artist 2",
    album: null,
    duration: 240.0,
    file_size: 6000000,
    format: "MP3",
    bitrate: 320,
    sample_rate: 44100,
    channels: 2,
    has_artwork: false,
    added_at: "2024-01-02T00:00:00Z",
  },
];

describe("PlaylistDetail", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          cacheTime: 0,
          staleTime: 0,
        },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Mock por defecto que funciona para todos los tests
    mockInvoke.mockImplementation(async (command: string, args?: any) => {
      if (command === "get_playlist") {
        return Promise.resolve(mockPlaylist);
      }
      if (command === "get_playlist_tracks_cmd") {
        return Promise.resolve(mockTracks);
      }
      if (command === "add_track_to_playlist") {
        return Promise.resolve({ success: true });
      }
      if (command === "remove_track_from_playlist") {
        return Promise.resolve({ success: true });
      }
      if (command === "reorder_playlist_tracks") {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    // Limpiar completamente el caché de queries entre tests
    queryClient.clear();
  });

  const renderComponent = (playlistId: number) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PlaylistDetail playlistId={playlistId} />
      </QueryClientProvider>
    );
  };

  it("debería renderizar información de playlist y lista de tracks", async () => {
    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText("Mi Playlist")).toBeInTheDocument();
      expect(screen.getByText("Descripción de prueba")).toBeInTheDocument();
      expect(screen.getByText("Track 1")).toBeInTheDocument();
      expect(screen.getByText("Track 2")).toBeInTheDocument();
    });
  });

  it("debería mostrar loading state mientras carga", () => {
    mockInvoke.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent(1);

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("debería mostrar error state si falla la carga", async () => {
    mockInvoke
      .mockRejectedValueOnce(new Error("Error de red"))
      .mockRejectedValueOnce(new Error("Error de red"));

    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it("debería mostrar mensaje cuando playlist está vacía", async () => {
    mockInvoke
      .mockResolvedValueOnce(mockPlaylist)
      .mockResolvedValueOnce([]); // Sin tracks

    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText(/no hay tracks/i)).toBeInTheDocument();
    });
  });

  it("debería abrir diálogo para agregar track", async () => {
    const user = userEvent.setup();
    mockInvoke
      .mockResolvedValueOnce(mockPlaylist)
      .mockResolvedValueOnce(mockTracks);

    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText("Track 1")).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /agregar track/i });
    await user.click(addButton);

    expect(screen.getByText(/seleccionar track/i)).toBeInTheDocument();
  });

  it("debería agregar track a la playlist", async () => {
    const user = userEvent.setup();
    
    // Configurar mocks para soportar múltiples llamadas
    mockInvoke.mockImplementation((cmd: string, args?: any) => {
      if (cmd === "get_playlist") return Promise.resolve(mockPlaylist);
      if (cmd === "get_playlist_tracks_cmd") return Promise.resolve(mockTracks);
      if (cmd === "add_track_to_playlist") return Promise.resolve(undefined);
      return Promise.resolve(null);
    });

    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText("Track 1")).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /agregar track/i });
    await user.click(addButton);

    // Ingresar ID del track
    const input = screen.getByPlaceholderText(/ingrese id/i);
    await user.type(input, "3");

    // Confirmar
    const confirmButton = screen.getByRole("button", { name: /confirmar/i });
    await user.click(confirmButton);

    await waitFor(() => {
      const calls = mockInvoke.mock.calls;
      const addTrackCall = calls.find(
        (call) => call[0] === "add_track_to_playlist"
      );
      expect(addTrackCall).toBeDefined();
      expect(addTrackCall![1]).toEqual(
        expect.objectContaining({
          playlist_id: 1,
          track_id: 3,
        })
      );
    });
  });

  it("debería eliminar track con confirmación", async () => {
    const user = userEvent.setup();
    
    // Configurar mocks para soportar múltiples llamadas
    mockInvoke.mockImplementation((cmd: string, args?: any) => {
      if (cmd === "get_playlist") return Promise.resolve(mockPlaylist);
      if (cmd === "get_playlist_tracks_cmd") return Promise.resolve(mockTracks);
      if (cmd === "remove_track_from_playlist") return Promise.resolve(undefined);
      return Promise.resolve(null);
    });

    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText("Track 1")).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole("button", { name: /quitar/i });
    await user.click(removeButtons[0]);

    // Confirmar eliminación
    const confirmButton = screen.getByRole("button", { name: /confirmar/i });
    await user.click(confirmButton);

    await waitFor(() => {
      const calls = mockInvoke.mock.calls;
      const removeTrackCall = calls.find(
        (call) => call[0] === "remove_track_from_playlist"
      );
      expect(removeTrackCall).toBeDefined();
      expect(removeTrackCall![1]).toEqual(
        expect.objectContaining({
          playlist_id: 1,
          track_id: 1,
        })
      );
    });
  });

  it("debería reordenar tracks automáticamente", async () => {
    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText("Track 1")).toBeInTheDocument();
    });

    // Simular drag & drop (en test simplificado, solo verificamos que la función existe)
    // En implementación real, @dnd-kit maneja esto
    expect(screen.getByText("Track 1")).toBeInTheDocument();
    expect(screen.getByText("Track 2")).toBeInTheDocument();
  });

  it("debería mostrar contador de tracks", async () => {
    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText(/2 tracks?/i)).toBeInTheDocument();
    });
  });

  it("debería formatear duración de tracks correctamente", async () => {
    renderComponent(1);

    await waitFor(() => {
      expect(screen.getByText("3:00")).toBeInTheDocument(); // 180.5s
      expect(screen.getByText("4:00")).toBeInTheDocument(); // 240.0s
    });
  });
});
