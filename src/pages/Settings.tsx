import { Button } from '../components/ui/Button';
import { Toast } from '../components/Toast';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

import { useSettings } from '../hooks/useSettings';
import { DEFAULT_SETTINGS } from '../types/settings';
import type { Track, ConsolidateLibraryResult } from '../types/library';

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
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col" data-testid="settings-page">
      {/* Header with gradient */}
      <div className="relative border-b border-gray-200 dark:border-gray-800 px-8 py-6 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
              Configuración
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Personaliza Symphony según tus preferencias
            </p>
          </div>
        </div>
      </div>

      {/* Tabs - Modern style */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white/30 dark:bg-slate-950/30 backdrop-blur-sm px-8">
        <nav className="flex space-x-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative py-4 px-6 text-sm font-medium transition-all duration-200
                ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              <span className="flex items-center space-x-2">
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content with better spacing */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="w-full space-y-6">
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

          {/* Action Buttons - Sticky footer style */}
          <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <Button 
                variant="secondary" 
                onClick={handleReset} 
                disabled={isResetting} 
                data-testid="settings-reset-button"
                className="flex items-center space-x-2 px-6 py-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isResetting ? 'Reseteando...' : 'Restaurar valores por defecto'}</span>
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSave} 
                disabled={isUpdating} 
                data-testid="settings-save-button"
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{isUpdating ? 'Guardando...' : 'Guardar cambios'}</span>
              </Button>
            </div>
          </div>
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
  <div className="space-y-6">
    {/* Theme Section */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Apariencia</h3>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Theme */}
        <div className="space-y-3">
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
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
      </div>
    </div>

    {/* Waveform Section */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Forma de Onda</h3>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="waveformResolution" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Resolución
            </label>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-mono font-semibold">
              {settings.ui.waveformResolution}
            </span>
          </div>
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
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>256 (Rápido)</span>
            <span>2048 (Detallado)</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Mayor resolución muestra más detalle pero consume más CPU</span>
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Audio Settings Tab
const AudioSettingsTab = ({
  settings,
  onChange,
}: {
  settings: typeof DEFAULT_SETTINGS;
  onChange: (settings: typeof DEFAULT_SETTINGS) => void;
}) => (
  <div className="space-y-6">
    {/* Audio Device Section */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dispositivo de Audio</h3>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
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
      </div>
    </div>

    {/* Audio Quality Section */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Calidad de Audio</h3>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="bufferSize" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tamaño de buffer
            </label>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-mono font-semibold">
              {settings.audio.bufferSize} samples
            </span>
          </div>
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
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>512 (Baja latencia)</span>
            <span>8192 (Más estable)</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Menor = menos latencia pero puede tener cortes. Mayor = más estabilidad</span>
          </p>
        </div>
      </div>
    </div>
  </div>
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
  const [isConsolidating, setIsConsolidating] = useState(false);

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

  const handleConsolidateLibrary = async () => {
    const confirmed = confirm(
      '🔧 Consolidar biblioteca realizará:\n\n' +
      '• Verificar que todos los archivos existen\n' +
      '• Eliminar entradas huérfanas (sin archivo)\n' +
      '• Detectar y eliminar duplicados\n' +
      '• Agregar archivos nuevos no importados\n' +
      '• Optimizar la base de datos\n\n' +
      '¿Deseas continuar?'
    );
    
    if (!confirmed) return;

    setIsConsolidating(true);
    try {
      // Obtener rutas de biblioteca desde tracks existentes
      const tracks = await invoke<Track[]>('get_all_tracks');
      const libraryPaths = [...new Set(
        tracks.map(t => {
          const parts = t.path.split('/');
          // Buscar carpeta Music/Música
          const musicIndex = parts.findIndex(p => p === 'Music' || p === 'Música' || p === 'music');
          if (musicIndex > 0) {
            return parts.slice(0, musicIndex + 1).join('/');
          }
          // Fallback: directorio padre
          return parts.slice(0, -1).join('/');
        })
      )];

      const result = await invoke<ConsolidateLibraryResult>('consolidate_library', {
        libraryPaths
      });
      
      const messages = [];
      if (result.orphansRemoved > 0) messages.push(`${result.orphansRemoved} huérfanas`);
      if (result.duplicatesRemoved > 0) messages.push(`${result.duplicatesRemoved} duplicados`);
      if (result.newTracksAdded > 0) messages.push(`${result.newTracksAdded} nuevas`);
      
      const action = messages.length > 0 ? messages.join(', ') : 'ningún cambio';
      
      onShowToast(
        `✅ Biblioteca consolidada: ${action}. Total: ${result.totalTracks} pistas.`
      );
    } catch (error) {
      console.error('Error al consolidar biblioteca:', error);
      onShowToast('❌ Error al consolidar la biblioteca');
    } finally {
      setIsConsolidating(false);
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
    <div className="space-y-6">
      {/* Auto Scan Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Escaneo Automático</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Auto Scan Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label htmlFor="autoScan" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Escanear al iniciar
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Detecta automáticamente archivos nuevos al abrir Symphony
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="autoScan"
                type="checkbox"
                checked={settings.library.autoScanOnStartup}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    library: { ...settings.library, autoScanOnStartup: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Scan Interval */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="scanInterval" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Intervalo de escaneo
              </label>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-semibold">
                {settings.library.scanIntervalHours}h
              </span>
            </div>
            <input
              id="scanInterval"
              type="range"
              min="0"
              max="168"
              step="1"
              value={settings.library.scanIntervalHours}
              onChange={(e) =>
                onChange({
                  ...settings,
                  library: { ...settings.library, scanIntervalHours: Number(e.target.value) },
                })
              }
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>0 (Desactivado)</span>
              <span>168h (Semanal)</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Frecuencia de búsqueda automática de archivos nuevos. 0 = desactivado</span>
            </p>
          </div>
        </div>
      </div>

      {/* Import Folder Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Carpeta de Importación</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-3">
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
      </div>

      {/* Maintenance Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 dark:from-sky-500/20 dark:to-blue-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 rounded-lg">
              <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Mantenimiento</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Clear Waveform Cache */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Limpiar caché de waveforms
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Elimina las formas de onda almacenadas. Se regenerarán al reproducir cada pista
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleClearWaveformCache}
              disabled={isClearingCache}
              className="ml-4 shrink-0 text-sm px-4 py-2"
            >
              {isClearingCache ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Limpiando...</span>
                </span>
              ) : (
                'Limpiar caché'
              )}
            </Button>
          </div>

          {/* Consolidate Library */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  🔧 Consolidar Biblioteca
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                  Verifica archivos, elimina entradas huérfanas, detecta duplicados y agrega archivos nuevos automáticamente
                </p>
                <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1 mb-3">
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    <span>Elimina tracks cuyos archivos ya no existen</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    <span>Detecta y elimina entradas duplicadas</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    <span>Escanea carpetas y agrega archivos nuevos</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    <span>Optimiza la base de datos</span>
                  </li>
                </ul>
                <button
                  onClick={handleConsolidateLibrary}
                  disabled={isConsolidating}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                >
                  {isConsolidating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Consolidando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Consolidar Biblioteca</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Reset Library - Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                  🗑️ Resetear biblioteca completa
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                  Elimina todas las pistas, playlists, waveforms y datos de análisis. Los archivos NO se borran del disco
                </p>
                <button
                  onClick={handleResetLibrary}
                  disabled={isResettingLibrary}
                  className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                >
                  {isResettingLibrary ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Reseteando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Resetear biblioteca</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  <div className="space-y-6">
    {/* General Settings */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Conversión MP3</h3>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Enable Conversion */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="conversionEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Habilitar conversión a MP3
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Activa las opciones de conversión de audio
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="conversionEnabled"
              type="checkbox"
              checked={settings.conversion.enabled}
              onChange={(e) =>
                onChange({
                  ...settings,
                  conversion: { ...settings.conversion, enabled: e.target.checked },
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
          </label>
        </div>

        {/* Auto Convert */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="autoConvert" className={`text-sm font-medium ${settings.conversion.enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
              Convertir automáticamente al importar
            </label>
            <p className={`text-xs mt-1 ${settings.conversion.enabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
              Genera versión MP3 al agregar pistas a la biblioteca
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="autoConvert"
              type="checkbox"
              checked={settings.conversion.autoConvert}
              onChange={(e) =>
                onChange({
                  ...settings,
                  conversion: { ...settings.conversion, autoConvert: e.target.checked },
                })
              }
              disabled={!settings.conversion.enabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>
      </div>
    </div>

    {/* Quality Settings */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Calidad de Exportación</h3>
        </div>
      </div>
      
      <div className="p-6 space-y-3">
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
    </div>

    {/* Output Settings */}
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-pink-500/20 rounded-lg">
            <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Opciones de Salida</h3>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
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
            disabled={!settings.conversion.enabled}
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
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="preserveStructure" className={`text-sm font-medium ${settings.conversion.enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
              Preservar estructura de carpetas
            </label>
            <p className={`text-xs mt-1 ${settings.conversion.enabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
              Mantiene la misma organización de carpetas del archivo original
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="preserveStructure"
              type="checkbox"
              checked={settings.conversion.preserveStructure}
              onChange={(e) =>
                onChange({
                  ...settings,
                  conversion: { ...settings.conversion, preserveStructure: e.target.checked },
                })
              }
              disabled={!settings.conversion.enabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 dark:peer-focus:ring-pink-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-pink-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>
      </div>
    </div>
  </div>
);
