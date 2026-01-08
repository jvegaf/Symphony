<script lang="ts">
  import { cn } from '@/utils/cn';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary';
    children: Snippet;
    class?: string;
  }

  /**
   * Componente Button reutilizable
   * 
   * @example
   * <Button variant="primary" onclick={handleClick}>
   *   Hacer clic
   * </Button>
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - Props: React.ButtonHTMLAttributes → HTMLButtonAttributes + Snippet
   * - Children: ReactNode → Snippet (se renderiza con {@render})
   * - className → class (sintaxis de Svelte)
   */
  let {
    variant = 'primary',
    children,
    class: className,
    ...props
  }: Props = $props();

  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500',
  };
</script>

<button
  class={cn(baseStyles, variantStyles[variant], className)}
  {...props}
>
  {@render children()}
</button>
