import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../../../components/ui/Button';
import type { Track, ConsolidateLibraryResult } from '../../../types/library';

export interface MaintenanceActionsProps {
  /** Callback para mostrar toasts */
  onShowToast: (message: string) => void;
}

/**
 * Componente con acciones de mantenimiento de biblioteca
 * Incluye: Clear Cache, Consolidate Library, Reset Library
 */
export const MaintenanceActions = ({ onShowToast }: MaintenanceActionsProps) => {
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
      const libraryPaths = [
        ...new Set(
          tracks.map((t) => {
            const parts = t.path.split('/');
            // Buscar carpeta Music/Música
            const musicIndex = parts.findIndex((p) => p === 'Music' || p === 'Música' || p === 'music');
            if (musicIndex > 0) {
              return parts.slice(0, musicIndex + 1).join('/');
            }
            // Fallback: directorio padre
            return parts.slice(0, -1).join('/');
          })
        ),
      ];

      const result = await invoke<ConsolidateLibraryResult>('consolidate_library', {
        libraryPaths,
      });

      const messages = [];
      if (result.orphansRemoved > 0) messages.push(`${result.orphansRemoved} huérfanas`);
      if (result.duplicatesRemoved > 0) messages.push(`${result.duplicatesRemoved} duplicados`);
      if (result.newTracksAdded > 0) messages.push(`${result.newTracksAdded} nuevas`);

      const action = messages.length > 0 ? messages.join(', ') : 'ningún cambio';

      onShowToast(`✅ Biblioteca consolidada: ${action}. Total: ${result.totalTracks} pistas.`);
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
      const result = await invoke<{
        tracksDeleted: number;
        playlistsDeleted: number;
        waveformsDeleted: number;
      }>('reset_library');
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
    <div className="space-y-4">
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
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
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
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
              🔧 Consolidar Biblioteca
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
              Verifica archivos, elimina entradas huérfanas, detecta duplicados y agrega archivos nuevos
              automáticamente
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Consolidando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
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
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Reseteando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Resetear biblioteca</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
