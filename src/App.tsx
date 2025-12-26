import { useEffect, useMemo, useState } from "react";

import { open } from "@tauri-apps/plugin-dialog";

import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  Header,
  PlayerSection,
  Sidebar,
  TrackTable,
} from "./components/layout";
import type { SortColumn, SortDirection } from "./components/layout/TrackTable";
import { TrackDetail } from "./components/TrackDetail";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useGetAllTracks, useImportLibrary, useBatchFilenameToTags } from "./hooks/useLibrary";
import { usePlaybackQueue } from "./hooks/usePlaybackQueue";
import { usePlayerShortcuts } from "./hooks/usePlayerShortcuts";
import { Settings } from "./pages/Settings";
import type { ImportProgress, Track } from "./types/library";
import { logger } from "./utils/logger";
// AIDEV-NOTE: Import waveform debugger to expose window.debugWaveform()
// import "./utils/waveform-debug";

function App() {
  const [activeTab, setActiveTab] = useState<
    "library" | "settings" | "import" | "export" | "tools" | "benchmark"
  >("library");
  const [searchQuery, setSearchQuery] = useState("");
  // AIDEV-NOTE: selectedTracks ahora es un array para soportar multi-selección
  // (Ctrl+Click, Shift+Click) en la TrackTable
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  // AIDEV-NOTE: playingTrack es la pista que está reproduciéndose (double click)
  // selectedTracks son las pistas resaltadas en la tabla (single/multi click)
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
  const [trackDetailsId, setTrackDetailsId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    phase: "scanning",
  });
  // AIDEV-NOTE: Estado para barra de progreso de batch operations
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // AIDEV-NOTE: Estado de ordenamiento de TrackTable - levantado a App.tsx
  // para que no se pierda al navegar a Settings y volver
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: tracks = [], isLoading } = useGetAllTracks();
  const importMutation = useImportLibrary();
  const { play, pause, resume, isPlaying, seek, position, duration } = useAudioPlayer();
  const { mutate: batchFilenameToTags } = useBatchFilenameToTags();

  // AIDEV-NOTE: filteredTracks se calcula para la búsqueda en la tabla
  const filteredTracks = tracks.filter((track) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.album?.toLowerCase().includes(query)
    );
  });

  // AIDEV-NOTE: Mapa de ID -> Track para búsqueda rápida O(1)
  // Se usa en usePlayerShortcuts para obtener el track por ID desde la cola
  const tracksById = useMemo(() => {
    const map = new Map<string, Track>();
    for (const track of tracks) {
      if (track.id) {
        map.set(track.id, track);
      }
    }
    return map;
  }, [tracks]);

  // AIDEV-NOTE: Cola de reproducción - se genera al hacer doble click
  // Contiene los IDs desde la pista seleccionada hasta el final de la lista
  // NO se regenera al navegar con A/D, solo al doble click o cambio de orden
  const playbackQueue = usePlaybackQueue();

  // AIDEV-NOTE: Hook para atajos de navegación de pistas (A, D, S, W)
  // - A: Ir al inicio, doble pulsación en < 3seg → pista anterior (de la cola)
  // - D: Siguiente pista (de la cola)
  // - S: Avanzar 10 segundos
  // - W: Retroceder 10 segundos
  const { handleKeyPress, isShortcutKey } = usePlayerShortcuts({
    currentTrack: playingTrack,
    tracksById,
    position,
    duration,
    seek,
    play,
    onTrackChange: setPlayingTrack,
    queueNext: playbackQueue.next,
    queuePrevious: playbackQueue.previous,
    hasNext: playbackQueue.hasNext,
    hasPrevious: playbackQueue.hasPrevious,
  });

  // AIDEV-NOTE: Keyboard shortcuts para el reproductor
  // - Espacio: Pausar/Reanudar
  // - A/D/S/W: Navegación (ver usePlayerShortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Espacio: Pausar/Reanudar
      if (e.code === 'Space' && playingTrack) {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          resume();
        }
        return;
      }

      // Atajos de navegación (A, D, S, W)
      if (playingTrack && isShortcutKey(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playingTrack, isPlaying, pause, resume, handleKeyPress, isShortcutKey]);

  const handleImport = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecciona carpeta de música",
      });

      if (selected) {
        setIsImporting(true);
        setImportProgress({ current: 0, total: 100, phase: "scanning" });

        // Simulate progress (in real app, backend would emit progress events)
        const progressInterval = setInterval(() => {
          setImportProgress((prev) => ({
            ...prev,
            current: Math.min(prev.current + 10, 90),
            phase: prev.current < 50 ? "scanning" : "importing",
          }));
        }, 500);

        await importMutation.mutateAsync(selected);

        clearInterval(progressInterval);
        setImportProgress({ current: 100, total: 100, phase: "complete" });

        setTimeout(() => {
          setIsImporting(false);
          setImportProgress({ current: 0, total: 0, phase: "scanning" });
        }, 1000);
      }
    } catch (error) {
      console.error("Error al importar:", error);
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0, phase: "scanning" });
    }
  };

  // AIDEV-NOTE: handleTracksSelect maneja selección múltiple (Ctrl+Click, Shift+Click)
  const handleTracksSelect = (tracks: Track[]) => {
    setSelectedTracks(tracks);
  };

  // AIDEV-NOTE: handleBatchFilenameToTags actualiza metadatos desde nombre de archivo
  // para múltiples pistas seleccionadas (contextMenu en TrackTable)
  const handleBatchFilenameToTags = (tracks: Track[]) => {
    setBatchProgress({ current: 0, total: tracks.length });
    
    batchFilenameToTags(
      {
        tracks,
        onProgress: (current, total) => {
          setBatchProgress({ current, total });
        }
      },
      {
        onSuccess: (result) => {
          setBatchProgress(null);
          const message = result.failed === 0
            ? `✅ ${result.success} pistas actualizadas correctamente`
            : `✅ ${result.success} actualizadas\n❌ ${result.failed} fallaron\n\nErrores:\n${result.errors.join('\n')}`;
          alert(message);
        },
        onError: (error) => {
          setBatchProgress(null);
          alert(`❌ Error al actualizar pistas: ${error}`);
        }
      }
    );
  };

  /**
   * Handler para doble click en un track de la tabla
   * AIDEV-NOTE: Recibe sortedTracks (orden visual de la tabla) y el índice
   * para generar la cola de reproducción en el orden correcto
   */
  const handleTrackDoubleClick = async (track: Track, sortedTracks: Track[], index: number) => {
    const timestamp = new Date().toISOString();
    console.log(
      `%c[${timestamp}] ========== APP.TSX DOUBLE CLICK ==========`,
      "background: #ff0000; color: #fff; font-weight: bold; padding: 4px;",
    );
    console.log(
      `%c[${timestamp}] Track: ${track.title}`,
      "background: #0088ff; color: #fff; padding: 2px;",
    );
    console.log(
      `%c[${timestamp}] Path: ${track.path}`,
      "background: #0088ff; color: #fff; padding: 2px;",
    );

    await logger.info(
      `[${timestamp}] ========== APP.TSX DOUBLE CLICK ==========`,
    );
    await logger.info(`[${timestamp}] Track: ${track.title}`);
    await logger.info(`[${timestamp}] Path: ${track.path}`);

    // AIDEV-NOTE: Generar cola de reproducción usando sortedTracks (orden visual de la tabla)
    // El índice ya viene de la tabla, no necesitamos buscarlo
    playbackQueue.generateQueue(sortedTracks, index);
    console.log(
      `%c[${timestamp}] Cola generada desde índice ${index}, total: ${sortedTracks.length - index} pistas`,
      "background: #9900ff; color: #fff; padding: 2px;",
    );

    try {
      console.log(
        `%c[${timestamp}] Calling play() with path: ${track.path}`,
        "background: #00ff00; color: #000; padding: 2px;",
      );
      await logger.info(
        `[${timestamp}] Calling play() with path: ${track.path}`,
      );
      await play(track.path);
      // AIDEV-NOTE: Solo actualizar playingTrack (no selectedTrack) en double click
      // Esto hace que PlayerSection solo muestre info de la pista reproduciéndose
      setPlayingTrack(track);
      console.log(
        `%c[${timestamp}] ✅ Play successful`,
        "background: #00ff00; color: #000; font-weight: bold; padding: 4px;",
      );
      await logger.info(`[${timestamp}] ✅ Play successful`);
    } catch (error) {
      console.error(
        `%c[${timestamp}] ❌ Play failed: ${JSON.stringify(error)}`,
        "background: #ff0000; color: #fff; font-weight: bold; padding: 4px;",
      );
      await logger.error(
        `[${timestamp}] ❌ Play failed: ${JSON.stringify(error)}`,
      );
      console.error("Error al reproducir:", error);
    }
  };

  const handleTrackDetails = (track: Track) => {
    if (track.id) {
      setTrackDetailsId(track.id);
    }
  };

  return (
    <ErrorBoundary>
      <div
        className="h-screen bg-background-dark flex flex-col overflow-hidden relative"
        data-testid="app-root"
      >
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onImport={handleImport}
          isImporting={isImporting}
          progress={importProgress}
          selectedTracksCount={selectedTracks.length}
        />

        {/* AIDEV-NOTE: Usamos hidden en lugar de condicional para evitar desmontaje
            Esto preserva el estado del waveform cuando navegamos a Settings */}
        <div className={activeTab === "settings" ? "flex flex-1 overflow-hidden" : "hidden"}>
          <Settings />
        </div>

        <div className={activeTab !== "settings" ? "flex flex-1 overflow-hidden" : "hidden"}>
          <Sidebar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalTracks={tracks.length}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <PlayerSection 
              track={playingTrack} 
              tracks={filteredTracks}
              onTrackChange={setPlayingTrack}
            />

            <TrackTable
              tracks={filteredTracks}
              selectedTracks={selectedTracks}
              playingTrack={playingTrack}
              onTracksSelect={handleTracksSelect}
              onTrackDoubleClick={handleTrackDoubleClick}
              onTrackDetails={handleTrackDetails}
              onBatchFilenameToTags={handleBatchFilenameToTags}
              isLoading={isLoading}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortChange={(column, direction) => {
                setSortColumn(column);
                setSortDirection(direction);
              }}
              onSortedTracksChange={(sortedTracks, playingIndex) => {
                // AIDEV-NOTE: Regenerar cola de reproducción cuando cambia el orden
                // Esto mantiene la cola sincronizada con el orden visual de la tabla
                playbackQueue.generateQueue(sortedTracks, playingIndex);
              }}
            />
          </div>
        </div>

        {/* Modal de detalles del track */}
        {trackDetailsId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Track Details</h2>
                <button
                  type="button"
                  onClick={() => setTrackDetailsId(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              <TrackDetail 
                trackId={trackDetailsId} 
                tracks={filteredTracks}
                onNavigate={setTrackDetailsId}
              />
            </div>
          </div>
        )}

        {/* AIDEV-NOTE: Barra de progreso para operaciones batch (Filename→Tags) */}
        {batchProgress && (
          <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 min-w-[300px] z-50 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="material-icons text-primary animate-spin">sync</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Actualizando pistas...
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {batchProgress.current}/{batchProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
