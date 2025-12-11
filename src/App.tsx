import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "./components/ui/Button";
import { useTheme } from "./hooks/useTheme";
import { Library } from "./pages/Library";
import { Player } from "./pages/Player";

// Crear cliente de TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type View = "library" | "player";

function App() {
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>("library");
  const [selectedTrackId] = useState<number | undefined>();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-white dark:bg-slate-950 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentView("library")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  currentView === "library"
                    ? "bg-primary-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                📚 Biblioteca
              </button>
              <button
                onClick={() => setCurrentView("player")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  currentView === "player"
                    ? "bg-primary-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                🎧 Reproductor
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                🎵 Symphony
              </span>
              <Button variant="secondary" onClick={toggleTheme}>
                {theme === "dark" ? "☀️" : "🌙"}
              </Button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === "library" && <Library />}
          {currentView === "player" && <Player trackId={selectedTrackId} />}
        </div>

        {/* Footer / Status Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 px-6 py-2">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Symphony v0.3.0 - Biblioteca Musical Profesional</span>
            <span>
              Milestone 2 completado • 222 tests • 80%+ cobertura
            </span>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
