import { SettingsSection, SettingsToggle, SettingsSlider, MaintenanceActions } from '../components';
import type { AppSettings } from '../../../types/settings';

export interface LibrarySettingsTabProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onShowToast: (message: string) => void;
}

/**
 * Tab de configuración de Biblioteca
 * Incluye: Auto scan, carpeta de importación, acciones de mantenimiento
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
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Import Folder Section */}
      <SettingsSection
        title="Carpeta de Importación"
        gradientFrom="violet"
        gradientTo="purple"
        icon={
          <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        }
      >
        <div className="space-y-3">
          <label htmlFor="importFolder" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ruta predeterminada
          </label>
          <input
            id="importFolder"
            type="text"
            value={settings.library.importFolder}
            onChange={(e) =>
              onChange({
                ...settings,
                library: { ...settings.library, importFolder: e.target.value },
              })
            }
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all font-mono text-sm"
            placeholder="/home/user/Música"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Carpeta que se abrirá por defecto al importar música</span>
          </p>
        </div>
      </SettingsSection>

      {/* Maintenance Section */}
      <SettingsSection
        title="Mantenimiento"
        gradientFrom="sky"
        gradientTo="blue"
        icon={
          <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
