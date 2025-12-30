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
import { BeatportResultsModal } from "./components/ui/BeatportResultsModal";
import { BeatportSelectionModal } from "./components/ui/BeatportSelectionModal";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useBeatport } from "./hooks/useBeatport";
import { useGetAllTracks, useImportLibrary, useBatchFilenameToTags } from "./hooks/library";
import { usePlaybackQueue } from "./hooks/usePlaybackQueue";
import { usePlayerShortcuts } from "./hooks/usePlayerShortcuts";
import { Settings } from "./pages/Settings";
import type { BatchFixResult, SearchCandidatesResult, TrackSelection } from "./types/beatport";
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
  // AIDEV-NOTE: Estado para modal de resultados de Beatport
  const [beatportResult, setBeatportResult] = useState<BatchFixResult | null>(null);
  // AIDEV-NOTE: Estado para modal de selección manual de candidatos de Beatport
  const [beatportCandidates, setBeatportCandidates] = useState<SearchCandidatesResult | null>(null);

  // AIDEV-NOTE: Estado de ordenamiento de TrackTable - levantado a App.tsx
  // para que no se pierda al navegar a Settings y volver
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: tracks = [], isLoading } = useGetAllTracks();
  const importMutation = useImportLibrary();
  const { play, pause, resume, isPlaying, seek, position, duration } = useAudioPlayer();
  const { mutate: batchFilenameToTags } = useBatchFilenameToTags();
  const { findArtwork, searchCandidates, applySelectedTags, progress: beatportProgress, isFixing, isSearching, isApplying } = useBeatport();

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
  // Solo actualiza pistas que coincidan con el patrón "Artista - Título"
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
          
          // Construir mensaje con información de skipped
          let message = '';
          if (result.failed === 0 && result.skipped === 0) {
            message = `✅ ${result.success} pistas actualizadas correctamente`;
          } else if (result.failed === 0) {
            message = `✅ ${result.success} pistas actualizadas\n⏭️ ${result.skipped} saltadas (sin patrón "Artista - Título")`;
          } else {
            message = `✅ ${result.success} actualizadas\n⏭️ ${result.skipped} saltadas (sin patrón)\n❌ ${result.failed} fallaron\n\nErrores:\n${result.errors.join('\n')}`;
          }
          alert(message);
        },
        onError: (error) => {
          setBatchProgress(null);
          alert(`❌ Error al actualizar pistas: ${error}`);
        }
      }
    );
  };

  // AIDEV-NOTE: handleFixTags ahora usa selección manual de candidatos
  // Fase 1: Busca candidatos en Beatport (hasta 4 por track)
  // Fase 2: El usuario selecciona la correcta en el modal
  // Fase 3: Se aplican los tags de las selecciones confirmadas
  const handleFixTags = (trackIds: string[]) => {
    searchCandidates.mutate(trackIds, {
      onSuccess: (result) => {
        // Mostrar modal de selección con los candidatos
        setBeatportCandidates(result);
      },
      onError: (error) => {
        alert(`❌ Error al buscar en Beatport: ${error}`);
      }
    });
  };

  // AIDEV-NOTE: Handler para cuando el usuario confirma sus selecciones en el modal
  const handleApplySelectedTags = (selections: TrackSelection[]) => {
    // Cerrar el modal de selección
    setBeatportCandidates(null);
    
    // Solo aplicar tags para selecciones que tienen un beatport_track_id (no "No está en Beatport")
    const validSelections = selections.filter(s => s.beatport_track_id !== null);
    
    if (validSelections.length === 0) {
      // Si no hay selecciones válidas, mostrar resultado vacío
      setBeatportResult({
        total: selections.length,
        success_count: 0,
        failed_count: selections.length,
        results: selections.map(s => ({
          track_id: s.local_track_id,
          success: false,
          error: "No seleccionado"
        }))
      });
      return;
    }
    
    applySelectedTags.mutate(validSelections, {
      onSuccess: (result) => {
        // Mostrar modal con resultados
        setBeatportResult(result);
      },
      onError: (error) => {
        alert(`❌ Error al aplicar tags: ${error}`);
      }
    });
  };

  // AIDEV-NOTE: handleFindArtwork busca SOLO artwork en Beatport (sin modificar otros tags)
  // Se invoca desde el context menu de TrackTable
  const handleFindArtwork = (trackIds: string[]) => {
    findArtwork.mutate(trackIds, {
      onSuccess: (result) => {
        // Mostrar modal con resultados (reutilizamos el mismo modal)
        setBeatportResult(result);
      },
      onError: (error) => {
        alert(`❌ Error al buscar artwork: ${error}`);
      }
    });
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
              onFixTags={handleFixTags}
              onFindArtwork={handleFindArtwork}
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
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="max-w-6xl w-full max-h-[95vh] overflow-auto rounded-lg">
              <TrackDetail 
                trackId={trackDetailsId} 
                tracks={filteredTracks}
                onNavigate={setTrackDetailsId}
                onFixTags={handleFixTags}
                onClose={() => setTrackDetailsId(null)}
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

        {/* AIDEV-NOTE: Notificación de progreso de Beatport (Fix Tags / Selección Manual) */}
        {(isFixing || isSearching || isApplying) && beatportProgress && (
          <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 min-w-[350px] z-50 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="material-icons text-primary animate-spin">sync</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {isSearching ? "Buscando candidatos..." : isApplying ? "Aplicando tags..." : `Completadas ${beatportProgress.current} de ${beatportProgress.total} Tracks`}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
                  {beatportProgress.phase === 'searching' && `Buscando: ${beatportProgress.current_track_title}`}
                  {beatportProgress.phase === 'downloading' && `Descargando artwork...`}
                  {beatportProgress.phase === 'applying_tags' && `Aplicando tags...`}
                  {beatportProgress.phase === 'complete' && `✅ Completado`}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(beatportProgress.current / beatportProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AIDEV-NOTE: Modal de selección manual de candidatos de Beatport */}
        {beatportCandidates && (
          <BeatportSelectionModal
            trackCandidates={beatportCandidates.tracks}
            onConfirm={handleApplySelectedTags}
            onCancel={() => setBeatportCandidates(null)}
          />
        )}

        {/* AIDEV-NOTE: Modal de resultados de Beatport (canciones no encontradas) */}
        {beatportResult && (
          <BeatportResultsModal
            result={beatportResult}
            onClose={() => setBeatportResult(null)}
            trackTitles={tracksById && new Map(
              Array.from(tracksById.entries()).map(([id, track]) => [id, `${track.title} - ${track.artist}`])
            )}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
