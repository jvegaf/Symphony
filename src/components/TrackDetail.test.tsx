import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { TrackDetail } from "./TrackDetail";
import type { Track } from "../types/library";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

const mockTrack: Track = {
  id: "1",
  path: "/music/test.mp3",
  title: "Test Track",
  artist: "Test Artist",
  album: "Test Album",
  duration: 180.5,
  fileSize: 5000000,
  bitrate: 320,
  sampleRate: 44100,
  playCount: 0,
  dateAdded: "2024-01-01T00:00:00Z",
  dateModified: "2024-01-01T00:00:00Z",
  year: 2024,
  genre: "Rock",
  rating: 4,
};

describe("TrackDetail", () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Mock por defecto
    // AIDEV-NOTE: Comando correcto es get_track_by_id, no get_track
    mockInvoke.mockImplementation(async (command: string, _args?: any) => {
      if (command === "get_track_by_id") {
        return Promise.resolve(mockTrack);
      }
      if (command === "update_track_metadata") {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  // AIDEV-NOTE: trackId debe ser string (UUID), no number
  const renderComponent = (trackId: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TrackDetail trackId={trackId} />
      </QueryClientProvider>
    );
  };

  it("debería renderizar metadatos del track", async () => {
    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Track")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test Artist")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test Album")).toBeInTheDocument();
    });
  });

  it("debería mostrar loading state mientras carga", () => {
    mockInvoke.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent("1");

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("debería mostrar error state si falla la carga", async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_track_by_id") return Promise.reject(new Error("Track not found"));
      return Promise.resolve(null);
    });

    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByText(/error al cargar/i)).toBeInTheDocument();
    });
  });

  it("debería permitir editar título", async () => {
    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Track")).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/título/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Nuevo Título");

    expect(titleInput).toHaveValue("Nuevo Título");
  });

  it("debería permitir editar artista", async () => {
    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Artist")).toBeInTheDocument();
    });

    const artistInput = screen.getByLabelText(/artista/i);
    await user.clear(artistInput);
    await user.type(artistInput, "Nuevo Artista");

    expect(artistInput).toHaveValue("Nuevo Artista");
  });

  it("debería permitir editar año", async () => {
    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("2024")).toBeInTheDocument();
    });

    const yearInput = screen.getByLabelText(/año/i);
    await user.clear(yearInput);
    await user.type(yearInput, "2025");

    expect(yearInput).toHaveValue(2025);
  });

  it("debería mostrar rating con estrellas", async () => {
    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Track")).toBeInTheDocument();
    });

    // Buscar los botones de estrellas
    const stars = screen.getAllByRole("button", { name: /star/i });
    expect(stars).toHaveLength(5);
  });

  it("debería actualizar rating al hacer click en estrella", async () => {
    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Track")).toBeInTheDocument();
    });

    // Click en la tercera estrella (rating 3)
    const stars = screen.getAllByRole("button", { name: /star/i });
    await user.click(stars[2]);

    // Verificar que se llame al comando de actualización
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("update_track_metadata", {
        track_id: "1",
        metadata: expect.objectContaining({
          rating: 3,
        }),
      });
    });
  });

  it("debería guardar cambios al hacer click en botón Guardar", async () => {
    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Track")).toBeInTheDocument();
    });

    // Editar campos
    const titleInput = screen.getByLabelText(/título/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Track Editado");

    const artistInput = screen.getByLabelText(/artista/i);
    await user.clear(artistInput);
    await user.type(artistInput, "Artista Editado");

    // Guardar
    const saveButton = screen.getByRole("button", { name: /guardar/i });
    await user.click(saveButton);

    // Verificar llamada al comando
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("update_track_metadata", {
        track_id: "1",
        metadata: {
          title: "Track Editado",
          artist: "Artista Editado",
          album: "Test Album",
          year: 2024,
          genre: "Rock",
          rating: 4,
        },
      });
    });
  });

  it("debería mostrar mensaje de éxito después de guardar", async () => {
    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Track")).toBeInTheDocument();
    });

    // Editar y guardar
    const titleInput = screen.getByLabelText(/título/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Track Editado");

    const saveButton = screen.getByRole("button", { name: /guardar/i });
    await user.click(saveButton);

    // Verificar mensaje de éxito
    await waitFor(() => {
      expect(screen.getByText(/guardado correctamente/i)).toBeInTheDocument();
    });
  });

  it("debería validar que rating esté entre 0 y 5", async () => {
    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Track")).toBeInTheDocument();
    });

    // Intentar hacer click más allá de 5 estrellas no debería funcionar
    const stars = screen.getAllByRole("button", { name: /star/i });
    
    // Click en la quinta estrella (máximo)
    await user.click(stars[4]);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("update_track_metadata", {
        track_id: "1",
        metadata: expect.objectContaining({
          rating: 5,
        }),
      });
    });
  });
});
