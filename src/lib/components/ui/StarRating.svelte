<script lang="ts">
  import { cn } from '@/utils/cn';

  interface Props {
    /**
     * Valor actual del rating (0-5)
     */
    value: number | null | undefined;

    /**
     * Callback cuando el rating cambia
     */
    onchange?: (rating: number) => void;

    /**
     * Si es de solo lectura (no se puede editar)
     */
    readOnly?: boolean;

    /**
     * Tamaño de las estrellas
     */
    size?: 'sm' | 'md' | 'lg';

    /**
     * Color de las estrellas llenas
     */
    color?: string;

    /**
     * Número máximo de estrellas
     */
    maxStars?: number;

    /**
     * Clases CSS adicionales
     */
    class?: string;
  }

  /**
   * Componente de rating con estrellas
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - useState(hoveredStar) → let hoveredStar = $state(null)
   * - memo() → No necesario en Svelte (reactividad automática)
   * - onChange → onchange (lowercase en Svelte)
   * - onMouseEnter/onMouseLeave → onmouseenter/onmouseleave
   * - Array.from() → {#each Array(maxStars)}
   * 
   * Replica funcionalidad de StarRatingDelegate de Python/Qt
   * - Soporta rating de 0-5 estrellas
   * - Permite edición inline al hacer click
   * - Solo lectura cuando readOnly=true
   * - Compatible con backend Rust (valores 0-5)
   * 
   * @example
   * <StarRating 
   *   value={track.rating} 
   *   onchange={(rating) => updateRating(track.id, rating)}
   * />
   */
  let {
    value,
    onchange,
    readOnly = false,
    size = 'md',
    color = 'text-primary',
    maxStars = 5,
    class: className,
  }: Props = $props();

  // Estado reactivo para hover
  let hoveredStar = $state<number | null>(null);

  // Normalizar valor (null/undefined -> 0, clamp 0-5)
  const normalizedValue = $derived(Math.max(0, Math.min(value || 0, maxStars)));

  // Determinar qué valor mostrar (hover o actual)
  const displayValue = $derived(hoveredStar !== null ? hoveredStar : normalizedValue);

  const sizeClasses = {
    sm: 'w-4 h-4',  // 16px - pequeño para uso compacto
    md: 'w-5 h-5',  // 20px - tamaño medio para tablas
    lg: 'w-7 h-7',  // 28px - tamaño grande para detalles
  };

  function handleClick(starIndex: number) {
    if (readOnly || !onchange) return;

    // Si se hace click en la misma estrella, se pone en 0 (toggle)
    const newRating = starIndex === normalizedValue ? 0 : starIndex;
    onchange(newRating);
  }

  function handleMouseEnter(starIndex: number) {
    if (readOnly) return;
    hoveredStar = starIndex;
  }

  function handleMouseLeave() {
    if (readOnly) return;
    hoveredStar = null;
  }
</script>

<div
  class={cn(
    'flex items-center gap-0',
    !readOnly && 'cursor-pointer',
    className
  )}
  onmouseleave={handleMouseLeave}
  role="slider"
  aria-label="Rating"
  aria-valuemin={0}
  aria-valuemax={maxStars}
  aria-valuenow={normalizedValue}
  aria-readonly={readOnly}
  tabindex={readOnly ? undefined : 0}
>
  {#each Array.from({ length: maxStars }, (_, i) => i + 1) as starNumber}
    {@const isFilled = starNumber <= displayValue}
    <button
      type="button"
      class={cn(
        'transition-all duration-150',
        sizeClasses[size],
        !readOnly && 'hover:scale-110',
        readOnly && 'cursor-default'
      )}
      onclick={() => handleClick(starNumber)}
      onmouseenter={() => handleMouseEnter(starNumber)}
      disabled={readOnly}
      aria-label="{starNumber} {starNumber === 1 ? 'star' : 'stars'}"
    >
      <!-- Star Icon SVG -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        class={cn(
          isFilled ? color : 'text-gray-600 dark:text-gray-500',
          sizeClasses[size]
        )}
        aria-hidden="true"
      >
        <title>Star</title>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  {/each}
</div>
