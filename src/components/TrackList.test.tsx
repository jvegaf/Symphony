import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TrackList } from "./TrackList";
import { Track } from "../types/library";
import * as useLibraryHook from "../hooks/useLibrary";

// Mock react-window
vi.mock("react-window", () => ({
  FixedSizeList: ({ children, itemCount }: any) => {
    return (
      <div data-testid="virtual-list">
        {Array.from({ length: itemCount }).map((_, index) =>
          children({ index, style: {} })
        )}
      </div>
    );
  },
}));

const mockTracks: Track[] = [
  {
    id: 1,
    path: "/music/track1.mp3",
    title: "Amazing Song",
    artist: "Cool Artist",
    album: "Best Album",
    duration: 180,
    bpm: 120,
    fileSize: 5000000,
    sampleRate: 44100,
    bitrate: 320,
    playCount: 0,
    dateAdded: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  },
  {
    id: 2,
    path: "/music/track2.flac",
    title: "Beautiful Track",
    artist: "Great Band",
    album: "Second Album",
    duration: 240,
    bpm: 128,
    fileSize: 8000000,
    sampleRate: 48000,
    bitrate: 1411,
    playCount: 0,
    dateAdded: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  },
  {
    id: 3,
    path: "/music/track3.wav",
    title: "Energetic Beat",
    artist: "Cool Artist",
    album: "Third Album",
    duration: 210,
    bpm: 140,
    fileSize: 15000000,
    sampleRate: 44100,
    bitrate: 1411,
    playCount: 0,
    dateAdded: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  },
];

const mockUseSearchTracks = vi.fn();
vi.spyOn(useLibraryHook, "useSearchTracks").mockImplementation(
  mockUseSearchTracks
);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("TrackList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchTracks.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  it("debería renderizar lista de pistas", () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    expect(screen.getByText("Amazing Song")).toBeInTheDocument();
    expect(screen.getByText("Beautiful Track")).toBeInTheDocument();
    expect(screen.getByText("Energetic Beat")).toBeInTheDocument();
  });

  it("debería mostrar columnas de encabezado", () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByText("Artista")).toBeInTheDocument();
    expect(screen.getByText("Álbum")).toBeInTheDocument();
    expect(screen.getByText("Duración")).toBeInTheDocument();
    expect(screen.getByText("BPM")).toBeInTheDocument();
  });

  it("debería formatear duración correctamente", () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    expect(screen.getByText("03:00")).toBeInTheDocument(); // 180 segundos
    expect(screen.getByText("04:00")).toBeInTheDocument(); // 240 segundos
    expect(screen.getByText("03:30")).toBeInTheDocument(); // 210 segundos
  });

  it("debería mostrar conteo de pistas", () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    expect(screen.getByText("3 pistas")).toBeInTheDocument();
  });

  it("debería llamar onTrackClick al hacer click", async () => {
    const onTrackClick = vi.fn();
    render(<TrackList tracks={mockTracks} onTrackClick={onTrackClick} />, {
      wrapper: createWrapper(),
    });

    const track = screen.getByText("Amazing Song");
    await userEvent.click(track);

    expect(onTrackClick).toHaveBeenCalledWith(mockTracks[0]);
  });

  it("debería llamar onTrackDoubleClick al hacer doble click", () => {
    const onTrackDoubleClick = vi.fn();
    
    render(
      <TrackList tracks={mockTracks} onTrackDoubleClick={onTrackDoubleClick} />,
      { wrapper: createWrapper() }
    );

    const track = screen.getByText("Beautiful Track").closest('[role="row"]');
    expect(track).toBeTruthy();
    
    if (track) {
      fireEvent.doubleClick(track);
    }

    expect(onTrackDoubleClick).toHaveBeenCalledWith(mockTracks[1]);
  });

  it("debería resaltar pista seleccionada", async () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const trackElement = screen.getByText("Amazing Song").closest('[role="row"]');
    expect(trackElement).not.toHaveClass("bg-blue-600");

    await userEvent.click(screen.getByText("Amazing Song"));

    // Re-query el elemento después del click
    const updatedTrack = screen.getByText("Amazing Song").closest('[role="row"]');
    await waitFor(() => {
      expect(updatedTrack).toHaveClass("bg-blue-600");
    });
  });

  it("debería ordenar por título ascendente", async () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const rows = screen.getAllByRole("row");
    // Por defecto ya está ordenado por título ascendente
    expect(rows[0].textContent).toContain("Amazing Song");
    expect(rows[1].textContent).toContain("Beautiful Track");
    expect(rows[2].textContent).toContain("Energetic Beat");
  });

  it("debería ordenar por título descendente", async () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const titleButton = screen.getByText("Título");
    await userEvent.click(titleButton); // asc
    await userEvent.click(titleButton); // desc

    const rows = screen.getAllByRole("row");
    expect(rows[0]).toHaveTextContent("Energetic Beat");
    expect(rows[1]).toHaveTextContent("Beautiful Track");
    expect(rows[2]).toHaveTextContent("Amazing Song");
  });

  it("debería ordenar por artista", async () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const artistButton = screen.getByText("Artista");
    await userEvent.click(artistButton);

    const rows = screen.getAllByRole("row");
    // Cool Artist (2 pistas) debería aparecer antes que Great Band
    expect(rows[0]).toHaveTextContent("Cool Artist");
    expect(rows[1]).toHaveTextContent("Cool Artist");
    expect(rows[2]).toHaveTextContent("Great Band");
  });

  it("debería ordenar por duración", async () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const durationButton = screen.getByText("Duración");
    await userEvent.click(durationButton);

    const rows = screen.getAllByRole("row");
    expect(rows[0]).toHaveTextContent("03:00"); // 180s
    expect(rows[1]).toHaveTextContent("03:30"); // 210s
    expect(rows[2]).toHaveTextContent("04:00"); // 240s
  });

  it("debería ordenar por BPM", async () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const bpmButton = screen.getByText("BPM");
    await userEvent.click(bpmButton);

    const rows = screen.getAllByRole("row");
    expect(rows[0]).toHaveTextContent("120");
    expect(rows[1]).toHaveTextContent("128");
    expect(rows[2]).toHaveTextContent("140");
  });

  it("debería mostrar indicador de ordenamiento", async () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    // Por defecto tiene ordenamiento ascendente en título
    let titleButton = screen.getByText(/título/i);
    expect(titleButton.textContent).toContain("↑");

    await userEvent.click(titleButton);
    // Después del click debería cambiar a descendente - re-buscar elemento
    await waitFor(() => {
      titleButton = screen.getByText(/título/i);
      expect(titleButton.textContent).toContain("↓");
    });
  });

  it("debería permitir búsqueda", async () => {
    mockUseSearchTracks.mockReturnValue({
      data: [mockTracks[0]],
      isLoading: false,
    });

    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(
      /buscar pistas/i
    ) as HTMLInputElement;
    await userEvent.type(searchInput, "amazing");

    await waitFor(() => {
      expect(mockUseSearchTracks).toHaveBeenCalledWith("amazing", true);
    });
  });

  it("no debería buscar con menos de 2 caracteres", async () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/buscar pistas/i);
    await userEvent.type(searchInput, "a");

    await waitFor(() => {
      expect(mockUseSearchTracks).toHaveBeenCalledWith("a", false);
    });
  });

  it("debería mostrar resultados de búsqueda", async () => {
    mockUseSearchTracks.mockReturnValue({
      data: [mockTracks[0]],
      isLoading: false,
    });

    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/buscar pistas/i);
    await userEvent.type(searchInput, "amazing");

    await waitFor(() => {
      expect(screen.getByText("Amazing Song")).toBeInTheDocument();
      expect(screen.queryByText("Beautiful Track")).not.toBeInTheDocument();
    });
  });

  it("debería mostrar estado vacío cuando no hay pistas", () => {
    render(<TrackList tracks={[]} />, { wrapper: createWrapper() });

    expect(screen.getByText("No hay pistas disponibles")).toBeInTheDocument();
  });

  it("debería mostrar mensaje cuando búsqueda no tiene resultados", async () => {
    mockUseSearchTracks.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/buscar pistas/i);
    await userEvent.type(searchInput, "xyz");

    await waitFor(() => {
      expect(screen.getByText("No se encontraron pistas")).toBeInTheDocument();
    });
  });

  it("debería mostrar estado de carga", () => {
    render(<TrackList tracks={mockTracks} loading={true} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Cargando pistas...")).toBeInTheDocument();
  });

  it("debería mostrar estado de carga durante búsqueda", async () => {
    render(<TrackList tracks={mockTracks} />, { wrapper: createWrapper() });

    // Actualizar el mock para devolver loading después del render
    mockUseSearchTracks.mockReturnValue({
      data: null,
      isLoading: true,
    });

    const searchInput = screen.getByPlaceholderText(/buscar pistas/i);
    await userEvent.type(searchInput, "test");

    await waitFor(() => {
      expect(screen.getByText("Cargando pistas...")).toBeInTheDocument();
    });
  });

  it("debería usar altura personalizada", () => {
    render(<TrackList tracks={mockTracks} height={400} />, {
      wrapper: createWrapper(),
    });

    // Verificar que el componente se renderiza
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("debería manejar pistas sin BPM", () => {
    const tracksWithoutBPM: Track[] = [
      {
        ...mockTracks[0],
        bpm: undefined,
      },
    ];

    render(<TrackList tracks={tracksWithoutBPM} />, {
      wrapper: createWrapper(),
    });

    const rows = screen.getAllByRole("row");
    expect(rows[0]).toHaveTextContent("-"); // BPM vacío
  });

  it("debería manejar pistas sin artista o álbum", () => {
    const incompleteTracks: Track[] = [
      {
        ...mockTracks[0],
        artist: "Desconocido",
        album: undefined,
      },
    ];

    render(<TrackList tracks={incompleteTracks} />, {
      wrapper: createWrapper(),
    });

    const rows = screen.getAllByRole("row");
    // Debería mostrar "-" para campos vacíos
    const rowText = rows[0].textContent;
    expect(rowText).toContain("-");
  });
});
