import { SettingsSection, SettingsSlider } from '../components';
import type { AppSettings } from '../../../types/settings';

export interface AudioSettingsTabProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

/**
 * Tab de configuración de Audio
 * Incluye: Dispositivo de salida, Sample rate, Buffer size
 */
export const AudioSettingsTab = ({ settings, onChange }: AudioSettingsTabProps) => {
  return (
    <div className="space-y-6">
      {/* Audio Device Section */}
      <SettingsSection
        title="Dispositivo de Audio"
        gradientFrom="orange"
        gradientTo="red"
        icon={
          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        }
      >
        <div className="space-y-3">
          <label htmlFor="outputDevice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Dispositivo de salida
          </label>
          <input
            id="outputDevice"
            type="text"
            value={settings.audio.outputDevice}
            onChange={(e) =>
              onChange({
                ...settings,
                audio: { ...settings.audio, outputDevice: e.target.value },
              })
            }
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="default"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Deja "default" para usar el dispositivo por defecto del sistema</span>
          </p>
        </div>
      </SettingsSection>

      {/* Audio Quality Section */}
      <SettingsSection
        title="Calidad de Audio"
        gradientFrom="blue"
        gradientTo="cyan"
        icon={
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        }
      >
        <div className="space-y-6">
          {/* Sample Rate */}
          <div className="space-y-3">
            <label htmlFor="sampleRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tasa de muestreo
            </label>
            <select
              id="sampleRate"
              value={settings.audio.sampleRate}
              onChange={(e) =>
                onChange({
                  ...settings,
                  audio: { ...settings.audio, sampleRate: Number(e.target.value) as 44100 | 48000 | 96000 },
                })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="44100">🎵 44.1 kHz (Calidad CD)</option>
              <option value="48000">🎧 48 kHz (Estándar)</option>
              <option value="96000">💎 96 kHz (Alta Resolución)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Mayor tasa de muestreo = mejor calidad (44.1 kHz es suficiente para la mayoría)</span>
            </p>
          </div>

          {/* Buffer Size */}
          <SettingsSlider
            id="bufferSize"
            label="Tamaño de buffer"
            value={settings.audio.bufferSize}
            onChange={(value) =>
              onChange({
                ...settings,
                audio: { ...settings.audio, bufferSize: value },
              })
            }
            min={512}
            max={8192}
            step={512}
            minLabel="512 (Baja latencia)"
            maxLabel="8192 (Más estable)"
            description="Menor = menos latencia pero puede tener cortes. Mayor = más estabilidad"
            unit=" samples"
            color="blue"
          />
        </div>
      </SettingsSection>
    </div>
  );
};
