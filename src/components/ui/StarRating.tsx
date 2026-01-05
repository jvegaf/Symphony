import type React from "react";
import { useState, memo } from "react";
import { cn } from "../../utils/cn";

export interface StarRatingProps {
  /**
   * Valor actual del rating (0-5)
   */
  value: number | null | undefined;

  /**
   * Callback cuando el rating cambia
   */
  onChange?: (rating: number) => void;

  /**
   * Si es de solo lectura (no se puede editar)
   */
  readOnly?: boolean;

  /**
   * Tamaño de las estrellas
   */
  size?: "sm" | "md" | "lg";

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
  className?: string;
}

/**
 * Componente de rating con estrellas
 * 
 * AIDEV-NOTE: Replica funcionalidad de StarRatingDelegate de Python/Qt
 * - Soporta rating de 0-5 estrellas
 * - Permite edición inline al hacer click
 * - Solo lectura cuando readOnly=true
 * - Compatible con backend Rust (valores 0-5)
 * 
 * CAMBIOS VISUALES v3:
 * - Tamaños reducidos: sm=16px, md=20px, lg=28px
 * - Estrellas juntas (gap-0) para vista compacta en tablas
 * - Estrellas vacías rellenas en gris para mejor visibilidad
 * - Color primario naranja (#fa8905) para estrellas llenas
 * - Hover corregido: solo rellena hasta la estrella sobre la que se hace hover
 * 
 * AIDEV-NOTE: Memoizado con React.memo para evitar re-renders innecesarios
 * en tablas con muchas filas. Solo se re-renderiza cuando value, onChange,
 * readOnly, size, color, maxStars o className cambian.
 * 
 * @example
 * ```tsx
 * <StarRating 
 *   value={track.rating} 
 *   onChange={(rating) => updateRating(track.id, rating)}
 * />
 * ```
 */
const StarRatingComponent: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  size = "md",
  color = "text-primary",  // Cambiado a text-primary por defecto
  maxStars = 5,
  className,
}) => {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  // Normalizar valor (null/undefined -> 0, clamp 0-5)
  const normalizedValue = Math.max(0, Math.min(value || 0, maxStars));

  // Determinar qué valor mostrar (hover o actual)
  const displayValue = hoveredStar !== null ? hoveredStar : normalizedValue;

  const sizeClasses = {
    sm: "w-4 h-4",  // 16px - pequeño para uso compacto
    md: "w-5 h-5",  // 20px - tamaño medio para tablas
    lg: "w-7 h-7",  // 28px - tamaño grande para detalles
  };

  const handleClick = (starIndex: number) => {
    if (readOnly || !onChange) return;

    // Si se hace click en la misma estrella, se pone en 0 (toggle)
    const newRating = starIndex === normalizedValue ? 0 : starIndex;
    onChange(newRating);
  };

  const handleMouseEnter = (starIndex: number) => {
    if (readOnly) return;
    setHoveredStar(starIndex);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoveredStar(null);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0",
        !readOnly && "cursor-pointer",
        className
      )}
      onMouseLeave={handleMouseLeave}
      role="slider"
      aria-label="Rating"
      aria-valuemin={0}
      aria-valuemax={maxStars}
      aria-valuenow={normalizedValue}
      aria-readonly={readOnly}
      tabIndex={readOnly ? undefined : 0}
    >
      {Array.from({ length: maxStars }, (_, index) => {
        const starNumber = index + 1;
        const isFilled = starNumber <= displayValue;

        return (
          <button
            key={`star-${starNumber}`}
            type="button"
            className={cn(
              "transition-all duration-150",
              sizeClasses[size],
              !readOnly && "hover:scale-110",
              readOnly && "cursor-default"
            )}
            onClick={() => handleClick(starNumber)}
            onMouseEnter={() => handleMouseEnter(starNumber)}
            disabled={readOnly}
            aria-label={`${starNumber} ${starNumber === 1 ? "star" : "stars"}`}
          >
            <StarFilledIcon
              className={cn(
                isFilled ? color : "text-gray-600 dark:text-gray-500",
                sizeClasses[size]
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

/**
 * Memoized StarRating - solo se re-renderiza cuando sus props cambian
 */
export const StarRating = memo(StarRatingComponent);
StarRating.displayName = "StarRating";

/**
 * Icono de estrella llena (SVG inline)
 * AIDEV-NOTE: Ahora se usa para estrellas llenas Y vacías,
 * diferenciándose solo por el color (primario vs gris)
 */
const StarFilledIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <title>Star</title>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
