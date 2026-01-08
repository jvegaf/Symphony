<script lang="ts">
  import { cn } from '@/utils/cn';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    label?: string;
    error?: string;
    class?: string;
    value?: string;
  }

  /**
   * Componente Input reutilizable con soporte para etiqueta y mensaje de error
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - React.InputHTMLAttributes → HTMLInputAttributes
   * - className → class
   * - {label && ...} → {#if label}
   * - htmlFor → for (Svelte usa 'for' estándar)
   * - value es $bindable para soportar bind:value en el padre
   * 
   * @example
   * <Input label="Nombre" error="Campo requerido" bind:value={name} />
   */
  let { 
    label, 
    error, 
    class: className, 
    id,
    value = $bindable(''),
    ...props 
  }: Props = $props();

  // Generar ID automático si no se proporciona
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label
      for={inputId}
      class="text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {label}
    </label>
  {/if}
  <input
    {id}
    bind:value
    class={cn(
      'px-3 py-2 rounded-md border bg-white dark:bg-slate-900',
      'border-gray-300 dark:border-gray-700',
      'text-gray-900 dark:text-gray-100',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error && 'border-red-500 focus:ring-red-500',
      className
    )}
    {...props}
  />
  {#if error}
    <p class="text-sm text-red-600 dark:text-red-400">{error}</p>
  {/if}
</div>
