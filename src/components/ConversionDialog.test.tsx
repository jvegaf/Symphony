import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { open } from '@tauri-apps/plugin-dialog';

import * as useConversionHook from '../hooks/useConversion';
import * as useSettingsHook from '../hooks/useSettings';

import { ConversionDialog } from './ConversionDialog';

// Mock Tauri dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

const mockOpen = vi.mocked(open);

// Mock useBatchConvert hook
const mockMutate = vi.fn();
const mockUseBatchConvert = {
  mutate: mockMutate,
  progress: null as any,
  isPending: false,
  isError: false,
  error: null as Error | null,
};

vi.spyOn(useConversionHook, 'useBatchConvert').mockReturnValue(mockUseBatchConvert as any);

// Mock useCheckFfmpeg hook
const mockUseCheckFfmpeg = {
  data: true, // ffmpeg installed by default
  isLoading: false,
};

vi.spyOn(useConversionHook, 'useCheckFfmpeg').mockReturnValue(mockUseCheckFfmpeg as any);

// Mock useGetSetting hook
const mockUseGetSetting = vi.fn().mockReturnValue({
  data: null,
  isLoading: false,
});

vi.spyOn(useSettingsHook, 'useGetSetting').mockImplementation(mockUseGetSetting);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ConversionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBatchConvert.progress = null;
    mockUseBatchConvert.isPending = false;
    mockUseBatchConvert.isError = false;
    mockUseBatchConvert.error = null;
    mockUseCheckFfmpeg.data = true;
    mockUseCheckFfmpeg.isLoading = false;
    mockUseGetSetting.mockReturnValue({ data: null, isLoading: false });
  });

  describe('Renderizado inicial', () => {
    it('debería renderizar el diálogo cuando isOpen es true', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      expect(screen.getByText('Convertir a MP3')).toBeInTheDocument();
    });

    it('no debería renderizar cuando isOpen es false', () => {
      render(<ConversionDialog isOpen={false} />, { wrapper: createWrapper() });
      expect(screen.queryByText('Convertir a MP3')).not.toBeInTheDocument();
    });

    it('debería renderizar botón de seleccionar archivos', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      expect(screen.getByText('Seleccionar Archivos')).toBeInTheDocument();
    });

    it('debería renderizar selector de bitrate', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      expect(screen.getByLabelText('Bitrate MP3')).toBeInTheDocument();
    });

    it('debería renderizar input de carpeta de salida', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      expect(screen.getByLabelText('Carpeta de salida')).toBeInTheDocument();
    });

    it('debería renderizar checkbox de preservar estructura', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      expect(screen.getByLabelText('Preservar estructura de carpetas')).toBeInTheDocument();
    });

    it('debería renderizar botón de cerrar', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      const closeButton = screen.getByLabelText('Cerrar');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Verificación de ffmpeg', () => {
    it('debería mostrar mensaje de verificación mientras carga', () => {
      mockUseCheckFfmpeg.isLoading = true;
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      expect(screen.getByText('Verificando instalación de ffmpeg...')).toBeInTheDocument();
    });

    it('debería mostrar advertencia si ffmpeg no está instalado', () => {
      mockUseCheckFfmpeg.data = false;
      mockUseCheckFfmpeg.isLoading = false;
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      expect(screen.getByText('⚠️ ffmpeg no está instalado')).toBeInTheDocument();
    });

    it('debería deshabilitar botones si ffmpeg no está instalado', () => {
      mockUseCheckFfmpeg.data = false;
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      const selectButton = screen.getByText('Seleccionar Archivos');
      expect(selectButton).toBeDisabled();
    });

    it('debería mostrar enlace a ffmpeg.org cuando no está instalado', () => {
      mockUseCheckFfmpeg.data = false;
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });
      const link = screen.getByText('ffmpeg.org');
      expect(link).toHaveAttribute('href', 'https://ffmpeg.org/download.html');
    });
  });

  describe('Selección de archivos', () => {
    it('debería permitir seleccionar archivos', async () => {
      mockOpen.mockResolvedValue(['/music/song1.flac', '/music/song2.wav']);

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
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
      });
    });

    it('debería mostrar contador de archivos seleccionados', async () => {
      mockOpen.mockResolvedValue(['/music/song1.flac', '/music/song2.wav']);

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('2 archivos seleccionados')).toBeInTheDocument();
      });
    });

    it('debería mostrar lista de archivos seleccionados', async () => {
      mockOpen.mockResolvedValue(['/music/song1.flac', '/music/song2.wav']);

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('song1.flac')).toBeInTheDocument();
        expect(screen.getByText('song2.wav')).toBeInTheDocument();
      });
    });

    it('debería manejar cancelación de selección', async () => {
      mockOpen.mockResolvedValue(null);

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalled();
      });

      expect(screen.queryByText(/archivos seleccionados/)).not.toBeInTheDocument();
    });

    it('debería manejar selección de un solo archivo', async () => {
      mockOpen.mockResolvedValue('/music/single.flac');

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('1 archivo seleccionado')).toBeInTheDocument();
      });
    });
  });

  describe('Selección de carpeta de salida', () => {
    it('debería permitir seleccionar carpeta de salida', async () => {
      mockOpen.mockResolvedValue('/output/mp3');

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const browseButton = screen.getByText('Buscar');
      await userEvent.click(browseButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
          directory: true,
          multiple: false,
          title: 'Seleccionar carpeta de salida',
        });
      });
    });

    it('debería permitir escribir carpeta de salida manualmente', async () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const outputInput = screen.getByLabelText('Carpeta de salida') as HTMLInputElement;
      await userEvent.clear(outputInput);
      await userEvent.type(outputInput, '/custom/output');

      expect(outputInput.value).toBe('/custom/output');
    });
  });

  describe('Configuración de opciones', () => {
    it('debería permitir cambiar el bitrate', async () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const bitrateSelect = screen.getByLabelText('Bitrate MP3') as HTMLSelectElement;
      await userEvent.selectOptions(bitrateSelect, '192');

      expect(bitrateSelect.value).toBe('192');
    });

    it('debería tener 320 kbps como bitrate por defecto', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const bitrateSelect = screen.getByLabelText('Bitrate MP3') as HTMLSelectElement;
      expect(bitrateSelect.value).toBe('320');
    });

    it('debería permitir cambiar preservar estructura', async () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const preserveCheckbox = screen.getByLabelText('Preservar estructura de carpetas') as HTMLInputElement;
      expect(preserveCheckbox.checked).toBe(true); // Por defecto

      await userEvent.click(preserveCheckbox);
      expect(preserveCheckbox.checked).toBe(false);
    });

    it('debería cargar valores por defecto desde settings', () => {
      mockUseGetSetting.mockImplementation((key: string) => {
        if (key === 'conversion_bitrate') return { data: { value: '256' }, isLoading: false };
        if (key === 'conversion_output_folder') return { data: { value: '/default/output' }, isLoading: false };
        if (key === 'conversion_preserve_structure') return { data: { value: 'false' }, isLoading: false };
        return { data: null, isLoading: false };
      });

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const bitrateSelect = screen.getByLabelText('Bitrate MP3') as HTMLSelectElement;
      const outputInput = screen.getByLabelText('Carpeta de salida') as HTMLInputElement;
      const preserveCheckbox = screen.getByLabelText('Preservar estructura de carpetas') as HTMLInputElement;

      // Wait for settings to load
      waitFor(() => {
        expect(bitrateSelect.value).toBe('256');
        expect(outputInput.value).toBe('/default/output');
        expect(preserveCheckbox.checked).toBe(false);
      });
    });
  });

  describe('Proceso de conversión', () => {
    it('debería mostrar botón de convertir cuando hay archivos y carpeta', async () => {
      mockOpen.mockResolvedValueOnce(['/music/song.flac']);

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('song.flac')).toBeInTheDocument();
      });

      const outputInput = screen.getByLabelText('Carpeta de salida');
      await userEvent.type(outputInput, '/output');

      const convertButton = screen.getByRole('button', { name: 'Convertir a MP3' });
      expect(convertButton).toBeInTheDocument();
    });

    it('debería llamar mutate al hacer click en Convertir', async () => {
      mockOpen.mockResolvedValueOnce(['/music/song1.flac', '/music/song2.wav']);

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('2 archivos seleccionados')).toBeInTheDocument();
      });

      const outputInput = screen.getByLabelText('Carpeta de salida');
      await userEvent.type(outputInput, '/output/mp3');

      const convertButton = screen.getByRole('button', { name: 'Convertir a MP3' });
      await userEvent.click(convertButton);

      expect(mockMutate).toHaveBeenCalledWith(
        {
          inputPaths: ['/music/song1.flac', '/music/song2.wav'],
          options: {
            bitrate: 320,
            outputFolder: '/output/mp3',
            preserveStructure: true,
          },
        },
        expect.any(Object)
      );
    });

    it('debería mostrar progreso durante conversión', () => {
      mockUseBatchConvert.isPending = true;
      mockUseBatchConvert.progress = {
        currentFile: '/music/song1.flac',
        currentIndex: 1,
        totalFiles: 3,
        percentage: 33.3,
        status: 'converting',
      };

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      expect(screen.getByText('converting')).toBeInTheDocument();
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
      expect(screen.getByText('33.3% completado')).toBeInTheDocument();
      expect(screen.getByText(/Convirtiendo: song1\.flac/)).toBeInTheDocument();
    });

    it('debería mostrar barra de progreso con valor correcto', () => {
      mockUseBatchConvert.isPending = true;
      mockUseBatchConvert.progress = {
        currentFile: '/music/song.flac',
        currentIndex: 2,
        totalFiles: 4,
        percentage: 50,
        status: 'converting',
      };

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('debería deshabilitar controles durante conversión', () => {
      mockUseBatchConvert.isPending = true;

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      const bitrateSelect = screen.getByLabelText('Bitrate MP3');
      const outputInput = screen.getByLabelText('Carpeta de salida');

      expect(selectButton).toBeDisabled();
      expect(bitrateSelect).toBeDisabled();
      expect(outputInput).toBeDisabled();
    });
  });

  describe('Resultados de conversión', () => {
    it('debería mostrar resultados exitosos', async () => {
      mockOpen.mockResolvedValueOnce(['/music/song.flac']);

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText('song.flac'));

      const outputInput = screen.getByLabelText('Carpeta de salida');
      await userEvent.type(outputInput, '/output');

      const convertButton = screen.getByRole('button', { name: 'Convertir a MP3' });
      await userEvent.click(convertButton);

      // Simular éxito
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall[1];
      options.onSuccess([
        {
          inputPath: '/music/song.flac',
          outputPath: '/output/song.mp3',
          success: true,
          durationMs: 1500,
        },
      ]);

      await waitFor(() => {
        expect(screen.getByText('Conversión completada')).toBeInTheDocument();
        expect(screen.getByText('✓ Exitosos: 1')).toBeInTheDocument();
      });
    });

    it('debería mostrar resultados con errores', async () => {
      mockOpen.mockResolvedValueOnce(['/music/song1.flac', '/music/song2.wav']);

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText('2 archivos seleccionados'));

      const outputInput = screen.getByLabelText('Carpeta de salida');
      await userEvent.type(outputInput, '/output');

      const convertButton = screen.getByRole('button', { name: 'Convertir a MP3' });
      await userEvent.click(convertButton);

      // Simular resultados mixtos
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall[1];
      options.onSuccess([
        {
          inputPath: '/music/song1.flac',
          outputPath: '/output/song1.mp3',
          success: true,
          durationMs: 1500,
        },
        {
          inputPath: '/music/song2.wav',
          outputPath: '',
          success: false,
          error: 'Failed to encode',
          durationMs: 0,
        },
      ]);

      await waitFor(() => {
        expect(screen.getByText('✓ Exitosos: 1')).toBeInTheDocument();
        expect(screen.getByText('✗ Errores: 1')).toBeInTheDocument();
      });
    });

    it('debería mostrar mensaje de error general en fallo', async () => {
      mockUseBatchConvert.isError = true;
      mockUseBatchConvert.error = new Error('Conversion failed');

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Conversion failed')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('debería llamar onComplete al completar exitosamente', async () => {
      const onComplete = vi.fn();
      mockOpen.mockResolvedValueOnce(['/music/song.flac']);

      render(<ConversionDialog isOpen={true} onComplete={onComplete} />, {
        wrapper: createWrapper(),
      });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText('song.flac'));

      const outputInput = screen.getByLabelText('Carpeta de salida');
      await userEvent.type(outputInput, '/output');

      const convertButton = screen.getByRole('button', { name: 'Convertir a MP3' });
      await userEvent.click(convertButton);

      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall[1];
      const results = [
        {
          inputPath: '/music/song.flac',
          outputPath: '/output/song.mp3',
          success: true,
          durationMs: 1500,
        },
      ];
      options.onSuccess(results);

      expect(onComplete).toHaveBeenCalledWith(results);
    });

    it('debería llamar onError en caso de error', async () => {
      const onError = vi.fn();
      mockOpen.mockResolvedValueOnce(['/music/song.flac']);

      render(<ConversionDialog isOpen={true} onError={onError} />, {
        wrapper: createWrapper(),
      });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText('song.flac'));

      const outputInput = screen.getByLabelText('Carpeta de salida');
      await userEvent.type(outputInput, '/output');

      const convertButton = screen.getByRole('button', { name: 'Convertir a MP3' });
      await userEvent.click(convertButton);

      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall[1];
      const error = new Error('Conversion error');
      options.onError(error);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('debería llamar onClose al hacer click en cerrar', async () => {
      const onClose = vi.fn();

      render(<ConversionDialog isOpen={true} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const closeButton = screen.getByLabelText('Cerrar');
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('no debería permitir cerrar durante conversión', () => {
      const onClose = vi.fn();
      mockUseBatchConvert.isPending = true;

      render(<ConversionDialog isOpen={true} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const closeButton = screen.getByLabelText('Cerrar');
      expect(closeButton).toBeDisabled();
    });

    it('debería permitir cerrar después de completar', async () => {
      const onClose = vi.fn();
      mockOpen.mockResolvedValueOnce(['/music/song.flac']);

      render(<ConversionDialog isOpen={true} onClose={onClose} />, {
        wrapper: createWrapper(),
      });

      const selectButton = screen.getByText('Seleccionar Archivos');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText('song.flac'));

      const outputInput = screen.getByLabelText('Carpeta de salida');
      await userEvent.type(outputInput, '/output');

      const convertButton = screen.getByRole('button', { name: 'Convertir a MP3' });
      await userEvent.click(convertButton);

      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall[1];
      options.onSuccess([
        {
          inputPath: '/music/song.flac',
          outputPath: '/output/song.mp3',
          success: true,
          durationMs: 1500,
        },
      ]);

      await waitFor(() => {
        expect(screen.getByText('Conversión completada')).toBeInTheDocument();
      });

      // Hay dos botones "Cerrar": el X del header y el botón de la parte inferior
      // Queremos el de la parte inferior (el segundo)
      const closeButtons = screen.getAllByRole('button', { name: 'Cerrar' });
      const finalCloseButton = closeButtons[closeButtons.length - 1];
      await userEvent.click(finalCloseButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accesibilidad', () => {
    it('todos los inputs deberían tener labels', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText('Bitrate MP3')).toBeInTheDocument();
      expect(screen.getByLabelText('Carpeta de salida')).toBeInTheDocument();
      expect(screen.getByLabelText('Preservar estructura de carpetas')).toBeInTheDocument();
    });

    it('debería tener roles apropiados', () => {
      mockUseBatchConvert.isPending = true;
      mockUseBatchConvert.progress = {
        currentFile: '/music/song.flac',
        currentIndex: 1,
        totalFiles: 2,
        percentage: 50,
        status: 'converting',
      };

      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('debería tener aria-labels en botones sin texto', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText('Cerrar')).toBeInTheDocument();
    });

    it('todos los botones deberían tener type explícito', () => {
      render(<ConversionDialog isOpen={true} />, { wrapper: createWrapper() });

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});
