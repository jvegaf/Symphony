import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WaveformViewer } from "./WaveformViewer";

// Mock de WaveSurfer
const mockCreate = vi.fn();
const mockLoad = vi.fn();
const mockPlayPause = vi.fn();
const mockZoom = vi.fn();
const mockDestroy = vi.fn();
const mockGetDuration = vi.fn(() => 180);
const mockOn = vi.fn();

vi.mock("wavesurfer.js", () => ({
  default: {
    create: (...args: any[]) => mockCreate(...args),
  },
}));

describe("WaveformViewer", () => {
  let wavesurferInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock de instancia de WaveSurfer
    wavesurferInstance = {
      load: mockLoad,
      playPause: mockPlayPause,
      zoom: mockZoom,
      destroy: mockDestroy,
      getDuration: mockGetDuration,
      on: mockOn,
    };

    mockCreate.mockReturnValue(wavesurferInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("debería renderizar correctamente", () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    expect(screen.getByText("Visualización de Waveform")).toBeInTheDocument();
    expect(screen.getByTestId("waveform-container")).toBeInTheDocument();
  });

  it("debería mostrar indicador de carga inicialmente", () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    expect(screen.getByText("Cargando waveform...")).toBeInTheDocument();
  });

  it("debería inicializar WaveSurfer con opciones correctas", () => {
    const { container } = render(
      <WaveformViewer
        audioPath="/test/song.mp3"
        height={256}
        waveColor="#ff0000"
        progressColor="#00ff00"
      />
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        container: expect.any(HTMLElement),
        height: 256,
        waveColor: "#ff0000",
        progressColor: "#00ff00",
        cursorColor: "#60a5fa",
        barWidth: 2,
        barGap: 1,
        responsive: true,
        normalize: true,
      })
    );
  });

  it("debería cargar el audio especificado", () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    expect(mockLoad).toHaveBeenCalledWith("/test/song.mp3");
  });

  it("debería registrar event listeners", () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    expect(mockOn).toHaveBeenCalledWith("ready", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("timeupdate", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("play", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("pause", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("seeking", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("interaction", expect.any(Function));
  });

  it("debería ocultar loading y mostrar controles cuando está ready", async () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    await waitFor(() => {
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
      expect(screen.getByTestId("play-pause-button")).toBeInTheDocument();
      expect(screen.getByTestId("time-display")).toBeInTheDocument();
    });
  });

  it("debería mostrar error cuando falla la carga", async () => {
    render(<WaveformViewer audioPath="/test/invalid.mp3" />);

    // Simular evento error
    const errorCallback = mockOn.mock.calls.find((call) => call[0] === "error")?.[1];
    errorCallback?.(new Error("Error de carga"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText("Error de carga")).toBeInTheDocument();
    });
  });

  it("debería llamar a onReady callback cuando está listo", async () => {
    const onReady = vi.fn();
    render(<WaveformViewer audioPath="/test/song.mp3" onReady={onReady} />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
  });

  it("debería llamar a onError callback cuando hay error", async () => {
    const onError = vi.fn();
    render(<WaveformViewer audioPath="/test/song.mp3" onError={onError} />);

    // Simular evento error
    const errorCallback = mockOn.mock.calls.find((call) => call[0] === "error")?.[1];
    errorCallback?.(new Error("Error de prueba"));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Error de prueba");
    });
  });

  it("debería llamar a onSeek callback cuando se hace click en waveform", async () => {
    const onSeek = vi.fn();
    render(<WaveformViewer audioPath="/test/song.mp3" onSeek={onSeek} />);

    // Simular evento ready primero
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    // Simular evento interaction
    const interactionCallback = mockOn.mock.calls.find(
      (call) => call[0] === "interaction"
    )?.[1];
    interactionCallback?.(45.5);

    await waitFor(() => {
      expect(onSeek).toHaveBeenCalledWith(45.5);
    });
  });

  it("debería actualizar tiempo cuando se reproduce", async () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    // Simular evento timeupdate
    const timeupdateCallback = mockOn.mock.calls.find(
      (call) => call[0] === "timeupdate"
    )?.[1];
    timeupdateCallback?.(30);

    await waitFor(() => {
      const timeDisplay = screen.getByTestId("time-display");
      expect(timeDisplay).toHaveTextContent("0:30");
    });
  });

  it("debería formatear tiempo correctamente", async () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    await waitFor(() => {
      const timeDisplay = screen.getByTestId("time-display");
      expect(timeDisplay).toHaveTextContent("3:00"); // 180 segundos = 3:00
    });
  });

  it("debería llamar a playPause cuando se hace click en botón", async () => {
    const user = userEvent.setup();
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    await waitFor(() => {
      expect(screen.getByTestId("play-pause-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("play-pause-button"));

    expect(mockPlayPause).toHaveBeenCalled();
  });

  it("debería cambiar texto del botón cuando está reproduciendo", async () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    await waitFor(() => {
      expect(screen.getByText("▶ Reproducir")).toBeInTheDocument();
    });

    // Simular evento play
    const playCallback = mockOn.mock.calls.find((call) => call[0] === "play")?.[1];
    playCallback?.();

    await waitFor(() => {
      expect(screen.getByText("⏸ Pausar")).toBeInTheDocument();
    });
  });

  it("debería aumentar zoom cuando se hace click en zoom in", async () => {
    const user = userEvent.setup();
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    await waitFor(() => {
      expect(screen.getByTestId("zoom-in-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("zoom-in-button"));

    await waitFor(() => {
      expect(mockZoom).toHaveBeenCalledWith(11); // 1 + 10
    });
  });

  it("debería disminuir zoom cuando se hace click en zoom out", async () => {
    const user = userEvent.setup();
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    await waitFor(() => {
      expect(screen.getByTestId("zoom-in-button")).toBeInTheDocument();
    });

    // Aumentar zoom primero
    await user.click(screen.getByTestId("zoom-in-button"));
    await user.click(screen.getByTestId("zoom-in-button"));

    // Ahora disminuir
    await user.click(screen.getByTestId("zoom-out-button"));

    await waitFor(() => {
      expect(mockZoom).toHaveBeenCalledWith(11); // 21 - 10
    });
  });

  it("debería resetear zoom cuando se hace click en reset", async () => {
    const user = userEvent.setup();
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    await waitFor(() => {
      expect(screen.getByTestId("zoom-in-button")).toBeInTheDocument();
    });

    // Aumentar zoom
    await user.click(screen.getByTestId("zoom-in-button"));

    // Resetear
    await user.click(screen.getByTestId("zoom-reset-button"));

    await waitFor(() => {
      expect(mockZoom).toHaveBeenCalledWith(1);
    });
  });

  it("debería deshabilitar zoom out cuando está en mínimo", async () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    await waitFor(() => {
      const zoomOutButton = screen.getByTestId("zoom-out-button");
      expect(zoomOutButton).toBeDisabled();
    });
  });

  it("debería destruir WaveSurfer en cleanup", () => {
    const { unmount } = render(<WaveformViewer audioPath="/test/song.mp3" />);

    unmount();

    expect(mockDestroy).toHaveBeenCalled();
  });

  it("debería recrear WaveSurfer cuando cambia audioPath", () => {
    const { rerender } = render(<WaveformViewer audioPath="/test/song1.mp3" />);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith("/test/song1.mp3");

    rerender(<WaveformViewer audioPath="/test/song2.mp3" />);

    expect(mockDestroy).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockLoad).toHaveBeenCalledWith("/test/song2.mp3");
  });

  it("debería tener el displayName correcto", () => {
    expect(WaveformViewer.displayName).toBe("WaveformViewer");
  });

  it("debería usar valores por defecto para props opcionales", () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        height: 128,
        waveColor: "#3b82f6",
        progressColor: "#1e40af",
      })
    );
  });

  it("debería mostrar error genérico cuando el error no es un Error", async () => {
    render(<WaveformViewer audioPath="/test/song.mp3" />);

    // Simular evento error con string
    const errorCallback = mockOn.mock.calls.find((call) => call[0] === "error")?.[1];
    errorCallback?.("String error");

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText("Error al cargar waveform")).toBeInTheDocument();
    });
  });
});
