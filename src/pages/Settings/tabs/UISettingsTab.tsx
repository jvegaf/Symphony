import { SettingsSection, SettingsSlider } from '../components';
import type { AppSettings } from '../../../types/settings';
import { useTheme } from '../../../hooks/useTheme';
import { useEffect } from 'react';

export interface UISettingsTabProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

/**
 * Tab de configuración de Interfaz de Usuario
 * Incluye: Tema, Idioma, Resolución de waveform
 */
export const UISettingsTab = ({ settings, onChange }: UISettingsTabProps) => {
  const { theme, setTheme } = useTheme();

  // Sincronizar el tema de settings con el hook useTheme
  useEffect(() => {
    const settingsTheme = settings.ui.theme;
    if (settingsTheme === 'system') {
      // Si es system, usar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    } else if (settingsTheme === 'light' || settingsTheme === 'dark') {
      setTheme(settingsTheme);
    }
  }, [settings.ui.theme, setTheme]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    // Actualizar settings
    onChange({
      ...settings,
      ui: { ...settings.ui, theme: newTheme },
    });
    
    // También aplicar inmediatamente al DOM
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    } else {
      setTheme(newTheme);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Theme Section */}
      <SettingsSection
        title="Apariencia"
        gradientFrom="purple"
        gradientTo="blue"
        icon={
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        }
      >
        <div className="space-y-6">
          {/* Theme */}
          <div className="space-y-3">
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tema de la aplicación
            </label>
            <select
              id="theme"
              data-testid="settings-theme-select"
              value={settings.ui.theme}
              onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              style={{ colorScheme: theme }}
            >
              <option value="system">🖥️ Usar tema del sistema</option>
              <option value="light">☀️ Modo claro</option>
              <option value="dark">🌙 Modo oscuro</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Cambia entre modo claro, oscuro o automático según tu sistema</span>
            </p>
          </div>

          {/* Language */}
          <div className="space-y-3">
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Idioma de la interfaz
            </label>
            <select
              id="language"
              value={settings.ui.language}
              onChange={(e) =>
                onChange({
                  ...settings,
                  ui: { ...settings.ui, language: e.target.value },
                })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              style={{ colorScheme: theme }}
            >
              <option value="es">🇪🇸 Español</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      {/* Waveform Section */}
      <SettingsSection
        title="Forma de Onda"
        gradientFrom="green"
        gradientTo="emerald"
        icon={
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        }
      >
        <SettingsSlider
          id="waveformResolution"
          label="Resolución"
          value={settings.ui.waveformResolution}
          onChange={(value) =>
            onChange({
              ...settings,
              ui: { ...settings.ui, waveformResolution: value },
            })
          }
          min={256}
          max={2048}
          step={256}
          minLabel="256 (Rápido)"
          maxLabel="2048 (Detallado)"
          description="Mayor resolución muestra más detalle pero consume más CPU"
          color="blue"
        />
      </SettingsSection>
    </div>
  );
};
