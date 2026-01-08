<script lang="ts">
  import { cn } from '@/utils/cn';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    class?: string;
    title?: string;
  }

  /**
   * Componente Card para agrupar contenido relacionado
   * 
   * @example
   * <Card title="Detalles">
   *   <p>Contenido de la tarjeta</p>
   * </Card>
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - ReactNode → Snippet
   * - className → class
   * - {title && ...} → {#if title}
   */
  let { children, class: className, title }: Props = $props();
</script>

<div
  class={cn(
    'bg-white dark:bg-slate-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800',
    className
  )}
>
  {#if title}
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
    </div>
  {/if}
  <div class="p-4">
    {@render children()}
  </div>
</div>
