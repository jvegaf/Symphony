<script lang="ts">
  import { RefreshCw } from 'lucide-svelte';

  /**
   * Estado visual durante carga de tracks
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - Componente sin estado, solo presentacional
   * - lucide-react → lucide-svelte
   * - className → class
   * - animate-spin funciona igual en Tailwind
   * 
   * @example
   * <LoadingState />
   */
</script>

<div class="flex items-center justify-center py-12">
  <RefreshCw class="animate-spin w-8 h-8 text-blue-500 dark:text-blue-400" />
  <span class="ml-3 text-gray-700 dark:text-gray-300">Loading tracks...</span>
</div>
