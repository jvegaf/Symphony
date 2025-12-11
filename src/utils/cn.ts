import { type ClassValue, clsx } from 'clsx';

/**
 * Utilidad para combinar clases CSS de Tailwind
 * @param inputs - Array de clases CSS o condicionales
 * @returns String con clases combinadas
 * 
 * @example
 * cn('base-class', isActive && 'active-class', className)
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
