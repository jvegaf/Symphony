<script lang="ts">
  import { cn } from '@/utils/cn';
  import type { BatchFixResult } from '@/types/beatport';

  interface Props {
    /** Resultado del proceso batch de Beatport */
    result: BatchFixResult;
    /** Callback para cerrar el modal */
    onClose: () => void;
    /** Mapa de track_id -> título para mostrar nombres */
    trackTitles?: Map<string, string>;
  }

  /**
   * Modal que muestra los resultados del proceso de Fix Tags con Beatport
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - React.FC<Props> → let { ...props } = $props()
   * - useState no necesario (sin estado interno)
   * - onClick={(e) => ...} → onclick={(e) => ...}
   * - className → class
   * - Material icons mantenidos (CSS global)
   * - filter() y map() funcionan igual en Svelte
   * 
   * Muestra un resumen y lista las canciones que no se pudieron encontrar.
   * 
   * @example
   * <BeatportResultsModal 
   *   result={batchResult} 
   *   onClose={() => showModal = false}
   *   trackTitles={trackTitlesMap}
   * />
   */
  let { 
    result,
    onClose,
    trackTitles,
  }: Props = $props();

  const failedResults = $derived(result.results.filter(r => !r.success));
  const successResults = $derived(result.results.filter(r => r.success));

  function getTrackTitle(trackId: string): string {
    return trackTitles?.get(trackId) ?? trackId;
  }
</script>

<div 
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
  role="presentation"
>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-3">
        <span class="material-icons text-primary">
          {result.failed_count === 0 ? 'check_circle' : 'info'}
        </span>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Resultados de Beatport
        </h2>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <span class="material-icons">close</span>
      </button>
    </div>

    <!-- Summary -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex gap-4">
        <div class={cn(
          "flex-1 rounded-lg p-3 text-center",
          "bg-green-50 dark:bg-green-900/20"
        )}>
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">
            {result.success_count}
          </div>
          <div class="text-sm text-green-700 dark:text-green-300">
            Encontradas
          </div>
        </div>
        <div class={cn(
          "flex-1 rounded-lg p-3 text-center",
          result.failed_count > 0 
            ? "bg-red-50 dark:bg-red-900/20" 
            : "bg-gray-50 dark:bg-gray-700/50"
        )}>
          <div class={cn(
            "text-2xl font-bold",
            result.failed_count > 0 
              ? "text-red-600 dark:text-red-400" 
              : "text-gray-400 dark:text-gray-500"
          )}>
            {result.failed_count}
          </div>
          <div class={cn(
            "text-sm",
            result.failed_count > 0 
              ? "text-red-700 dark:text-red-300" 
              : "text-gray-500 dark:text-gray-400"
          )}>
            No encontradas
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Canciones no encontradas -->
      {#if failedResults.length > 0}
        <div class="mb-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span class="material-icons text-red-500 text-base">error_outline</span>
            Canciones no encontradas en Beatport
          </h3>
          <div class="space-y-2">
            {#each failedResults as r (r.track_id)}
              <div class="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-md">
                <span class="material-icons text-red-400 text-sm mt-0.5">
                  music_off
                </span>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {getTrackTitle(r.track_id)}
                  </div>
                  {#if r.error}
                    <div class="text-xs text-red-600 dark:text-red-400 truncate">
                      {r.error}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Canciones encontradas (colapsable) -->
      {#if successResults.length > 0}
        <details class="group">
          <summary class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 cursor-pointer list-none">
            <span class="material-icons text-green-500 text-base transition-transform group-open:rotate-90">
              chevron_right
            </span>
            <span class="material-icons text-green-500 text-base">check_circle</span>
            Canciones actualizadas ({successResults.length})
          </summary>
          <div class="space-y-1 mt-2 ml-6">
            {#each successResults as r (r.track_id)}
              <div class="flex items-center gap-2 p-1.5 text-sm text-gray-600 dark:text-gray-400">
                <span class="material-icons text-green-400 text-sm">
                  music_note
                </span>
                <span class="truncate">{getTrackTitle(r.track_id)}</span>
                {#if r.tags_applied?.bpm}
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    • {r.tags_applied.bpm} BPM
                  </span>
                {/if}
                {#if r.tags_applied?.key}
                  <span class="text-xs text-gray-400 dark:text-gray-500">
                    • {r.tags_applied.key}
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        </details>
      {/if}

      <!-- Mensaje si todo fue exitoso -->
      {#if result.failed_count === 0 && result.success_count > 0}
        <div class="flex flex-col items-center justify-center py-4 text-center">
          <span class="material-icons text-green-500 text-4xl mb-2">
            celebration
          </span>
          <p class="text-gray-600 dark:text-gray-400">
            ¡Todas las canciones se actualizaron correctamente!
          </p>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
      <button
        type="button"
        onclick={onClose}
        class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Cerrar
      </button>
    </div>
  </div>
</div>
