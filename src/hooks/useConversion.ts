import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { ConversionOptions, ConversionProgress, ConversionResult } from '../types/settings';

/**
 * Hook para convertir un track individual a MP3
 */
export function useConvertTrack() {
  const [progress, setProgress] = useState<ConversionProgress | null>(null);

  useEffect(() => {
    const unlisten = listen<ConversionProgress>('conversion:progress', (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async ({
      inputPath,
      options,
    }: {
      inputPath: string;
      options: ConversionOptions;
    }) => {
      const result = await invoke<ConversionResult>('convert_track_to_mp3', {
        inputPath,
        bitrate: options.bitrate,
        outputFolder: options.outputFolder,
        preserveStructure: options.preserveStructure,
      });
      return result;
    },
    onSettled: () => {
      // Limpiar progreso al terminar (éxito o error)
      setProgress(null);
    },
  });

  return {
    ...mutation,
    progress,
  };
}

/**
 * Hook para conversión batch de múltiples tracks
 */
export function useBatchConvert() {
  const [progress, setProgress] = useState<ConversionProgress | null>(null);

  useEffect(() => {
    const unlisten = listen<ConversionProgress>('conversion:progress', (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async ({
      inputPaths,
      options,
    }: {
      inputPaths: string[];
      options: ConversionOptions;
    }) => {
      const results = await invoke<ConversionResult[]>('batch_convert_to_mp3', {
        inputPaths,
        bitrate: options.bitrate,
        outputFolder: options.outputFolder,
        preserveStructure: options.preserveStructure,
      });
      return results;
    },
    onSettled: () => {
      // Limpiar progreso al terminar
      setProgress(null);
    },
  });

  return {
    ...mutation,
    progress,
  };
}

/**
 * Hook para verificar si ffmpeg está instalado
 */
export function useCheckFfmpeg() {
  return useQuery({
    queryKey: ['ffmpeg-installed'],
    queryFn: async () => {
      const installed = await invoke<boolean>('check_ffmpeg_installed');
      return installed;
    },
    staleTime: 60 * 60 * 1000, // 1 hora - ffmpeg no se instala/desinstala frecuentemente
    retry: false, // No reintentar si falla
  });
}

/**
 * Hook conveniente que combina todas las operaciones de conversión
 */
export function useConversion() {
  const convertTrack = useConvertTrack();
  const batchConvert = useBatchConvert();
  const { data: ffmpegInstalled, isLoading: checkingFfmpeg } = useCheckFfmpeg();

  return {
    // Conversión individual
    convertTrack: convertTrack.mutate,
    convertTrackAsync: convertTrack.mutateAsync,
    isConverting: convertTrack.isPending,
    conversionError: convertTrack.error,
    trackProgress: convertTrack.progress,

    // Conversión batch
    batchConvert: batchConvert.mutate,
    batchConvertAsync: batchConvert.mutateAsync,
    isBatchConverting: batchConvert.isPending,
    batchError: batchConvert.error,
    batchProgress: batchConvert.progress,

    // Estado de ffmpeg
    ffmpegInstalled: ffmpegInstalled ?? false,
    checkingFfmpeg,
  };
}
