import { useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header, Sidebar, PlayerSection, TrackTable } from "./components/layout";
import { useGetAllTracks, useImportLibrary } from "./hooks/useLibrary";
import type { Track, ImportProgress } from "./types/library";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [activeTab, setActiveTab] = useState<"library" | "settings" | "import" | "export" | "tools">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    phase: "scanning"
  });

  const { data: tracks = [], isLoading } = useGetAllTracks();
  const importMutation = useImportLibrary();

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
          setImportProgress(prev => ({
            ...prev,
            current: Math.min(prev.current + 10, 90),
            phase: prev.current < 50 ? "scanning" : "importing"
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

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track);
  };

  const handleTrackDoubleClick = async (track: Track) => {
    try {
      // Play track
      await invoke("play_track", { trackId: track.id });
      setSelectedTrack(track);
    } catch (error) {
      console.error("Error al reproducir:", error);
    }
  };

  const filteredTracks = tracks.filter((track) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      (track.album && track.album.toLowerCase().includes(query))
    );
  });

  return (
    <ErrorBoundary>
      <div className="h-screen bg-background-dark flex flex-col overflow-hidden">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onImport={handleImport}
          isImporting={isImporting}
          progress={importProgress}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalTracks={tracks.length}
          />
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <PlayerSection track={selectedTrack} />
            
            <TrackTable
              tracks={filteredTracks}
              selectedTrack={selectedTrack}
              onTrackSelect={handleTrackSelect}
              onTrackDoubleClick={handleTrackDoubleClick}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
