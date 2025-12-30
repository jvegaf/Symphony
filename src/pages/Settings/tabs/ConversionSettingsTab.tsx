import { SettingsSection, SettingsToggle } from '../components';
import type { AppSettings } from '../../../types/settings';

export interface ConversionSettingsTabProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

/**
 * Tab de configuración de Conversión MP3
 * Incluye: Habilitar conversión, auto-convert, bitrate, carpeta de salida, preservar estructura
 */
export const ConversionSettingsTab = ({ settings, onChange }: ConversionSettingsTabProps) => {
  const isEnabled = settings.conversion.enabled;

  return (
    <div className="w-full space-y-6">
      {/* General Settings */}
      <SettingsSection
        title="Conversión MP3"
        gradientFrom="cyan"
        gradientTo="blue"
        icon={
          <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        }
      >
        <div className="space-y-6">
          {/* Enable Conversion */}
          <SettingsToggle
            id="conversionEnabled"
            label="Habilitar conversión a MP3"
            description="Activa las opciones de conversión de audio"
            checked={isEnabled}
            onChange={(checked) =>
              onChange({
                ...settings,
                conversion: { ...settings.conversion, enabled: checked },
              })
            }
            color="cyan"
          />

          {/* Auto Convert */}
          <SettingsToggle
            id="autoConvert"
            label="Convertir automáticamente al importar"
            description="Genera versión MP3 al agregar pistas a la biblioteca"
            checked={settings.conversion.autoConvert}
            onChange={(checked) =>
              onChange({
                ...settings,
                conversion: { ...settings.conversion, autoConvert: checked },
              })
            }
            disabled={!isEnabled}
            color="cyan"
          />
        </div>
      </SettingsSection>

      {/* Quality Settings */}
      <SettingsSection
        title="Calidad de Exportación"
        gradientFrom="indigo"
        gradientTo="purple"
        icon={
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        }
      >
        <div className="space-y-3">
          <label htmlFor="bitrate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Bitrate MP3
          </label>
          <select
            id="bitrate"
            value={settings.conversion.bitrate}
            onChange={(e) =>
              onChange({
                ...settings,
                conversion: { ...settings.conversion, bitrate: Number(e.target.value) as 128 | 192 | 256 | 320 },
              })
            }
            disabled={!isEnabled}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="128">🎵 128 kbps (Básico)</option>
            <option value="192">🎧 192 kbps (Estándar)</option>
            <option value="256">💿 256 kbps (Alta)</option>
            <option value="320">💎 320 kbps (Máxima calidad)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>320 kbps ofrece la mejor calidad pero archivos más grandes</span>
          </p>
        </div>
      </SettingsSection>

      {/* Output Settings */}
      <SettingsSection
        title="Opciones de Salida"
        gradientFrom="pink"
        gradientTo="rose"
        icon={
          <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        }
      >
        <div className="space-y-6">
          {/* Output Folder */}
          <div className="space-y-3">
            <label htmlFor="outputFolder" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Carpeta de salida
            </label>
            <input
              id="outputFolder"
              type="text"
              value={settings.conversion.outputFolder}
              onChange={(e) =>
                onChange({
                  ...settings,
                  conversion: { ...settings.conversion, outputFolder: e.target.value },
                })
              }
              disabled={!isEnabled}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
              placeholder="/home/user/Música/MP3"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Carpeta donde se guardarán los archivos MP3 convertidos</span>
            </p>
          </div>

          {/* Preserve Structure */}
          <SettingsToggle
            id="preserveStructure"
            label="Preservar estructura de carpetas"
            description="Mantiene la misma organización de carpetas del archivo original"
            checked={settings.conversion.preserveStructure}
            onChange={(checked) =>
              onChange({
                ...settings,
                conversion: { ...settings.conversion, preserveStructure: checked },
              })
            }
            disabled={!isEnabled}
            color="pink"
          />
        </div>
      </SettingsSection>
    </div>
  );
};
