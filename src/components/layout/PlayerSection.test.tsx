/**
 * Tests para PlayerSection con funcionalidad de análisis (Milestone 4)
 *
 * AIDEV-NOTE: Tests comprensivos para análisis integrado en el reproductor
 * Cubre botón de análisis y renderizado condicional
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { PlayerSection } from "./PlayerSection";
import { Track } from "../../types/library";
import * as useAudioPlayerHook from "../../hooks/useAudioPlayer";
import * as useAnalysisHook from "../../hooks/useAnalysis";

// Mock de todos los hooks
vi.mock("../../hooks/useAudioPlayer");
vi.mock("../../hooks/useAnalysis");
vi.mock("../WaveformCanvas", () => ({
  WaveformCanvas: ({
    trackId,
    onSeek,
  }: {
    trackId?: string;
    onSeek: (time: number) => void;
  }) => (
    <button
      type="button"
      data-testid="waveform-canvas"
      onClick={() => onSeek(30)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSeek(30);
        }
      }}
    >
      {trackId ? `Waveform for ${trackId}` : "No waveform"}
    </button>
  ),
}));
vi.mock("../analysis", () => ({
  BeatgridOverlay: ({ bpm }: { bpm: number }) => (
    <div data-testid="beatgrid-overlay">Beatgrid BPM: {bpm}</div>
  ),
}));

// Mock data
const mockTrack: Track = {
  id: "track-123",
  path: "/music/test.mp3",
  title: "Test Song",
  artist: "Test Artist",
  album: "Test Album",
  duration: 180.0,
  bpm: 120,
  key: "Am",
  year: 2024,
  genre: "Electronic",
  bitrate: 320,
  sampleRate: 44100,
  fileSize: 5000000,
  playCount: 0,
  dateAdded: "2024-01-01T00:00:00Z",
  dateModified: "2024-01-01T00:00:00Z",
};

const mockBeatgrid = {
  trackId: "track-123",
  bpm: 128.5,
  offset: 0.1,
  confidence: 85.2,
  analyzedAt: "2024-01-01T00:00:00Z",
};

// Helper para wrapper con QueryClient
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

describe("PlayerSection", () => {
  // Mock hooks setup
  const mockPlay = vi.fn();
  const mockPause = vi.fn();
  const mockResume = vi.fn();
  const mockStop = vi.fn();
  const mockSeek = vi.fn();
  const mockAnalyzeBeatgrid = vi.fn();

  // Helper to create mock audio player return value
  const createMockAudioPlayer = (
    overrides: Partial<
      ReturnType<typeof useAudioPlayerHook.useAudioPlayer>
    > = {},
  ) => ({
    play: mockPlay,
    pause: mockPause,
    resume: mockResume,
    stop: mockStop,
    seek: mockSeek,
    isPlaying: false,
    position: 15.0,
    duration: 180.0,
    error: null,
    state: "stopped" as const,
    volume: 1.0,
    setVolume: vi.fn(),
    currentTrackPath: null,
    onTrackEnd: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAudioPlayer
    vi.mocked(useAudioPlayerHook.useAudioPlayer).mockReturnValue(
      createMockAudioPlayer(),
    );

    // Mock analysis hooks
    vi.mocked(useAnalysisHook.useGetBeatgrid).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: true,
    } as any);

    vi.mocked(useAnalysisHook.useAnalyzeBeatgrid).mockReturnValue({
      mutateAsync: mockAnalyzeBeatgrid,
      isPending: false,
      isSuccess: false,
    } as any);
  });

  describe("Renderizado básico", () => {
    it("debería renderizar sin track", () => {
      render(<PlayerSection track={null} />, { wrapper: createWrapper() });

      // Verificar que el artista esté presente (aunque vacío/espacio)
      const artistElement = screen.getByTestId("player-track-artist");
      expect(artistElement).toBeInTheDocument();
      
      // Verificar que el control de volumen esté presente
      expect(screen.getByTestId("volume-slider")).toBeInTheDocument();
    });

    it("debería renderizar con track", () => {
      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      expect(screen.getByText("Test Song")).toBeInTheDocument();
      expect(screen.getByText("Test Artist")).toBeInTheDocument();
      expect(screen.getByText("120BPM")).toBeInTheDocument();
      expect(screen.getByText("Am")).toBeInTheDocument();
      expect(screen.getByText("2024")).toBeInTheDocument();
      expect(screen.getByText("Electronic")).toBeInTheDocument();
    });
  });

  describe("Controles de audio", () => {
    it("debería iniciar reproducción cuando se hace click en play", async () => {
      const user = userEvent.setup();
      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      const playButton = screen.getByRole("button", { name: /play_arrow/i });
      await user.click(playButton);

      expect(mockPlay).toHaveBeenCalledWith("/music/test.mp3");
    });

    it("debería pausar cuando está reproduciendo", async () => {
      const user = userEvent.setup();

      // Mock playing state
      vi.mocked(useAudioPlayerHook.useAudioPlayer).mockReturnValue(
        createMockAudioPlayer({
          isPlaying: true,
          position: 30.0,
          state: "playing",
          currentTrackPath: "/music/test.mp3",
        }),
      );

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      const pauseButton = screen.getByRole("button", { name: /pause/i });
      await user.click(pauseButton);

      expect(mockPause).toHaveBeenCalled();
    });

    it("debería reanudar desde estado pausado", async () => {
      const user = userEvent.setup();

      // Mock paused state
      vi.mocked(useAudioPlayerHook.useAudioPlayer).mockReturnValue(
        createMockAudioPlayer({
          position: 30.0,
          state: "paused",
        }),
      );

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      const playButton = screen.getByRole("button", { name: /play_arrow/i });
      await user.click(playButton);

      expect(mockResume).toHaveBeenCalled();
    });

    it("debería deshabilitar controles sin track", () => {
      render(<PlayerSection track={null} />, { wrapper: createWrapper() });

      const playButton = screen.getByRole("button", { name: /play_arrow/i });
      const stopButton = screen.getByRole("button", { name: /stop/i });
      const analyzeButton = screen.getByRole("button", { name: /speed/i });

      expect(playButton).toBeDisabled();
      expect(stopButton).toBeDisabled();
      expect(analyzeButton).toBeDisabled();
    });
  });

  describe("Análisis de beatgrid", () => {
    it("debería mostrar BPM del metadata por defecto", () => {
      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      expect(screen.getByText("120BPM")).toBeInTheDocument();
    });

    it("debería mostrar BPM analizado cuando está disponible", () => {
      // Mock beatgrid data
      vi.mocked(useAnalysisHook.useGetBeatgrid).mockReturnValue({
        data: mockBeatgrid,
        isLoading: false,
        isSuccess: true,
      } as any);

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      expect(screen.getByText("128.5BPM")).toBeInTheDocument();
      expect(screen.getByText("(85%)")).toBeInTheDocument(); // confidence
    });

    it("debería ejecutar análisis al hacer click en botón de análisis", async () => {
      const user = userEvent.setup();
      mockAnalyzeBeatgrid.mockResolvedValue(mockBeatgrid);

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      const analyzeButton = screen.getByRole("button", { name: /speed/i });
      await user.click(analyzeButton);

      expect(mockAnalyzeBeatgrid).toHaveBeenCalledWith({
        trackId: "track-123",
        trackPath: "/music/test.mp3",
      });
    });

    it("debería mostrar estado de loading durante análisis", () => {
      // Mock loading state
      vi.mocked(useAnalysisHook.useAnalyzeBeatgrid).mockReturnValue({
        mutateAsync: mockAnalyzeBeatgrid,
        isPending: true,
        isSuccess: false,
      } as any);

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      const analyzeButton = screen.getByRole("button", {
        name: /hourglass_top/i,
      });
      expect(analyzeButton).toBeDisabled();
      expect(screen.getByText("hourglass_top")).toBeInTheDocument();
    });

    it("debería renderizar BeatgridOverlay cuando hay beatgrid", () => {
      vi.mocked(useAnalysisHook.useGetBeatgrid).mockReturnValue({
        data: mockBeatgrid,
        isLoading: false,
        isSuccess: true,
      } as any);

      // Mock getBoundingClientRect to return non-zero dimensions
      const mockGetBoundingClientRect = vi.fn(() => ({
        width: 800,
        height: 64,
        top: 0,
        left: 0,
        bottom: 64,
        right: 800,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      }));
      Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      expect(screen.getByTestId("beatgrid-overlay")).toBeInTheDocument();
      expect(screen.getByText("Beatgrid BPM: 128.5")).toBeInTheDocument();
    });
  });

  describe("Cue Points", () => {
    it("debería no mostrar cue points (funcionalidad eliminada)", () => {
      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      // Verificar que no hay botones de cue points
      expect(screen.queryByText("Cues (2)")).not.toBeInTheDocument();
      expect(screen.queryByTestId("cue-point-editor")).not.toBeInTheDocument();
    });
  });

  describe("Waveform y Overlays", () => {
    it("debería renderizar waveform canvas", () => {
      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      expect(screen.getByTestId("waveform-canvas")).toBeInTheDocument();
      expect(screen.getByText("Waveform for track-123")).toBeInTheDocument();
    });

    it("debería permitir seek desde waveform", async () => {
      const user = userEvent.setup();
      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      const waveform = screen.getByTestId("waveform-canvas");
      await user.click(waveform);

      expect(mockSeek).toHaveBeenCalledWith(30);
    });

    it("no debería renderizar overlays sin dimensiones", () => {
      // Mock empty beatgrid to avoid overlays
      vi.mocked(useAnalysisHook.useGetBeatgrid).mockReturnValue({
        data: undefined,
        isLoading: false,
        isSuccess: true,
      } as any);

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      expect(screen.queryByTestId("beatgrid-overlay")).not.toBeInTheDocument();
    });
  });

  describe("Estados de error", () => {
    it("debería mostrar Toast de error cuando hay error de audio", () => {
      vi.mocked(useAudioPlayerHook.useAudioPlayer).mockReturnValue(
        createMockAudioPlayer({
          position: 0,
          duration: 0,
          error: "Error al cargar archivo",
        }),
      );

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      // El Toast component está mockeado, pero debería estar presente
      expect(screen.getByText("Error al cargar archivo")).toBeInTheDocument();
    });

    it("debería manejar errores en análisis de beatgrid", async () => {
      const user = userEvent.setup();
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockAnalyzeBeatgrid.mockRejectedValue(new Error("Análisis falló"));

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      const analyzeButton = screen.getByRole("button", { name: /speed/i });
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Error analizando beatgrid:",
          expect.any(Error),
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("Tiempos y formato", () => {
    it("debería formatear tiempo correctamente", () => {
      // Mock position 75.5 seconds = 1:15
      vi.mocked(useAudioPlayerHook.useAudioPlayer).mockReturnValue(
        createMockAudioPlayer({
          position: 75.5,
        }),
      );

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      expect(screen.getByText("1:15")).toBeInTheDocument(); // formatted position
      expect(screen.getByText("3:00")).toBeInTheDocument(); // formatted duration
    });

    it("debería usar duración de track metadata si no hay duración de audio", () => {
      vi.mocked(useAudioPlayerHook.useAudioPlayer).mockReturnValue(
        createMockAudioPlayer({
          position: 0,
          duration: 0, // No audio duration
        }),
      );

      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      expect(screen.getByText("3:00")).toBeInTheDocument(); // track.duration (180s)
    });
  });

  describe("Auto-play siguiente track", () => {
    const mockTrack2: Track = {
      ...mockTrack,
      id: "track-456",
      path: "/music/test2.mp3",
      title: "Test Song 2",
    };

    const mockTrack3: Track = {
      ...mockTrack,
      id: "track-789",
      path: "/music/test3.mp3",
      title: "Test Song 3",
    };

    it("debería pasar tracks y onTrackChange como props opcionales", () => {
      const mockOnTrackChange = vi.fn();
      const tracks = [mockTrack, mockTrack2, mockTrack3];

      render(
        <PlayerSection
          track={mockTrack}
          tracks={tracks}
          onTrackChange={mockOnTrackChange}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    it("no debería romper si no se pasa tracks u onTrackChange", () => {
      render(<PlayerSection track={mockTrack} />, { wrapper: createWrapper() });

      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });
  });
});

