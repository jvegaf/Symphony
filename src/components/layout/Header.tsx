import { getCurrentWindow } from "@tauri-apps/api/window";

import type { ImportProgress } from "../../types/library";

type Tab = "library" | "settings" | "import" | "export" | "tools" | "benchmark";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onImport: () => void;
  isImporting: boolean;
  progress: ImportProgress;
  selectedTracksCount?: number;
}

/**
 * Header principal de la aplicación.
 * Contiene tabs de navegación, estado de importación y controles de ventana.
 * AIDEV-NOTE: Los controles de ventana (minimize, maximize, close) usan la API
 * de Tauri getCurrentWindow() para controlar la ventana nativa.
 */
export const Header = ({
  activeTab,
  onTabChange,
  onImport,
  isImporting,
  progress,
  selectedTracksCount = 0,
}: HeaderProps) => {
  // AIDEV-NOTE: Handlers para controles de ventana usando Tauri API
  const handleMinimize = () => {
    getCurrentWindow().minimize();
  };

  const handleMaximize = () => {
    getCurrentWindow().toggleMaximize();
  };

  const handleClose = () => {
    getCurrentWindow().close();
  };
  const tabs: { id: Tab; label: string }[] = [
    { id: "library", label: "Library" },
    { id: "settings", label: "Settings" },
    { id: "import", label: "Import" },
    { id: "export", label: "Export" },
    { id: "tools", label: "Tools" },
  ];

  const progressPercent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <header
      className="flex items-center justify-between bg-white/5 dark:bg-gray-800/50 p-2 border-b border-gray-200/10 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400"
      data-testid="header"
    >
      {/* Left: Status */}
      <div className="flex items-center space-x-2 min-w-[150px]">
        {isImporting ? (
          <span data-testid="import-status">
            {progress.phase === "scanning" && "Escaneando..."}
            {progress.phase === "importing" &&
              `Importando ${progress.current}/${progress.total}`}
            {progress.phase === "complete" && "¡Completado!"}
          </span>
        ) : selectedTracksCount > 0 ? (
          <div className="bg-primary/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-md flex items-center gap-2" data-testid="selection-badge">
            <span className="material-icons text-sm">playlist_add_check</span>
            <span className="text-sm font-medium">
              {selectedTracksCount} track{selectedTracksCount > 1 ? 's' : ''} seleccionado{selectedTracksCount > 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <span></span>
        )}
      </div>

      {/* Center: Tabs */}
      <div className="flex items-center space-x-4">
        <div className="flex">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`tab-${tab.id}`}
              onClick={() => {
                if (tab.id === "import") {
                  onImport();
                } else {
                  onTabChange(tab.id);
                }
              }}
              className={`
                py-1 px-4 transition-colors
                ${index === 0 ? "rounded-l" : ""}
                ${index === tabs.length - 1 ? "rounded-r" : ""}
                ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "bg-gray-200/20 dark:bg-gray-700 hover:bg-gray-300/30 dark:hover:bg-gray-600"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Progress & Controls */}
      <div className="flex items-center space-x-2 min-w-[150px] justify-end">
        {isImporting && (
          <div
            className="w-24 h-2 bg-gray-200/20 dark:bg-gray-700 rounded-full overflow-hidden"
            data-testid="import-progress-bar"
          >
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
              data-testid="import-progress-fill"
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleMinimize}
          className="material-icons text-base cursor-pointer hover:text-gray-300 hover:bg-gray-700/50 rounded p-1 transition-colors"
          data-testid="window-minimize"
          aria-label="Minimizar ventana"
        >
          remove
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="material-icons text-base cursor-pointer hover:text-gray-300 hover:bg-gray-700/50 rounded p-1 transition-colors"
          data-testid="window-maximize"
          aria-label="Maximizar ventana"
        >
          check_box_outline_blank
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="material-icons text-base cursor-pointer hover:text-white hover:bg-red-500/80 rounded p-1 transition-colors"
          data-testid="window-close"
          aria-label="Cerrar ventana"
        >
          close
        </button>
      </div>
    </header>
  );
};
