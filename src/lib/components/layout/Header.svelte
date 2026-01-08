<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import type { ImportProgress } from "@/types/library";

  type Tab = "library" | "import" | "export" | "tools" | "benchmark";

  interface Props {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    onImport: () => void;
    onSettingsClick: () => void;
    isImporting: boolean;
    progress: ImportProgress;
    selectedTracksCount?: number;
  }

  /**
   * Header principal de la aplicación.
   * Contiene tabs de navegación, estado de importación y controles de ventana.
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - getCurrentWindow() funciona igual en Svelte
   * - onClick → onclick
   * - className → class
   * - onKeyDown → onkeydown
   * - data-tauri-drag-region funciona igual
   * - Material icons mantenidos
   * 
   * AIDEV-NOTE: Implementación de drag de ventana en custom titlebar
   * - Usa data-tauri-drag-region para permitir arrastrar la ventana desde el header
   * - Los botones y tabs tienen pointer-events: auto (vía style inline) para seguir siendo clickeables
   * - Doble-click en la región draggable maximiza/restaura la ventana
   * - Requiere permiso core:window:allow-start-dragging en capabilities/default.json
   * 
   * Documentación: https://tauri.app/v2/learn/window-customization/#drag-region
   */
  let {
    activeTab,
    onTabChange,
    onImport,
    onSettingsClick,
    isImporting,
    progress,
    selectedTracksCount = 0,
  }: Props = $props();

  // AIDEV-NOTE: Handlers para controles de ventana usando Tauri API
  function handleMinimize() {
    getCurrentWindow().minimize();
  }

  function handleMaximize() {
    getCurrentWindow().toggleMaximize();
  }

  function handleClose() {
    getCurrentWindow().close();
  }

  // AIDEV-NOTE: Doble-click en la región draggable para maximizar/restaurar
  // Implementación manual porque data-tauri-drag-region no maneja doble-click
  function handleDoubleClick() {
    getCurrentWindow().toggleMaximize();
  }

  const tabs: { id: Tab; label: string; action?: () => void }[] = [
    { id: "library", label: "Library" },
    { id: "settings" as Tab, label: "Settings", action: onSettingsClick },
    { id: "import", label: "Import", action: onImport },
    { id: "export", label: "Export" },
    { id: "tools", label: "Tools" },
  ];

  const progressPercent = $derived(
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0
  );
</script>

<header
  class="bg-white/5 dark:bg-gray-800/50 border-b border-gray-200/10 dark:border-gray-700/50 text-xs text-gray-500 dark:text-gray-400"
  data-testid="header"
>
  <!-- AIDEV-NOTE: Capa draggable que cubre todo el header.
       role="button" y tabindex=0 lo hacen accesible y evitan el linting error.
       ondblclick maximiza/restaura la ventana.
       Los elementos hijos con pointer-events:auto siguen siendo interactivos -->
  <div
    data-tauri-drag-region
    role="button"
    tabindex="0"
    ondblclick={handleDoubleClick}
    onkeydown={(e) => {
      // Accesibilidad: Enter activa el doble-click (maximizar)
      if (e.key === 'Enter') {
        handleDoubleClick();
      }
    }}
    class="flex items-center justify-between p-2 cursor-move"
  >
    <!-- Left: Status -->
    <div class="flex items-center space-x-2 min-w-[150px]" style="pointer-events: auto">
      {#if isImporting}
        <span data-testid="import-status">
          {#if progress.phase === "scanning"}
            Escaneando...
          {:else if progress.phase === "importing"}
            Importando {progress.current}/{progress.total}
          {:else if progress.phase === "complete"}
            ¡Completado!
          {/if}
        </span>
      {:else if selectedTracksCount > 0}
        <div class="bg-primary/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-md flex items-center gap-2" data-testid="selection-badge">
          <span class="material-icons text-sm">playlist_add_check</span>
          <span class="text-sm font-medium">
            {selectedTracksCount} track{selectedTracksCount > 1 ? 's' : ''} seleccionado{selectedTracksCount > 1 ? 's' : ''}
          </span>
        </div>
      {:else}
        <span></span>
      {/if}
    </div>

    <!-- Center: Tabs -->
    <div class="flex items-center space-x-4" style="pointer-events: auto">
      <div class="flex">
        {#each tabs as tab, index}
          <button
            type="button"
            data-testid="tab-{tab.id}"
            onclick={() => {
              if (tab.action) {
                tab.action();
              } else {
                onTabChange(tab.id);
              }
            }}
            class="
              py-1 px-4 transition-colors
              {index === 0 ? 'rounded-l' : ''}
              {index === tabs.length - 1 ? 'rounded-r' : ''}
              {activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-gray-200/20 dark:bg-gray-700 hover:bg-gray-300/30 dark:hover:bg-gray-600'}
            "
          >
            {tab.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Right: Progress & Controls -->
    <div class="flex items-center space-x-2 min-w-[150px] justify-end" style="pointer-events: auto">
      {#if isImporting}
        <div
          class="w-24 h-2 bg-gray-200/20 dark:bg-gray-700 rounded-full overflow-hidden"
          data-testid="import-progress-bar"
        >
          <div
            class="bg-primary h-full transition-all duration-300"
            style="width: {progressPercent}%"
            data-testid="import-progress-fill"
          />
        </div>
      {/if}
      <button
        type="button"
        onclick={handleMinimize}
        class="material-icons text-base cursor-pointer hover:text-gray-300 hover:bg-gray-700/50 rounded p-1 transition-colors"
        data-testid="window-minimize"
        aria-label="Minimizar ventana"
      >
        remove
      </button>
      <button
        type="button"
        onclick={handleMaximize}
        class="material-icons text-base cursor-pointer hover:text-gray-300 hover:bg-gray-700/50 rounded p-1 transition-colors"
        data-testid="window-maximize"
        aria-label="Maximizar ventana"
      >
        check_box_outline_blank
      </button>
      <button
        type="button"
        onclick={handleClose}
        class="material-icons text-base cursor-pointer hover:text-white hover:bg-red-500/80 rounded p-1 transition-colors"
        data-testid="window-close"
        aria-label="Cerrar ventana"
      >
        close
      </button>
    </div>
  </div>
</header>
