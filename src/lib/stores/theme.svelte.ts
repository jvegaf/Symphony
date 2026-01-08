/**
 * Store para gestionar el tema (modo oscuro/claro)
 * Usa Svelte 5 runes ($state, $derived, $effect)
 * Persiste la preferencia en localStorage
 * 
 * @module lib/stores/theme
 * 
 * @example
 * import { theme, setTheme, toggleTheme } from '@/lib/stores/theme.svelte';
 * 
 * // En un componente:
 * <button onclick={toggleTheme}>
 *   Tema actual: {theme}
 * </button>
 * 
 * AIDEV-NOTE: Migrado de useTheme hook (React) a store (Svelte 5)
 * - useState → $state
 * - useEffect → $effect
 * - Hook returns → Exports directos
 * - Archivo .svelte.ts permite usar runes fuera de componentes
 */

export type Theme = 'light' | 'dark';

/**
 * Obtiene el tema inicial desde localStorage o preferencia del sistema
 */
function getInitialTheme(): Theme {
  // Intentar obtener del localStorage
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved) {
      return saved;
    }
  }
  
  // Si no hay guardado, usar preferencia del sistema
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // Fallback a dark (tema por defecto de Symphony)
  return 'dark';
}

// Estado reactivo del tema
let currentTheme = $state<Theme>(getInitialTheme());

/**
 * Efecto para sincronizar el tema con el DOM y localStorage
 * Se ejecuta automáticamente cuando currentTheme cambia
 */
$effect(() => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', currentTheme);
  }
});

/**
 * Getter reactivo del tema actual
 * Uso: const currentTheme = theme;
 */
export const theme = {
  get value() {
    return currentTheme;
  }
};

/**
 * Establece un nuevo tema
 * @param newTheme - 'light' o 'dark'
 */
export function setTheme(newTheme: Theme): void {
  currentTheme = newTheme;
}

/**
 * Alterna entre tema claro y oscuro
 */
export function toggleTheme(): void {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
}

/**
 * Verifica si el tema actual es oscuro
 * Uso: const dark = isDark();
 */
export function isDark(): boolean {
  return currentTheme === 'dark';
}

/**
 * Verifica si el tema actual es claro
 * Uso: const light = isLight();
 */
export function isLight(): boolean {
  return currentTheme === 'light';
}
