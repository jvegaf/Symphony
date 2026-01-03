import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useImportLibrary } from '../hooks/library';
import { useUpdateSettings } from '../hooks/useSettings';

import type { ImportResult } from '../types/library';

interface OnboardingModalProps {
  /** Se invoca cuando el usuario completa el onboarding (después de importación exitosa) */
  onComplete: () => void;
}

/**
 * Modal de Bienvenida y Configuración Inicial (Primera Ejecución)
 *
 * Permite al usuario:
 * 1. Seleccionar su carpeta de música
 * 2. Iniciar importación automática
 * 3. Ver progreso en tiempo real
 *
 * Se muestra solo en el primer arranque de la aplicación.
 *
 * AIDEV-NOTE: Este modal integra ImportDialog inline para mostrar progreso
 * sin necesidad de un diálogo separado.
 *
 * @example
 * ```tsx
 * const { isFirstRun, completeFirstRun } = useFirstRun();
 *
 * return (
 *   <>
 *     {isFirstRun && <OnboardingModal onComplete={completeFirstRun} />}
 *     <MainApp />
 *   </>
 * );
 * ```
 */
export const OnboardingModal = ({ onComplete }: OnboardingModalProps) => {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [step, setStep] = useState<'welcome' | 'importing' | 'complete'>('welcome');
  const { mutate, progress, isError, error } = useImportLibrary();
  const updateSettings = useUpdateSettings();

  // AIDEV-NOTE: No permitir cerrar el modal con Escape durante onboarding obligatorio
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  /**
   * Abre el selector de carpeta nativo del sistema
   */
  const handleSelectFolder = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: 'Seleccionar carpeta de música',
      });

      if (result) {
        setSelectedPath(result);
      }
    } catch (err) {
      console.error('Error al seleccionar carpeta:', err);
    }
  };

  /**
   * Inicia la importación de la carpeta seleccionada
   * Actualiza library.import_folder en settings
   */
  const handleStartImport = async () => {
    if (!selectedPath) return;

    // AIDEV-NOTE: Guardar la carpeta seleccionada en settings antes de importar
    updateSettings.mutate([
      {
        key: 'library.import_folder',
        value: selectedPath,
        valueType: 'string',
      },
    ]);

    setStep('importing');

    // Iniciar importación
    mutate(selectedPath, {
      onSuccess: (result: ImportResult) => {
        setStep('complete');
        console.log(`✅ Importación completada: ${result.imported} pistas importadas`);
      },
      onError: (err) => {
        console.error('❌ Error en importación:', err);
        // Volver a welcome en caso de error para permitir reintentar
        setStep('welcome');
      },
    });
  };

  /**
   * Finaliza el onboarding y marca firstRunCompleted
   */
  const handleFinish = () => {
    onComplete();
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <>
      {/* Backdrop - no se puede cerrar haciendo clic fuera */}
      <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border-2 border-purple-500/30">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <div className="text-center">
              {/* Hero */}
              <div className="mb-6">
                <h1 className="text-5xl font-black mb-4">
                  <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                    Bienvenido a Symphony
                  </span>
                </h1>
                <p className="text-xl text-gray-700 dark:text-gray-300 font-light">
                  Tu nueva experiencia musical comienza aquí 🎵
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-3xl mb-2">📁</div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                    Organización Inteligente
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Detecta fechas automáticamente desde tus carpetas (ej: 2401 = Ene 2024)
                  </p>
                </div>

                <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                  <div className="text-3xl mb-2">🎧</div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">Reproducción Rápida</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Reproduce y analiza tus pistas con waveforms visuales
                  </p>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-3xl mb-2">⚡</div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">Ultra Rápido</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Construido con Rust + Tauri para máximo rendimiento
                  </p>
                </div>
              </div>

              {/* Folder Selection */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  📂 Selecciona tu carpeta de música
                </h2>

                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl mb-3"
                >
                  {selectedPath ? '✓ Cambiar carpeta' : 'Elegir carpeta'}
                </button>

                {selectedPath && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                      📁 {selectedPath}
                    </p>
                  </div>
                )}

                {!selectedPath && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Tip: Symphony detectará fechas en nombres de carpetas como "2401" (Ene 2024)
                  </p>
                )}
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={handleStartImport}
                disabled={!selectedPath}
                className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl disabled:shadow-none"
              >
                {selectedPath ? '🚀 Comenzar' : '⚠️ Selecciona una carpeta primero'}
              </button>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                🔄 Importando tu música...
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Esto puede tomar unos minutos dependiendo del tamaño de tu biblioteca
              </p>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-2">
                  <span className="capitalize font-semibold">{progress.phase}</span>
                  <span className="font-mono">
                    {progress.current} / {progress.total}
                  </span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-6 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-bold">
                  {progressPercentage.toFixed(1)}% completado
                </p>
              </div>

              {/* Error */}
              {isError && error && (
                <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg mb-4">
                  <p className="font-bold">❌ Error:</p>
                  <p className="text-sm">{error.message}</p>
                  <button
                    type="button"
                    onClick={() => setStep('welcome')}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Tip: No cierres la aplicación durante la importación
              </p>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="text-8xl mb-4">🎉</div>
                <h2 className="text-4xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                    ¡Listo para disfrutar!
                  </span>
                </h2>
                <p className="text-xl text-gray-700 dark:text-gray-300">
                  Tu biblioteca ha sido importada exitosamente
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 mb-6 border border-green-200 dark:border-green-800">
                <p className="text-lg text-gray-800 dark:text-gray-200 font-semibold">
                  ✅ {progress.total} pistas importadas
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Ahora puedes explorar, reproducir y disfrutar tu música
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xl font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-xl hover:shadow-2xl"
              >
                🎵 Comenzar a usar Symphony
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
