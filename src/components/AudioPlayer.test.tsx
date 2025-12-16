import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AudioPlayer } from "./AudioPlayer";
import * as useAudioPlayerModule from "../hooks/useAudioPlayer";

// Mock del hook useAudioPlayer
const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockResume = vi.fn();
const mockStop = vi.fn();
const mockSeek = vi.fn();
const mockSetVolume = vi.fn();
const mockOnTrackEnd = vi.fn();

vi.mock("@/hooks/useAudioPlayer", () => ({
  useAudioPlayer: vi.fn(),
}));

const createMockPlayerState = (overrides: Partial<ReturnType<typeof useAudioPlayerModule.useAudioPlayer>> = {}) => ({
  isPlaying: false,
  state: "stopped" as const,
  currentTrackPath: null,
  position: 0,
  duration: 0,
  volume: 1.0,
  error: null,
  play: mockPlay,
  pause: mockPause,
  resume: mockResume,
  stop: mockStop,
  seek: mockSeek,
  setVolume: mockSetVolume,
  onTrackEnd: mockOnTrackEnd,
  ...overrides,
});

describe("AudioPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock por defecto: estado stopped
    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(createMockPlayerState());
  });

  it("debería renderizar correctamente", () => {
    render(<AudioPlayer />);
    
    expect(screen.getByText("Reproductor de Audio")).toBeInTheDocument();
    expect(screen.getByTestId("track-title")).toBeInTheDocument();
    expect(screen.getByTestId("playback-state")).toBeInTheDocument();
  });

  it("debería mostrar 'Sin pista seleccionada' cuando no hay trackPath", () => {
    render(<AudioPlayer />);
    
    expect(screen.getByTestId("track-title")).toHaveTextContent("Sin pista seleccionada");
  });

  it("debería mostrar el título de la pista cuando se proporciona", () => {
    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({ currentTrackPath: "/test/song.mp3" })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" trackTitle="Mi Canción" />);
    
    expect(screen.getByTestId("track-title")).toHaveTextContent("Mi Canción");
  });

  it("debería mostrar estado de reproducción", () => {
    render(<AudioPlayer />);
    
    expect(screen.getByTestId("playback-state")).toHaveTextContent("Estado: stopped");
  });

  it("debería mostrar botón de reproducir cuando está stopped", () => {
    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    expect(screen.getByTestId("play-button")).toBeInTheDocument();
    expect(screen.getByTestId("play-button")).toHaveTextContent("Reproducir");
  });

  it("debería mostrar botón de pausar cuando está playing", () => {
    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({ 
        isPlaying: true,
        state: "playing",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    expect(screen.getByTestId("pause-button")).toBeInTheDocument();
    expect(screen.getByTestId("stop-button")).toBeInTheDocument();
  });

  it("debería mostrar botones de reanudar y detener cuando está paused", () => {
    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: false,
        state: "paused",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    expect(screen.getByTestId("resume-button")).toBeInTheDocument();
    expect(screen.getByTestId("stop-button")).toBeInTheDocument();
  });

  it("debería llamar a play cuando se hace click en reproducir", async () => {
    const user = userEvent.setup();
    mockPlay.mockResolvedValue(undefined);

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    const playButton = screen.getByTestId("play-button");
    await user.click(playButton);

    expect(mockPlay).toHaveBeenCalledWith("/test/song.mp3");
  });

  it("debería llamar a onPlay callback cuando se reproduce", async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    mockPlay.mockResolvedValue(undefined);

    render(<AudioPlayer trackPath="/test/song.mp3" onPlay={onPlay} />);
    
    await user.click(screen.getByTestId("play-button"));

    await waitFor(() => {
      expect(onPlay).toHaveBeenCalledWith("/test/song.mp3");
    });
  });

  it("debería llamar a pause cuando se hace click en pausar", async () => {
    const user = userEvent.setup();
    mockPause.mockResolvedValue(undefined);

    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: true,
        state: "playing",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    await user.click(screen.getByTestId("pause-button"));

    expect(mockPause).toHaveBeenCalled();
  });

  it("debería llamar a resume cuando se hace click en reanudar", async () => {
    const user = userEvent.setup();
    mockResume.mockResolvedValue(undefined);

    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: false,
        state: "paused",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    await user.click(screen.getByTestId("resume-button"));

    expect(mockResume).toHaveBeenCalled();
  });

  it("debería llamar a stop cuando se hace click en detener", async () => {
    const user = userEvent.setup();
    mockStop.mockResolvedValue(undefined);

    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: false,
        state: "paused",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    await user.click(screen.getByTestId("stop-button"));

    expect(mockStop).toHaveBeenCalled();
  });

  it("debería deshabilitar el botón de reproducir cuando no hay trackPath", () => {
    render(<AudioPlayer />);
    
    const playButton = screen.getByTestId("play-button");
    expect(playButton).toBeDisabled();
  });

  it("debería mostrar 'Sin pista seleccionada' en el título cuando no hay trackPath", () => {
    render(<AudioPlayer />);
    
    expect(screen.getByTestId("track-title")).toHaveTextContent("Sin pista seleccionada");
    expect(screen.getByTestId("play-button")).toBeDisabled();
  });

  it("debería mostrar mensaje de error cuando falla la reproducción", async () => {
    const user = userEvent.setup();
    mockPlay.mockRejectedValue(new Error("Error de prueba"));

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    await user.click(screen.getByTestId("play-button"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByTestId("error-message")).toHaveTextContent("Error de prueba");
    });
  });

  it("debería mostrar indicador de reproducción cuando isPlaying es true", () => {
    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: true,
        state: "playing",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    expect(screen.getByTestId("playing-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("playing-indicator")).toHaveTextContent("🎵 Reproduciendo...");
  });

  it("debería tener el displayName correcto", () => {
    expect(AudioPlayer.displayName).toBe("AudioPlayer");
  });

  it("debería mostrar error cuando falla la pausa", async () => {
    const user = userEvent.setup();
    mockPause.mockRejectedValue(new Error("Error al pausar"));

    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: true,
        state: "playing",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    await user.click(screen.getByTestId("pause-button"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByTestId("error-message")).toHaveTextContent("Error al pausar");
    });
  });

  it("debería mostrar error cuando falla la reanudación", async () => {
    const user = userEvent.setup();
    mockResume.mockRejectedValue(new Error("Error al reanudar"));

    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: false,
        state: "paused",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    await user.click(screen.getByTestId("resume-button"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByTestId("error-message")).toHaveTextContent("Error al reanudar");
    });
  });

  it("debería mostrar error cuando falla al detener", async () => {
    const user = userEvent.setup();
    mockStop.mockRejectedValue(new Error("Error al detener"));

    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: false,
        state: "paused",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    await user.click(screen.getByTestId("stop-button"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByTestId("error-message")).toHaveTextContent("Error al detener");
    });
  });

  it("debería mostrar error genérico cuando el error no es un Error", async () => {
    const user = userEvent.setup();
    mockPlay.mockRejectedValue("String error");

    render(<AudioPlayer trackPath="/test/song.mp3" />);
    
    await user.click(screen.getByTestId("play-button"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByTestId("error-message")).toHaveTextContent("Error al reproducir");
    });
  });

  it("debería llamar a onPause callback cuando se pausa", async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    mockPause.mockResolvedValue(undefined);

    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: true,
        state: "playing",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" onPause={onPause} />);
    
    await user.click(screen.getByTestId("pause-button"));

    await waitFor(() => {
      expect(onPause).toHaveBeenCalled();
    });
  });

  it("debería llamar a onStop callback cuando se detiene", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    mockStop.mockResolvedValue(undefined);

    vi.mocked(useAudioPlayerModule.useAudioPlayer).mockReturnValue(
      createMockPlayerState({
        isPlaying: false,
        state: "paused",
        currentTrackPath: "/test/song.mp3"
      })
    );

    render(<AudioPlayer trackPath="/test/song.mp3" onStop={onStop} />);
    
    await user.click(screen.getByTestId("stop-button"));

    await waitFor(() => {
      expect(onStop).toHaveBeenCalled();
    });
  });
});
