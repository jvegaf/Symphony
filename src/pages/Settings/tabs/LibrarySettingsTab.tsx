import { open } from '@tauri-apps/plugin-dialog';
import { SettingsSection, SettingsToggle, SettingsSlider, MaintenanceActions } from '../components';
import type { AppSettings } from '../../../types/settings';

export interface LibrarySettingsTabProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onShowToast: (message: string) => void;
}

/**
 * Tab de configuración de Biblioteca
 * Incluye: Auto scan, carpeta de música, acciones de mantenimiento
 */
export const LibrarySettingsTab = ({ settings, onChange, onShowToast }: LibrarySettingsTabProps) => {
  return (
    <div className="w-full space-y-6">
      {/* Auto Scan Section */}
      <SettingsSection
        title="Escaneo Automático"
        gradientFrom="emerald"
        gradientTo="teal"
        icon={
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-labelledby="icon-scan">
            <title id="icon-scan">Escaneo automático</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }
      >
        <div className="space-y-6">
          {/* Auto Scan Toggle */}
          <SettingsToggle
            id="autoScan"
            label="Escanear al iniciar"
            description="Detecta automáticamente archivos nuevos al abrir Symphony"
            checked={settings.library.autoScanOnStartup}
            onChange={(checked) =>
              onChange({
                ...settings,
                library: { ...settings.library, autoScanOnStartup: checked },
              })
            }
            color="emerald"
          />

          {/* Scan Interval */}
          <SettingsSlider
            id="scanInterval"
            label="Intervalo de escaneo"
            value={settings.library.scanIntervalHours}
            onChange={(value) =>
              onChange({
                ...settings,
                library: { ...settings.library, scanIntervalHours: value },
              })
            }
            min={0}
            max={168}
            step={1}
            minLabel="0 (Desactivado)"
            maxLabel="168h (Semanal)"
            description="Frecuencia de búsqueda automática de archivos nuevos. 0 = desactivado"
            unit="h"
            color="emerald"
          />
        </div>
      </SettingsSection>

      {/* Music Folder Section */}
      <SettingsSection
        title="Carpeta de Música"
        gradientFrom="violet"
        gradientTo="purple"
        icon={
          <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-labelledby="icon-folder">
            <title id="icon-folder">Carpeta de música</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        }
      >
        <div className="space-y-3">
          <label htmlFor="musicFolder" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ubicación de tu biblioteca
          </label>
          <div className="flex space-x-2">
            <input
              id="musicFolder"
              type="text"
              value={settings.library.importFolder}
              readOnly
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-mono text-sm cursor-not-allowed"
              placeholder="Ninguna carpeta seleccionada"
            />
            <button
              type="button"
              onClick={async () => {
                const selected = await open({
                  directory: true,
                  multiple: false,
                  title: 'Seleccionar carpeta de música',
                  defaultPath: settings.library.importFolder || undefined,
                });
                if (selected && typeof selected === 'string') {
                  onChange({
                    ...settings,
                    library: { ...settings.library, importFolder: selected },
                  });
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-labelledby="btn-folder">
                <title id="btn-folder">Icono de carpeta</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Elegir</span>
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-labelledby="icon-info">
                <title id="icon-info">Información</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Symphony detectará automáticamente la organización por fecha de tus carpetas</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1 pl-5">
              <span>• Formato YYMM: carpetas como <code className="px-1 py-0.5 bg-gray-200 dark:bg-slate-800 rounded">2401</code> = Enero 2024</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1 pl-5">
              <span>• Mejora el ordenamiento por fecha de importación en la biblioteca</span>
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Maintenance Section */}
      <SettingsSection
        title="Mantenimiento"
        gradientFrom="sky"
        gradientTo="blue"
        icon={
          <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-labelledby="icon-maint">
            <title id="icon-maint">Mantenimiento</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      >
        <MaintenanceActions onShowToast={onShowToast} />
      </SettingsSection>
    </div>
  );
};
