interface SidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalTracks: number;
}

export const Sidebar = ({ searchQuery, onSearchChange, totalTracks }: SidebarProps) => {
  return (
    <aside className="w-64 bg-gray-100/30 dark:bg-gray-900/40 p-4 space-y-4 flex-shrink-0">
      {/* Search */}
      <div className="relative">
        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-gray-200/50 dark:bg-gray-800/60 border-none rounded pl-10 pr-3 py-2 text-sm focus:ring-primary focus:ring-1 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Search... All Tracks"
        />
      </div>

      {/* Navigation */}
      <nav className="space-y-1 text-sm">
        <a
          href="#"
          className="flex justify-between items-center px-3 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
        >
          <span>Queue</span>
        </a>
        <a
          href="#"
          className="flex justify-between items-center px-3 py-1.5 rounded bg-gray-200/50 dark:bg-gray-700/50 font-semibold text-gray-800 dark:text-gray-200"
        >
          <span>All Tracks [{totalTracks}]</span>
          <span className="material-icons text-primary text-lg">equalizer</span>
        </a>
        <a
          href="#"
          className="flex justify-between items-center px-3 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
        >
          <span>Recently Added [{totalTracks}]</span>
        </a>
        <a
          href="#"
          className="flex justify-between items-center px-3 py-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
        >
          <span>
            Watch Folder <span className="text-gray-500">[Inactive]</span>
          </span>
        </a>
      </nav>

      <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-2" />

      {/* Playlists */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
            Playlists
          </h3>
          <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <span className="material-icons text-lg">add</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 px-3">
          No hay playlists
        </p>
      </div>
    </aside>
  );
};
