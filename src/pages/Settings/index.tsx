import { useState } from 'react';
import { UISettingsTab, AudioSettingsTab, LibrarySettingsTab, ConversionSettingsTab } from './tabs';
import { useSettingsForm } from './hooks/useSettingsForm';
import { Toast } from '../../components/Toast';

/**
 * Página de Configuración
 * Permite al usuario ajustar preferencias de UI, audio, biblioteca y conversión
 * AIDEV-NOTE: Este componente se mantiene por compatibilidad, pero se recomienda usar SettingsModal
 */
export const Settings = () => {
  const [activeTab, setActiveTab] = useState<'ui' | 'audio' | 'library' | 'conversion'>('ui');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const {
    localSettings,
    setLocalSettings,
    handleSave,
    handleReset,
    isUpdating,
    isResetting,
    isLoading,
    error,
  } = useSettingsForm({
    onSaveSuccess: () => {
      setToastMessage('✅ Configuración guardada correctamente');
      setToastType('success');
      setToastVisible(true);
    },
    onSaveError: (message: string) => {
      setToastMessage(`❌ Error: ${message}`);
      setToastType('error');
      setToastVisible(true);
    },
    onResetSuccess: () => {
      setToastMessage('✅ Configuración restablecida a valores predeterminados');
      setToastType('success');
      setToastVisible(true);
    },
    onResetError: (message: string) => {
      setToastMessage(`❌ Error al restablecer: ${message}`);
      setToastType('error');
      setToastVisible(true);
    },
  });

  /**
   * Muestra un toast con el mensaje especificado
   * Usado por tabs que necesitan mostrar notificaciones (ej: Library maintenance actions)
   */
  const showToast = (message: string) => {
    setToastMessage(message);
    setToastType(message.startsWith('✅') ? 'success' : 'error');
    setToastVisible(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">
          Cargando configuración...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600 dark:text-red-400">
          Error al cargar configuración: {error.message}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'ui' as const, label: '🎨 Interfaz', icon: '🎨' },
    { id: 'audio' as const, label: '🔊 Audio', icon: '🔊' },
    { id: 'library' as const, label: '📚 Biblioteca', icon: '📚' },
    { id: 'conversion' as const, label: '💿 Conversión', icon: '💿' },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-8 py-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            Configuración
          </h1>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Tabs Navigation */}
        <div className="w-64 flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-r border-gray-200 dark:border-gray-800 p-4">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`settings-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="w-full">
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
                onShowToast={showToast}
              />
            )}
            {activeTab === 'conversion' && (
              <ConversionSettingsTab settings={localSettings} onChange={setLocalSettings} />
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex items-center space-x-4 p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl">
              <button
                type="button"
                data-testid="settings-save-button"
                onClick={handleSave}
                disabled={isUpdating || isResetting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isUpdating ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Guardando...</span>
                  </span>
                ) : (
                  '💾 Guardar Cambios'
                )}
              </button>

              <button
                type="button"
                data-testid="settings-reset-button"
                onClick={handleReset}
                disabled={isUpdating || isResetting}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isResetting ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Reiniciando...</span>
                  </span>
                ) : (
                  '🔄 Reiniciar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toastVisible && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastVisible(false)}
        />
      )}
    </div>
  );
};
