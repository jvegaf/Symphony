import { useEffect } from 'react';
import { useGetSetting } from './useSettings';
import { useTheme } from './useTheme';

/**
 * Hook para sincronizar el tema de los settings con el DOM
 * 
 * Lee el setting 'ui.theme' de la base de datos y aplica la clase
 * 'dark' o la remueve del elemento <html> según corresponda.
 * 
 * Debe usarse en el componente raíz de la aplicación (App.tsx)
 */
export function useThemeSync() {
  const { data: themeSetting, isLoading } = useGetSetting('ui.theme');
  const { setTheme } = useTheme();

  useEffect(() => {
    if (isLoading || !themeSetting) return;

    const themeValue = themeSetting.value as 'light' | 'dark' | 'system';
    
    if (themeValue === 'system') {
      // Usar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    } else {
      setTheme(themeValue);
    }
  }, [themeSetting, isLoading, setTheme]);

  // Listener para cambios en preferencia del sistema cuando theme='system'
  useEffect(() => {
    if (isLoading || !themeSetting) return;
    
    const themeValue = themeSetting.value as string;
    if (themeValue !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeSetting, isLoading, setTheme]);
}
