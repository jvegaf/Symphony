import React, { useState } from 'react';

import { open } from '@tauri-apps/plugin-dialog';

import type { ConversionResult } from '../types/settings';
import { useBatchConvert, useCheckFfmpeg } from '../hooks/useConversion';
import { useGetSetting } from '../hooks/useSettings';

import { Card } from './ui/Card';

export interface ConversionDialogProps {
  /** Callback ejecutado cuando la conversión se completa exitosamente */
  onComplete?: (results: ConversionResult[]) => void;
  /** Callback ejecutado cuando ocurre un error */
  onError?: (error: Error) => void;
  /** Callback para cerrar el diálogo */
  onClose?: () => void;
  /** Muestra el diálogo */
  isOpen?: boolean;
}

/**
 * Diálogo para convertir archivos de audio a MP3
 * 
 * Permite seleccionar archivos, configurar opciones de conversión,
 * mostrar progreso en tiempo real y ver resultados.
 * 
 * AIDEV-NOTE: Usa useBatchConvert para conversión con progreso en tiempo real
 * vía eventos Tauri. Verifica ffmpeg antes de permitir conversión.
 * 
 * @example
 * ```tsx
 * <ConversionDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onComplete={(results) => console.log(`Convertidos ${results.length} archivos`)}
 * />
 * ```
 */
export const ConversionDialog: React.FC<ConversionDialogProps> = ({
  onComplete,
  onError,
  onClose,
  isOpen = true,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [bitrate, setBitrate] = useState<128 | 192 | 256 | 320>(320);
  const [outputFolder, setOutputFolder] = useState<string>('');
  const [preserveStructure, setPreserveStructure] = useState<boolean>(true);
  const [conversionResults, setConversionResults] = useState<ConversionResult[]>([]);

  const { data: ffmpegInstalled, isLoading: checkingFfmpeg } = useCheckFfmpeg();
  const { data: defaultBitrateSetting } = useGetSetting('conversion_bitrate');
  const { data: defaultOutputFolderSetting } = useGetSetting('conversion_output_folder');
  const { data: defaultPreserveStructureSetting } = useGetSetting('conversion_preserve_structure');

  const { mutate: convert, progress, isPending, isError, error } = useBatchConvert();

  // Inicializar valores desde settings al cargar
  React.useEffect(() => {
    if (defaultBitrateSetting?.value) {
      setBitrate(Number(defaultBitrateSetting.value) as 128 | 192 | 256 | 320);
    }
    if (defaultOutputFolderSetting?.value) {
      setOutputFolder(defaultOutputFolderSetting.value);
    }
    if (defaultPreserveStructureSetting?.value) {
      setPreserveStructure(defaultPreserveStructureSetting.value === 'true');
    }
  }, [defaultBitrateSetting, defaultOutputFolderSetting, defaultPreserveStructureSetting]);

  const handleSelectFiles = async () => {
    try {
      const result = await open({
        directory: false,
        multiple: true,
        title: 'Seleccionar archivos de audio',
        filters: [
          {
            name: 'Audio',
            extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'],
          },
        ],
      });

      if (result) {
        // result puede ser string o string[]
        const files = Array.isArray(result) ? result : [result];
        setSelectedFiles(files);
        setConversionResults([]); // Limpiar resultados previos
      }
    } catch (err) {
      console.error('Error al seleccionar archivos:', err);
    }
  };

  const handleSelectOutputFolder = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: 'Seleccionar carpeta de salida',
      });

      if (result) {
        setOutputFolder(result);
      }
    } catch (err) {
      console.error('Error al seleccionar carpeta:', err);
    }
  };

  const handleConvert = () => {
    if (selectedFiles.length === 0 || !outputFolder) return;

    convert(
      {
        inputPaths: selectedFiles,
        options: {
          bitrate,
          outputFolder,
          preserveStructure,
        },
      },
      {
        onSuccess: (results) => {
          setConversionResults(results);
          onComplete?.(results);
        },
        onError: (err) => {
          onError?.(err as Error);
        },
      }
    );
  };

  const handleClose = () => {
    if (!isPending) {
      setSelectedFiles([]);
      setConversionResults([]);
      onClose?.();
    }
  };

  const progressPercentage = progress?.percentage ?? 0;
  const successCount = conversionResults.filter((r) => r.success).length;
  const errorCount = conversionResults.filter((r) => !r.success).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Convertir a MP3
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <title>Cerrar diálogo</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Verificación de ffmpeg */}
        {checkingFfmpeg && (
          <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded">
            Verificando instalación de ffmpeg...
          </div>
        )}

        {!checkingFfmpeg && !ffmpegInstalled && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded" role="alert">
            <p className="font-semibold">⚠️ ffmpeg no está instalado</p>
            <p className="text-sm mt-1">
              Necesitas instalar ffmpeg para convertir archivos. Visita{' '}
              <a
                href="https://ffmpeg.org/download.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-800 dark:hover:text-red-100"
              >
                ffmpeg.org
              </a>
            </p>
          </div>
        )}

        {/* Selección de archivos */}
        <div className="mb-4">
          <label htmlFor="selectFilesBtn" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Archivos a convertir
          </label>
          <button
            id="selectFilesBtn"
            type="button"
            onClick={handleSelectFiles}
            disabled={isPending || !ffmpegInstalled}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Seleccionar Archivos
          </button>

          {selectedFiles.length > 0 && (
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}
              </p>
              <div className="max-h-32 overflow-y-auto">
                {selectedFiles.map((file) => (
                  <p key={file} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {file.split('/').pop() || file}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Configuración */}
        <div className="space-y-4 mb-4">
          {/* Bitrate */}
          <div>
            <label htmlFor="conversionBitrate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bitrate MP3
            </label>
            <select
              id="conversionBitrate"
              value={bitrate}
              onChange={(e) => setBitrate(Number(e.target.value) as 128 | 192 | 256 | 320)}
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 disabled:opacity-50"
            >
              <option value="128">128 kbps</option>
              <option value="192">192 kbps</option>
              <option value="256">256 kbps</option>
              <option value="320">320 kbps (Máxima calidad)</option>
            </select>
          </div>

          {/* Output Folder */}
          <div>
            <label htmlFor="conversionOutputFolder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Carpeta de salida
            </label>
            <div className="flex space-x-2">
              <input
                id="conversionOutputFolder"
                type="text"
                value={outputFolder}
                onChange={(e) => setOutputFolder(e.target.value)}
                disabled={isPending}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                placeholder="/ruta/a/salida/mp3"
              />
              <button
                type="button"
                onClick={handleSelectOutputFolder}
                disabled={isPending}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Preserve Structure */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="conversionPreserveStructure"
              checked={preserveStructure}
              onChange={(e) => setPreserveStructure(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
            />
            <label
              htmlFor="conversionPreserveStructure"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Preservar estructura de carpetas
            </label>
          </div>
        </div>

        {/* Botón de conversión */}
        {selectedFiles.length > 0 && outputFolder && !isPending && conversionResults.length === 0 && (
          <button
            type="button"
            onClick={handleConvert}
            disabled={!ffmpegInstalled}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mb-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Convertir a MP3
          </button>
        )}

        {/* Progreso */}
        {isPending && progress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-2">
              <span className="capitalize">{progress.status}</span>
              <span>
                {progress.currentIndex} / {progress.totalFiles}
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
              <div
                className="bg-green-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {progressPercentage.toFixed(1)}% completado
            </p>

            {progress.currentFile && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 truncate">
                Convirtiendo: {progress.currentFile.split('/').pop() || progress.currentFile}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {isError && error && (
          <div
            className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded mb-4"
            role="alert"
          >
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {/* Resultados */}
        {conversionResults.length > 0 && !isPending && (
          <div className="mb-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded mb-2">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                Conversión completada
              </p>
              <div className="flex space-x-4 text-sm">
                <span className="text-green-600 dark:text-green-400">
                  ✓ Exitosos: {successCount}
                </span>
                {errorCount > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    ✗ Errores: {errorCount}
                  </span>
                )}
              </div>
            </div>

            {/* Lista de resultados */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {conversionResults.map((result) => (
                <div
                  key={result.inputPath}
                  className={`p-2 rounded text-sm ${
                    result.success
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 mt-0.5">
                      {result.success ? '✓' : '✗'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">
                        {result.inputPath.split('/').pop() || result.inputPath}
                      </p>
                      {result.success ? (
                        <p className="text-xs opacity-75 truncate">
                          → {result.outputPath.split('/').pop() || result.outputPath}
                        </p>
                      ) : (
                        <p className="text-xs opacity-75">
                          {result.error || 'Error desconocido'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón de cerrar después de completar */}
            <button
              type="button"
              onClick={handleClose}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

ConversionDialog.displayName = 'ConversionDialog';
