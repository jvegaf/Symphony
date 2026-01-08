<script lang="ts">
  import { Music } from 'lucide-svelte';

  /**
   * Estado visual cuando no hay tracks en la biblioteca
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - Componente sin estado, solo presentacional
   * - lucide-react → lucide-svelte
   * - className → class
   * 
   * @example
   * <EmptyState />
   */
</script>

<div class="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
  <Music class="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600" />
  <p class="text-lg">No tracks in library</p>
  <p class="text-sm mt-2">Import a library to get started</p>
</div>
