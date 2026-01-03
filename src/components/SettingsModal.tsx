import { useState, useEffect } from 'react';
import { UISettingsTab, AudioSettingsTab, LibrarySettingsTab, ConversionSettingsTab } from '../pages/Settings/tabs';
import { useSettingsForm } from '../pages/Settings/hooks/useSettingsForm';
import { Toast } from './Toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de Configuración
 * Permite al usuario ajustar preferencias de UI, audio, biblioteca y conversión
 * AIDEV-NOTE: Convertido de página completa a modal para mejorar UX
 */
export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
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

  // AIDEV-NOTE: Cerrar modal con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'ui' as const, label: '🎨 Interfaz', icon: '🎨' },
    { id: 'audio' as const, label: '🔊 Audio', icon: '🔊' },
    { id: 'library' as const, label: '📚 Biblioteca', icon: '📚' },
    { id: 'conversion' as const, label: '💿 Conversión', icon: '💿' },
  ];

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm border-0 w-full h-full cursor-default"
        onClick={onClose}
        data-testid="settings-modal-backdrop"
        aria-label="Cerrar modal de configuración"
      />

      {/* Modal Container */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        data-testid="settings-modal-container"
      >
        <div 
          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          data-testid="settings-modal"
        >
          {/* Header */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <title>Configuración</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 id="settings-modal-title" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Configuración
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                data-testid="settings-modal-close"
                aria-label="Cerrar configuración"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>Cerrar</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Loading/Error States */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500 dark:text-gray-400">
                Cargando configuración...
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-red-600 dark:text-red-400">
                Error al cargar configuración: {error.message}
              </div>
            </div>
          )}

          {/* Main Content */}
          {!isLoading && !error && (
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar - Tabs Navigation */}
              <div className="w-56 flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-r border-gray-200 dark:border-gray-800 p-3">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      data-testid={`settings-tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-medium text-sm">{tab.label}</span>
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
                  <div className="mt-6 flex items-center space-x-4 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl">
                    <button
                      type="button"
                      data-testid="settings-save-button"
                      onClick={handleSave}
                      disabled={isUpdating || isResetting}
                      className="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    >
                      {isUpdating ? (
                        <span className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <title>Guardando</title>
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
                      className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    >
                      {isResetting ? (
                        <span className="flex items-center space-x-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <title>Reiniciando</title>
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
          )}
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
    </>
  );
};
