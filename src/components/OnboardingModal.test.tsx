import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';

import * as useLibraryHook from '../hooks/library';
import * as useSettingsHook from '../hooks/useSettings';
import { OnboardingModal } from './OnboardingModal';

// Mock Tauri dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

const mockOpen = vi.mocked(open);

// Mock useImportLibrary hook
const mockMutate = vi.fn();
const mockUseImportLibrary = {
  mutate: mockMutate,
  progress: { current: 0, total: 0, phase: 'scanning' as 'scanning' | 'importing' | 'complete' },
  isPending: false,
  isError: false,
  error: null as Error | null,
};

vi.spyOn(useLibraryHook, 'useImportLibrary').mockReturnValue(mockUseImportLibrary as any);

// Mock useUpdateSettings hook
const mockUpdateSettingsMutate = vi.fn();
vi.spyOn(useSettingsHook, 'useUpdateSettings').mockReturnValue({
  mutate: mockUpdateSettingsMutate,
  isPending: false,
} as any);

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

describe('OnboardingModal', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseImportLibrary.progress = {
      current: 0,
      total: 0,
      phase: 'scanning',
    };
    mockUseImportLibrary.isPending = false;
    mockUseImportLibrary.isError = false;
    mockUseImportLibrary.error = null;
  });

  describe('Welcome Step', () => {
    it('debería renderizar el paso de bienvenida', () => {
      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Bienvenido a Symphony/i)).toBeInTheDocument();
      expect(screen.getByText(/Tu nueva experiencia musical comienza aquí/i)).toBeInTheDocument();
    });

    it('debería mostrar las 3 características principales', () => {
      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      expect(screen.getByText('Organización Inteligente')).toBeInTheDocument();
      expect(screen.getByText('Reproducción Rápida')).toBeInTheDocument();
      expect(screen.getByText('Ultra Rápido')).toBeInTheDocument();
    });

    it('debería mostrar botón de selección de carpeta', () => {
      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      expect(screen.getByText('Elegir carpeta')).toBeInTheDocument();
    });

    it('debería deshabilitar el botón Comenzar si no hay carpeta seleccionada', () => {
      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      const startButton = screen.getByText(/Selecciona una carpeta primero/i);
      expect(startButton).toBeDisabled();
    });
  });

  describe('Folder Selection', () => {
    it('debería permitir seleccionar carpeta', async () => {
      mockOpen.mockResolvedValue('/test/music/folder');

      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Elegir carpeta');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalledWith({
          directory: true,
          multiple: false,
          title: 'Seleccionar carpeta de música',
        });
      });

      expect(screen.getByText(/\/test\/music\/folder/)).toBeInTheDocument();
    });

    it('debería habilitar el botón Comenzar después de seleccionar carpeta', async () => {
      mockOpen.mockResolvedValue('/music');

      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      const selectButton = screen.getByText('Elegir carpeta');
      await userEvent.click(selectButton);

      await waitFor(() => {
        const startButton = screen.getByText(/🚀 Comenzar/);
        expect(startButton).not.toBeDisabled();
      });
    });
  });

  describe('Import Flow', () => {
    it('debería iniciar importación al hacer click en Comenzar', async () => {
      mockOpen.mockResolvedValue('/music/library');

      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      // Seleccionar carpeta
      const selectButton = screen.getByText('Elegir carpeta');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText(/🚀 Comenzar/)).not.toBeDisabled();
      });

      // Hacer click en Comenzar
      const startButton = screen.getByText(/🚀 Comenzar/);
      await userEvent.click(startButton);

      // Verificar que se guardó el setting
      expect(mockUpdateSettingsMutate).toHaveBeenCalledWith([
        {
          key: 'library.import_folder',
          value: '/music/library',
          valueType: 'string',
        },
      ]);

      // Verificar que se inició la importación
      expect(mockMutate).toHaveBeenCalledWith('/music/library', expect.any(Object));
    });

    it('debería mostrar paso de importación con progreso', async () => {
      mockOpen.mockResolvedValue('/music');

      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      // Seleccionar y comenzar
      const selectButton = screen.getByText('Elegir carpeta');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText(/🚀 Comenzar/));

      const startButton = screen.getByText(/🚀 Comenzar/);
      await userEvent.click(startButton);

      // Verificar UI de importación
      await waitFor(() => {
        expect(screen.getByText(/Importando tu música/i)).toBeInTheDocument();
      });
    });

    it('debería mostrar progreso durante la importación', async () => {
      mockOpen.mockResolvedValue('/music');
      mockUseImportLibrary.progress = {
        current: 50,
        total: 100,
        phase: 'importing',
      };

      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      // Navegar al paso de importación
      const selectButton = screen.getByText('Elegir carpeta');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText(/🚀 Comenzar/));

      const startButton = screen.getByText(/🚀 Comenzar/);
      await userEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('importing')).toBeInTheDocument();
        expect(screen.getByText('50 / 100')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Step', () => {
    it('debería mostrar paso completado después de importación exitosa', async () => {
      mockOpen.mockResolvedValue('/music');

      const { rerender } = render(<OnboardingModal onComplete={mockOnComplete} />, {
        wrapper: createWrapper(),
      });

      // Seleccionar y comenzar
      const selectButton = screen.getByText('Elegir carpeta');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText(/🚀 Comenzar/));

      const startButton = screen.getByText(/🚀 Comenzar/);
      await userEvent.click(startButton);

      // Simular éxito en la importación
      const mutateCall = mockMutate.mock.calls[0];
      const onSuccessCallback = mutateCall[1].onSuccess;
      onSuccessCallback({ imported: 150, failed: 0, total: 150 });

      rerender(<OnboardingModal onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/¡Listo para disfrutar!/i)).toBeInTheDocument();
      });
    });

    it('debería llamar onComplete al hacer click en el botón final', async () => {
      mockOpen.mockResolvedValue('/music');

      const { rerender } = render(<OnboardingModal onComplete={mockOnComplete} />, {
        wrapper: createWrapper(),
      });

      // Navegar hasta complete
      const selectButton = screen.getByText('Elegir carpeta');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText(/🚀 Comenzar/));

      const startButton = screen.getByText(/🚀 Comenzar/);
      await userEvent.click(startButton);

      // Simular éxito
      const mutateCall = mockMutate.mock.calls[0];
      const onSuccessCallback = mutateCall[1].onSuccess;
      onSuccessCallback({ imported: 100, failed: 0, total: 100 });

      rerender(<OnboardingModal onComplete={mockOnComplete} />);

      await waitFor(() => screen.getByText(/Comenzar a usar Symphony/i));

      const finishButton = screen.getByText(/Comenzar a usar Symphony/i);
      await userEvent.click(finishButton);

      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('debería mostrar error si la importación falla', async () => {
      mockOpen.mockResolvedValue('/music');
      mockUseImportLibrary.isError = true;
      mockUseImportLibrary.error = new Error('Error de prueba');

      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      // Navegar al paso de importación
      const selectButton = screen.getByText('Elegir carpeta');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText(/🚀 Comenzar/));

      const startButton = screen.getByText(/🚀 Comenzar/);
      await userEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/Error de prueba/i)).toBeInTheDocument();
      });
    });

    it('debería permitir reintentar después de un error', async () => {
      mockOpen.mockResolvedValue('/music');
      mockUseImportLibrary.isError = true;
      mockUseImportLibrary.error = new Error('Error de prueba');

      render(<OnboardingModal onComplete={mockOnComplete} />, { wrapper: createWrapper() });

      // Navegar al paso de importación
      const selectButton = screen.getByText('Elegir carpeta');
      await userEvent.click(selectButton);

      await waitFor(() => screen.getByText(/🚀 Comenzar/));

      const startButton = screen.getByText(/🚀 Comenzar/);
      await userEvent.click(startButton);

      await waitFor(() => screen.getByText('Reintentar'));

      const retryButton = screen.getByText('Reintentar');
      await userEvent.click(retryButton);

      // Debería volver al paso welcome
      expect(screen.getByText(/Bienvenido a Symphony/i)).toBeInTheDocument();
    });
  });
});
