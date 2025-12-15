import type { ImportProgress } from "../../types/library";

type Tab = "library" | "settings" | "import" | "export" | "tools" | "benchmark";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onImport: () => void;
  isImporting: boolean;
  progress: ImportProgress;
}

export const Header = ({
  activeTab,
  onTabChange,
  onImport,
  isImporting,
  progress,
}: HeaderProps) => {
  const tabs: { id: Tab; label: string }[] = [
    { id: "library", label: "Library" },
    { id: "benchmark", label: "🔬 Benchmark" },
    { id: "settings", label: "Settings" },
    { id: "import", label: "Import" },
    { id: "export", label: "Export" },
    { id: "tools", label: "Tools" },
  ];

  const progressPercent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <header className="flex items-center justify-between bg-white/5 dark:bg-gray-800/50 p-2 border-b border-gray-200/10 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
      {/* Left: Status */}
      <div className="flex items-center space-x-2 min-w-[150px]">
        {isImporting ? (
          <span>
            {progress.phase === "scanning" && "Escaneando..."}
            {progress.phase === "importing" && `Importando ${progress.current}/${progress.total}`}
            {progress.phase === "complete" && "¡Completado!"}
          </span>
        ) : (
          <span>Symphony</span>
        )}
      </div>

      {/* Center: Tabs */}
      <div className="flex items-center space-x-4">
        <div className="flex">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
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
          <div className="w-24 h-2 bg-gray-200/20 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
        <span className="material-icons text-base cursor-pointer hover:text-gray-300">remove</span>
        <span className="material-icons text-base cursor-pointer hover:text-gray-300">check_box_outline_blank</span>
        <span className="material-icons text-base cursor-pointer hover:text-gray-300">close</span>
      </div>
    </header>
  );
};
