/**
 * Tests para WaveformViewer con arquitectura de streaming progresivo
 * 
 * AIDEV-NOTE: Reescrito para coincidir con nueva implementación:
 * - Usa useWaveform hook para obtener peaks
 * - WaveSurfer.load("", [peaks], duration) en vez de .load(url)
 * - Solo visualización, no playback
 * - Eventos: 'ready', 'interaction' (no 'play', 'pause', etc.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WaveformViewer } from "./WaveformViewer";

// AIDEV-NOTE: Mock del hook useWaveform
vi.mock("../hooks/useWaveform", () => ({
  useWaveform: vi.fn(),
}));

// Mock de WaveSurfer
const mockCreate = vi.fn();
const mockLoad = vi.fn();
const mockDestroy = vi.fn();
const mockSetTime = vi.fn();
const mockOn = vi.fn();

vi.mock("wavesurfer.js", () => ({
  default: {
    create: (...args: any[]) => mockCreate(...args),
  },
}));

// Import después del mock para obtener la versión mockeada
import { useWaveform } from "../hooks/useWaveform";

const mockUseWaveform = vi.mocked(useWaveform);

describe("WaveformViewer", () => {
  let wavesurferInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock de instancia de WaveSurfer
    wavesurferInstance = {
      load: mockLoad,
      destroy: mockDestroy,
      setTime: mockSetTime,
      on: mockOn,
    };

    mockCreate.mockReturnValue(wavesurferInstance);

    // AIDEV-NOTE: Mock por defecto de useWaveform: peaks listos
    // Retorna WaveformState + cancel
    const mockPeaks = new Float32Array([0.5, 0.8, 0.3, 0.6, 0.9]);
    mockUseWaveform.mockReturnValue({
      peaks: mockPeaks,
      isLoading: false,
      error: null,
      progress: 0,
      cancel: vi.fn().mockResolvedValue(true),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("debería renderizar el contenedor del waveform", () => {
    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    expect(screen.getByTestId("waveform-container")).toBeInTheDocument();
  });

  it("debería inicializar WaveSurfer con opciones correctas", () => {
    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        height={256}
        waveColor="#ff0000"
        progressColor="#00ff00"
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: WaveSurfer.create debe ser llamado con las opciones correctas
    // barWidth=1, barGap=0 para mejor sincronización tiempo/espacio
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        container: expect.any(HTMLElement),
        height: 256,
        waveColor: "#ff0000",
        progressColor: "#00ff00",
        cursorColor: "#60a5fa",
        cursorWidth: 2,
        barWidth: 1,
        barGap: 0,
        normalize: true,
        interact: true,
        hideScrollbar: true,
        autoScroll: false,
        autoCenter: false,
      })
    );
  });

  it("debería cargar peaks en vez de audio URL", () => {
    const mockPeaks = new Float32Array([0.5, 0.8, 0.3]);
    mockUseWaveform.mockReturnValue({
      peaks: mockPeaks,
      isLoading: false,
      error: null,
      progress: 0,
      cancel: vi.fn().mockResolvedValue(true),
    });

    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: Nueva arquitectura carga SOLO peaks, no URL
    // wavesurfer.load("", [peaks], duration)
    expect(mockLoad).toHaveBeenCalledWith("", [mockPeaks], 180);
  });

  it("debería registrar event listeners (ready, interaction)", () => {
    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: Solo 'ready' e 'interaction' (seek), no playback events
    expect(mockOn).toHaveBeenCalledWith("ready", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("interaction", expect.any(Function));
  });

  it("debería llamar a onReady callback cuando WaveSurfer emite ready", () => {
    const onReady = vi.fn();
    
    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        onReady={onReady}
        shouldGenerate={true}
      />
    );

    // Simular evento ready
    const readyCallback = mockOn.mock.calls.find((call) => call[0] === "ready")?.[1];
    readyCallback?.();

    expect(onReady).toHaveBeenCalled();
  });

  it("debería llamar a onSeek callback cuando se hace click en waveform", () => {
    const onSeek = vi.fn();
    
    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        onSeek={onSeek}
        shouldGenerate={true}
      />
    );

    // Simular evento interaction con tiempo = 45.5 segundos
    const interactionCallback = mockOn.mock.calls.find(
      (call) => call[0] === "interaction"
    )?.[1];
    interactionCallback?.(45.5);

    expect(onSeek).toHaveBeenCalledWith(45.5);
  });

  it("debería actualizar la posición cuando cambia currentTime", () => {
    const { rerender } = render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        currentTime={0}
        shouldGenerate={true}
      />
    );

    // Cambiar currentTime
    rerender(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        currentTime={60}
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: setTime debe ser llamado con el nuevo currentTime
    expect(mockSetTime).toHaveBeenCalledWith(60);
  });

  it("debería destruir WaveSurfer en cleanup", () => {
    const { unmount } = render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    unmount();

    expect(mockDestroy).toHaveBeenCalled();
  });

  it("debería recrear WaveSurfer cuando cambian los peaks (streaming progresivo)", () => {
    const mockPeaks1 = new Float32Array([0.5, 0.8]);
    mockUseWaveform.mockReturnValue({
      peaks: mockPeaks1,
      isLoading: false,
      error: null,
      progress: 0,
      cancel: vi.fn().mockResolvedValue(true),
    });

    const { rerender } = render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockLoad).toHaveBeenCalledWith("", [mockPeaks1], 180);

    // Simular peaks actualizados (streaming progresivo)
    const mockPeaks2 = new Float32Array([0.5, 0.8, 0.3, 0.6]);
    mockUseWaveform.mockReturnValue({
      peaks: mockPeaks2,
      isLoading: false,
      error: null,
      progress: 0,
      cancel: vi.fn().mockResolvedValue(true),
    });

    rerender(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: Debe destruir la instancia anterior y crear una nueva
    expect(mockDestroy).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockLoad).toHaveBeenCalledWith("", [mockPeaks2], 180);
  });

  it("debería tener el displayName correcto", () => {
    expect(WaveformViewer.name).toBe("WaveformViewer");
  });

  it("debería usar valores por defecto para props opcionales", () => {
    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: Verificar defaults: height=128, waveColor=#3b82f6, etc.
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        height: 128,
        waveColor: "#3b82f6",
        progressColor: "#1e40af",
      })
    );
  });

  it("no debería inicializar WaveSurfer si no hay peaks", () => {
    mockUseWaveform.mockReturnValue({
      peaks: null,
      isLoading: true,
      error: null,
      progress: 0.5,
      cancel: vi.fn().mockResolvedValue(true),
    });

    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: Sin peaks, no se debe crear WaveSurfer
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("no debería inicializar WaveSurfer si no hay duration", () => {
    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        // sin duration
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: Sin duration, no se puede cargar el waveform
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("no debería llamar a useWaveform si shouldGenerate es false", () => {
    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={false}
      />
    );

    // AIDEV-NOTE: Si shouldGenerate=false, pasa undefined a useWaveform
    expect(mockUseWaveform).toHaveBeenCalledWith(undefined, undefined, undefined);
  });

  it("debería mostrar error de codec no soportado", () => {
    mockUseWaveform.mockReturnValue({
      peaks: null,
      isLoading: false,
      error: "Failed to generate waveform: unsupported codec",
      progress: 0,
      cancel: vi.fn().mockResolvedValue(true),
    });

    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: Componente detecta "unsupported codec" y muestra mensaje específico
    expect(screen.getByText(/formato de audio no soportado/i)).toBeInTheDocument();
  });

  it("debería mostrar error genérico para otros errores", () => {
    mockUseWaveform.mockReturnValue({
      peaks: null,
      isLoading: false,
      error: "Unknown error occurred",
      progress: 0,
      cancel: vi.fn().mockResolvedValue(true),
    });

    render(
      <WaveformViewer
        trackId="test-uuid"
        trackPath="/test/song.mp3"
        duration={180}
        shouldGenerate={true}
      />
    );

    // AIDEV-NOTE: Para errores no específicos, muestra "❌ Error: {errorMessage}"
    expect(screen.getByText(/error:/i)).toBeInTheDocument();
    expect(screen.getByText(/unknown error occurred/i)).toBeInTheDocument();
  });
});
