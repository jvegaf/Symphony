import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

/**
 * Hook para gestionar el tema (modo oscuro/claro)
 * Persiste la preferencia en localStorage
 * 
 * @returns Objeto con el tema actual y función para cambiarlo
 * 
 * @example
 * const { theme, setTheme } = useTheme();
 * <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
 *   Cambiar tema
 * </button>
 */
export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Intentar obtener del localStorage
    const saved = localStorage.getItem('theme') as Theme | null;
    
    // Si no hay guardado, usar preferencia del sistema
    if (!saved) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    return saved;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return { theme, setTheme, toggleTheme };
};
