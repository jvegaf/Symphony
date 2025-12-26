import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Toast } from '../components/Toast';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

import { useSettings } from '../hooks/useSettings';
import { DEFAULT_SETTINGS } from '../types/settings';

type TabId = 'ui' | 'audio' | 'library' | 'conversion';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'ui', label: 'Interfaz', icon: '🎨' },
  { id: 'audio', label: 'Audio', icon: '🔊' },
  { id: 'library', label: 'Biblioteca', icon: '📚' },
  { id: 'conversion', label: 'Conversión', icon: '🔄' },
];

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<TabId>('ui');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const { settings, isLoading, error, updateSettings, resetSettings, isUpdating, isResetting } = useSettings();

  // Local state para edición
  const [localSettings, setLocalSettings] = useState(settings ?? DEFAULT_SETTINGS);

  // Actualizar local state cuando cambien los settings del servidor
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!localSettings) return;

    // Convertir AppSettings a array de updates
    const updates: Array<{ key: string; value: unknown; valueType: 'string' | 'number' | 'boolean' }> = [];

    // UI settings
    updates.push(
      { key: 'ui.theme', value: localSettings.ui.theme, valueType: 'string' },
      { key: 'ui.language', value: localSettings.ui.language, valueType: 'string' },
      { key: 'ui.waveform_resolution', value: localSettings.ui.waveformResolution, valueType: 'number' }
    );

    // Audio settings
    updates.push(
      { key: 'audio.output_device', value: localSettings.audio.outputDevice, valueType: 'string' },
      { key: 'audio.sample_rate', value: localSettings.audio.sampleRate, valueType: 'number' },
      { key: 'audio.buffer_size', value: localSettings.audio.bufferSize, valueType: 'number' }
    );

    // Library settings
    updates.push(
      { key: 'library.auto_scan_on_startup', value: localSettings.library.autoScanOnStartup, valueType: 'boolean' },
      { key: 'library.scan_interval_hours', value: localSettings.library.scanIntervalHours, valueType: 'number' },
      { key: 'library.import_folder', value: localSettings.library.importFolder, valueType: 'string' }
    );

    // Conversion settings
    updates.push(
      { key: 'conversion.enabled', value: localSettings.conversion.enabled, valueType: 'boolean' },
      { key: 'conversion.auto_convert', value: localSettings.conversion.autoConvert, valueType: 'boolean' },
      { key: 'conversion.bitrate', value: localSettings.conversion.bitrate, valueType: 'number' },
      { key: 'conversion.output_folder', value: localSettings.conversion.outputFolder, valueType: 'string' },
      { key: 'conversion.preserve_structure', value: localSettings.conversion.preserveStructure, valueType: 'boolean' }
    );

    updateSettings(updates, {
      onSuccess: () => {
        setToastMessage('✅ Configuración guardada exitosamente');
        setShowToast(true);
      },
      onError: (error) => {
        setToastMessage(`❌ Error al guardar: ${error}`);
        setShowToast(true);
      },
    });
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que quieres resetear todos los ajustes a sus valores por defecto?')) {
      resetSettings(undefined, {
        onSuccess: () => {
          setLocalSettings(DEFAULT_SETTINGS);
          setToastMessage('✅ Configuración reseteada a valores por defecto');
          setShowToast(true);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-950">
        <div className="text-gray-600 dark:text-gray-400">Cargando configuración...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 font-semibold mb-2">Error al cargar configuración:</div>
          <div className="text-gray-600 dark:text-gray-400">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white dark:bg-slate-950 flex flex-col" data-testid="settings-page">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">⚙️ Configuración</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Personaliza la aplicación según tus preferencias
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-6">
        <nav className="flex space-x-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-3 px-4 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {activeTab === 'ui' && (
            <UISettingsTab settings={localSettings} onChange={setLocalSettings} />
          )}
          {activeTab === 'audio' && (
            <AudioSettingsTab settings={localSettings} onChange={setLocalSettings} />
          )}
          {activeTab === 'library' && (
            <LibrarySettingsTab 
              settings={localSettings} 
              onChange={setLocalSettings}
              onShowToast={(message) => {
                setToastMessage(message);
                setShowToast(true);
              }}
            />
          )}
          {activeTab === 'conversion' && (
            <ConversionSettingsTab settings={localSettings} onChange={setLocalSettings} />
          )}

          {/* Action Buttons */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={handleReset} disabled={isResetting} data-testid="settings-reset-button">
                {isResetting ? '⏳ Reseteando...' : '🔄 Resetear a valores por defecto'}
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={isUpdating} data-testid="settings-save-button">
                {isUpdating ? '⏳ Guardando...' : '💾 Guardar cambios'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Toast */}
      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
    </div>
  );
};

// UI Settings Tab
const UISettingsTab = ({
  settings,
  onChange,
}: {
  settings: typeof DEFAULT_SETTINGS;
  onChange: (settings: typeof DEFAULT_SETTINGS) => void;
}) => (
  <Card className="p-6 space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Configuración de Interfaz
      </h2>

      {/* Theme */}
      <div className="space-y-2">
        <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tema de la aplicación
        </label>
        <select
          id="theme"
          data-testid="settings-theme-select"
          value={settings.ui.theme}
          onChange={(e) =>
            onChange({
              ...settings,
              ui: { ...settings.ui, theme: e.target.value as 'light' | 'dark' | 'system' },
            })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
        >
          <option value="system">Sistema</option>
          <option value="light">Claro</option>
          <option value="dark">Oscuro</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Elige el tema de la interfaz
        </p>
      </div>

      {/* Language */}
      <div className="space-y-2 mt-4">
        <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Idioma
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Waveform Resolution */}
      <div className="space-y-2 mt-4">
        <label htmlFor="waveformResolution" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Resolución de forma de onda: {settings.ui.waveformResolution}
        </label>
        <input
          id="waveformResolution"
          type="range"
          min="256"
          max="2048"
          step="256"
          value={settings.ui.waveformResolution}
          onChange={(e) =>
            onChange({
              ...settings,
              ui: { ...settings.ui, waveformResolution: Number(e.target.value) },
            })
          }
          className="w-full"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Mayor resolución = más detalle (pero más uso de CPU)
        </p>
      </div>
    </div>
  </Card>
);

// Audio Settings Tab
const AudioSettingsTab = ({
  settings,
  onChange,
}: {
  settings: typeof DEFAULT_SETTINGS;
  onChange: (settings: typeof DEFAULT_SETTINGS) => void;
}) => (
  <Card className="p-6 space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Configuración de Audio
      </h2>

      {/* Output Device */}
      <div className="space-y-2">
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
          placeholder="default"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Deja "default" para usar el dispositivo por defecto del sistema
        </p>
      </div>

      {/* Sample Rate */}
      <div className="space-y-2 mt-4">
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
        >
          <option value="44100">44.1 kHz (CD Quality)</option>
          <option value="48000">48 kHz (Standard)</option>
          <option value="96000">96 kHz (High Resolution)</option>
        </select>
      </div>

      {/* Buffer Size */}
      <div className="space-y-2 mt-4">
        <label htmlFor="bufferSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tamaño de buffer: {settings.audio.bufferSize} samples
        </label>
        <input
          id="bufferSize"
          type="range"
          min="512"
          max="8192"
          step="512"
          value={settings.audio.bufferSize}
          onChange={(e) =>
            onChange({
              ...settings,
              audio: { ...settings.audio, bufferSize: Number(e.target.value) },
            })
          }
          className="w-full"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Menor = menos latencia, Mayor = más estabilidad
        </p>
      </div>
    </div>
  </Card>
);

// Library Settings Tab
const LibrarySettingsTab = ({
  settings,
  onChange,
  onShowToast,
}: {
  settings: typeof DEFAULT_SETTINGS;
  onChange: (settings: typeof DEFAULT_SETTINGS) => void;
  onShowToast: (message: string) => void;
}) => {
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isResettingLibrary, setIsResettingLibrary] = useState(false);

  const handleClearWaveformCache = async () => {
    setIsClearingCache(true);
    try {
      await invoke('clear_waveform_cache');
      onShowToast('✅ Caché de waveforms limpiado exitosamente');
    } catch (error) {
      console.error('Error al limpiar caché:', error);
      onShowToast('❌ Error al limpiar el caché de waveforms');
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleResetLibrary = async () => {
    const confirmed = confirm(
      '⚠️ ATENCIÓN: Esta acción eliminará:\n\n' +
      '• Todas las pistas de la biblioteca\n' +
      '• Todas las playlists\n' +
      '• Todo el caché de waveforms\n' +
      '• Todos los beatgrids, cue points y loops\n\n' +
      'Los archivos de audio NO serán eliminados del disco.\n\n' +
      '¿Estás seguro de que quieres continuar?'
    );
    
    if (!confirmed) return;

    setIsResettingLibrary(true);
    try {
      const result = await invoke<{ tracksDeleted: number; playlistsDeleted: number; waveformsDeleted: number }>('reset_library');
      onShowToast(
        `✅ Biblioteca reseteada: ${result.tracksDeleted} pistas, ` +
        `${result.playlistsDeleted} playlists y ${result.waveformsDeleted} waveforms eliminados`
      );
    } catch (error) {
      console.error('Error al resetear biblioteca:', error);
      onShowToast('❌ Error al resetear la biblioteca');
    } finally {
      setIsResettingLibrary(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Configuración de Biblioteca
        </h2>

        {/* Auto Scan */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="autoScan"
            checked={settings.library.autoScanOnStartup}
            onChange={(e) =>
              onChange({
                ...settings,
                library: { ...settings.library, autoScanOnStartup: e.target.checked },
              })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="autoScan" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Escanear biblioteca automáticamente al iniciar
          </label>
        </div>

        {/* Scan Interval */}
        <div className="space-y-2 mt-4">
          <label htmlFor="scanInterval" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Intervalo de escaneo automático (horas)
          </label>
          <input
            id="scanInterval"
            type="number"
            min="0"
            max="168"
            value={settings.library.scanIntervalHours}
            onChange={(e) =>
              onChange({
                ...settings,
                library: { ...settings.library, scanIntervalHours: Number(e.target.value) },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            0 = desactivado
          </p>
        </div>

        {/* Import Folder */}
        <div className="space-y-2 mt-4">
          <label htmlFor="importFolder" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Carpeta de importación por defecto
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
            placeholder="/ruta/a/tu/música"
          />
        </div>
      </div>

      {/* Maintenance Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Mantenimiento
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Limpiar caché de waveforms
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Elimina las formas de onda almacenadas. Se regenerarán al reproducir cada pista.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleClearWaveformCache}
              disabled={isClearingCache}
              className="ml-4 shrink-0 text-sm px-3 py-1.5"
            >
              {isClearingCache ? 'Limpiando...' : 'Limpiar caché'}
            </Button>
          </div>

          {/* Reset Library - Zona de peligro */}
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                🗑️ Resetear biblioteca completa
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Elimina todas las pistas, playlists, waveforms y datos de análisis. Los archivos NO se borran.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleResetLibrary}
              disabled={isResettingLibrary}
              className="ml-4 shrink-0 text-sm px-3 py-1.5 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
            >
              {isResettingLibrary ? 'Reseteando...' : 'Resetear biblioteca'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Conversion Settings Tab
const ConversionSettingsTab = ({
  settings,
  onChange,
}: {
  settings: typeof DEFAULT_SETTINGS;
  onChange: (settings: typeof DEFAULT_SETTINGS) => void;
}) => (
  <Card className="p-6 space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Configuración de Conversión MP3
      </h2>

      {/* Enabled */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="conversionEnabled"
          checked={settings.conversion.enabled}
          onChange={(e) =>
            onChange({
              ...settings,
              conversion: { ...settings.conversion, enabled: e.target.checked },
            })
          }
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="conversionEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Habilitar conversión a MP3
        </label>
      </div>

      {/* Auto Convert */}
      <div className="flex items-center space-x-3 mt-4">
        <input
          type="checkbox"
          id="autoConvert"
          checked={settings.conversion.autoConvert}
          onChange={(e) =>
            onChange({
              ...settings,
              conversion: { ...settings.conversion, autoConvert: e.target.checked },
            })
          }
          disabled={!settings.conversion.enabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
        />
        <label
          htmlFor="autoConvert"
          className={`text-sm font-medium ${
            settings.conversion.enabled
              ? 'text-gray-700 dark:text-gray-300'
              : 'text-gray-400 dark:text-gray-600'
          }`}
        >
          Convertir automáticamente al importar
        </label>
      </div>

      {/* Bitrate */}
      <div className="space-y-2 mt-4">
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
          disabled={!settings.conversion.enabled}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 disabled:opacity-50"
        >
          <option value="128">128 kbps</option>
          <option value="192">192 kbps</option>
          <option value="256">256 kbps</option>
          <option value="320">320 kbps (Máxima calidad)</option>
        </select>
      </div>

      {/* Output Folder */}
      <div className="space-y-2 mt-4">
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
          disabled={!settings.conversion.enabled}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 disabled:opacity-50"
          placeholder="/ruta/a/salida/mp3"
        />
      </div>

      {/* Preserve Structure */}
      <div className="flex items-center space-x-3 mt-4">
        <input
          type="checkbox"
          id="preserveStructure"
          checked={settings.conversion.preserveStructure}
          onChange={(e) =>
            onChange({
              ...settings,
              conversion: { ...settings.conversion, preserveStructure: e.target.checked },
            })
          }
          disabled={!settings.conversion.enabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
        />
        <label
          htmlFor="preserveStructure"
          className={`text-sm font-medium ${
            settings.conversion.enabled
              ? 'text-gray-700 dark:text-gray-300'
              : 'text-gray-400 dark:text-gray-600'
          }`}
        >
          Preservar estructura de carpetas
        </label>
      </div>
    </div>
  </Card>
);
