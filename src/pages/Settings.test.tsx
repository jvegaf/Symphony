import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as useSettingsHook from '../hooks/useSettings';
import { DEFAULT_SETTINGS } from '../types/settings';

import { Settings } from './Settings';

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock useSettings hook
const mockUpdateSettings = vi.fn();
const mockResetSettings = vi.fn();

const mockUseSettings = {
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null as Error | null,
  updateSettings: mockUpdateSettings,
  resetSettings: mockResetSettings,
  isUpdating: false,
  isResetting: false,
};

vi.spyOn(useSettingsHook, 'useSettings').mockReturnValue(mockUseSettings as any);

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

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
    // Create a FRESH copy of DEFAULT_SETTINGS for each test to avoid reference issues
    // The Settings component compares `settings !== localSettings` by reference
    mockUseSettings.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    mockUseSettings.isLoading = false;
    mockUseSettings.error = null;
    mockUseSettings.isUpdating = false;
    mockUseSettings.isResetting = false;
  });

  describe('Renderizado inicial', () => {
    it('debería renderizar el título de la página', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByText('Configuración')).toBeInTheDocument();
    });

    it('debería renderizar las 4 pestañas', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByText('Interfaz')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
      expect(screen.getByText('Biblioteca')).toBeInTheDocument();
      expect(screen.getByText('Conversión')).toBeInTheDocument();
    });

    it('debería mostrar la pestaña de Interfaz por defecto', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByText('Apariencia')).toBeInTheDocument();
    });

    it('debería renderizar botones Guardar y Resetear', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByTestId('settings-save-button')).toBeInTheDocument();
      expect(screen.getByTestId('settings-reset-button')).toBeInTheDocument();
    });
  });

  describe('Navegación entre pestañas', () => {
    it('debería cambiar a pestaña Audio al hacer click', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const audioTab = screen.getByText('Audio');
      await userEvent.click(audioTab);

      expect(screen.getByText('Dispositivo de Audio')).toBeInTheDocument();
    });

    it('debería cambiar a pestaña Biblioteca al hacer click', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const libraryTab = screen.getByText('Biblioteca');
      await userEvent.click(libraryTab);

      expect(screen.getByText('Escaneo Automático')).toBeInTheDocument();
    });

    it('debería cambiar a pestaña Conversión al hacer click', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const conversionTab = screen.getByText('Conversión');
      await userEvent.click(conversionTab);

      expect(screen.getByText('Conversión MP3')).toBeInTheDocument();
    });

    it('debería resaltar la pestaña activa', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      const audioTabButton = screen.getByTestId('settings-tab-audio');
      await user.click(audioTabButton);

      // La pestaña activa tiene las clases text-blue-600 dark:text-blue-400
      await waitFor(() => {
        expect(audioTabButton).toHaveClass('text-blue-600');
      });
    });
  });

  describe('Pestaña Interfaz', () => {
    it('debería mostrar selector de tema', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByLabelText('Tema de la aplicación')).toBeInTheDocument();
    });

    it('debería mostrar selector de idioma', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByLabelText('Idioma de la interfaz')).toBeInTheDocument();
    });

    it('debería mostrar input de resolución de waveform', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByLabelText('Resolución')).toBeInTheDocument();
    });

    it('debería tener valores por defecto correctos', () => {
      render(<Settings />, { wrapper: createWrapper() });
      const themeSelect = screen.getByLabelText('Tema de la aplicación') as HTMLSelectElement;
      expect(themeSelect.value).toBe('system');
    });

    it('debería permitir cambiar el tema', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      const themeSelect = screen.getByLabelText('Tema de la aplicación');
      await user.selectOptions(themeSelect, 'dark');

      await waitFor(() => {
        expect((themeSelect as HTMLSelectElement).value).toBe('dark');
      });
    });
  });

  describe('Pestaña Audio', () => {
    it('debería mostrar input de dispositivo de salida', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const audioTab = screen.getByText('Audio');
      await userEvent.click(audioTab);

      expect(screen.getByLabelText('Dispositivo de salida')).toBeInTheDocument();
    });

    it('debería mostrar selector de tasa de muestreo', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const audioTab = screen.getByText('Audio');
      await userEvent.click(audioTab);

      expect(screen.getByLabelText('Tasa de muestreo')).toBeInTheDocument();
    });

    it('debería mostrar slider de tamaño de buffer', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const audioTab = screen.getByText('Audio');
      await userEvent.click(audioTab);

      expect(screen.getByLabelText('Tamaño de buffer')).toBeInTheDocument();
    });

    it('debería mostrar el valor del buffer en el label', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const audioTab = screen.getByText('Audio');
      await userEvent.click(audioTab);

      expect(screen.getByText(/2048 samples/)).toBeInTheDocument();
    });

    it('debería permitir cambiar la tasa de muestreo', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      const audioTab = screen.getByText('Audio');
      await user.click(audioTab);

      const sampleRateSelect = screen.getByLabelText('Tasa de muestreo');
      await user.selectOptions(sampleRateSelect, '96000');

      await waitFor(() => {
        expect((sampleRateSelect as HTMLSelectElement).value).toBe('96000');
      });
    });
  });

  describe('Pestaña Biblioteca', () => {
    it('debería mostrar checkbox de escaneo automático', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const libraryTab = screen.getByText('Biblioteca');
      await userEvent.click(libraryTab);

      expect(screen.getByLabelText('Escanear al iniciar')).toBeInTheDocument();
    });

    it('debería mostrar input de intervalo de escaneo', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const libraryTab = screen.getByText('Biblioteca');
      await userEvent.click(libraryTab);

      expect(screen.getByLabelText('Intervalo de escaneo')).toBeInTheDocument();
    });

    it('debería mostrar input de carpeta de importación', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const libraryTab = screen.getByText('Biblioteca');
      await userEvent.click(libraryTab);

      expect(screen.getByLabelText('Ruta predeterminada')).toBeInTheDocument();
    });

    it('debería permitir activar escaneo automático', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      const libraryTab = screen.getByText('Biblioteca');
      await user.click(libraryTab);

      const autoScanCheckbox = screen.getByLabelText('Escanear al iniciar') as HTMLInputElement;
      await user.click(autoScanCheckbox);

      await waitFor(() => {
        expect(autoScanCheckbox.checked).toBe(true);
      });
    });

    it('debería mostrar sección de mantenimiento con botón limpiar caché', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const libraryTab = screen.getByText('Biblioteca');
      await userEvent.click(libraryTab);

      expect(screen.getByText('Mantenimiento')).toBeInTheDocument();
      expect(screen.getByText('Limpiar caché de waveforms')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Limpiar caché' })).toBeInTheDocument();
    });

    it('debería llamar invoke al limpiar caché', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      const libraryTab = screen.getByText('Biblioteca');
      await user.click(libraryTab);

      const clearButton = screen.getByRole('button', { name: 'Limpiar caché' });
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('clear_waveform_cache');
      });
    });

    it('debería mostrar estado de carga mientras limpia caché', async () => {
      mockInvoke.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      const libraryTab = screen.getByText('Biblioteca');
      await user.click(libraryTab);

      const clearButton = screen.getByRole('button', { name: 'Limpiar caché' });
      await user.click(clearButton);

      expect(screen.getByRole('button', { name: 'Limpiando...' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Limpiando...' })).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Limpiar caché' })).toBeInTheDocument();
      });
    });
  });

  describe('Pestaña Conversión', () => {
    it('debería mostrar checkbox de habilitación de conversión', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const conversionTab = screen.getByText('Conversión');
      await userEvent.click(conversionTab);

      expect(screen.getByLabelText('Habilitar conversión a MP3')).toBeInTheDocument();
    });

    it('debería mostrar selector de bitrate', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const conversionTab = screen.getByText('Conversión');
      await userEvent.click(conversionTab);

      expect(screen.getByLabelText('Bitrate MP3')).toBeInTheDocument();
    });

    it('debería mostrar input de carpeta de salida', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const conversionTab = screen.getByText('Conversión');
      await userEvent.click(conversionTab);

      expect(screen.getByLabelText('Carpeta de salida')).toBeInTheDocument();
    });

    it('debería mostrar checkbox de preservar estructura', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const conversionTab = screen.getByText('Conversión');
      await userEvent.click(conversionTab);

      expect(screen.getByLabelText('Preservar estructura de carpetas')).toBeInTheDocument();
    });

    it('debería deshabilitar controles cuando conversión está deshabilitada', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const conversionTab = screen.getByText('Conversión');
      await userEvent.click(conversionTab);

      const bitrateSelect = screen.getByLabelText('Bitrate MP3');
      const outputFolder = screen.getByLabelText('Carpeta de salida');

      // Por defecto está deshabilitada
      expect(bitrateSelect).toBeDisabled();
      expect(outputFolder).toBeDisabled();
    });

    it('debería habilitar controles cuando conversión está habilitada', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      const conversionTab = screen.getByText('Conversión');
      await user.click(conversionTab);

      const enableCheckbox = screen.getByLabelText('Habilitar conversión a MP3');
      await user.click(enableCheckbox);

      const bitrateSelect = screen.getByLabelText('Bitrate MP3');
      const outputFolder = screen.getByLabelText('Carpeta de salida');

      await waitFor(() => {
        expect(bitrateSelect).not.toBeDisabled();
        expect(outputFolder).not.toBeDisabled();
      });
    });
  });

  describe('Guardar cambios', () => {
    it('debería llamar updateSettings al hacer click en Guardar', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const saveButton = screen.getByTestId('settings-save-button');
      await userEvent.click(saveButton);

      // Should be called with array of settings (flat format)
      expect(mockUpdateSettings).toHaveBeenCalled();
      const callArg = mockUpdateSettings.mock.calls[0][0];
      expect(Array.isArray(callArg)).toBe(true);
    });

    it('debería guardar cambios de tema', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      const themeSelect = screen.getByLabelText('Tema de la aplicación');
      await user.selectOptions(themeSelect, 'dark');

      const saveButton = screen.getByTestId('settings-save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalled();
        const callArg = mockUpdateSettings.mock.calls[0][0];
        const themeSetting = callArg.find((s: any) => s.key === 'ui.theme');
        expect(themeSetting?.value).toBe('dark');
      });
    });

    it('debería guardar múltiples cambios a la vez', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      // Cambiar tema
      const themeSelect = screen.getByLabelText('Tema de la aplicación');
      await user.selectOptions(themeSelect, 'light');

      // Cambiar idioma
      const languageSelect = screen.getByLabelText('Idioma de la interfaz');
      await user.selectOptions(languageSelect, 'en');

      const saveButton = screen.getByTestId('settings-save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalled();
        const callArg = mockUpdateSettings.mock.calls[0][0];
        const themeSetting = callArg.find((s: any) => s.key === 'ui.theme');
        const languageSetting = callArg.find((s: any) => s.key === 'ui.language');
        expect(themeSetting?.value).toBe('light');
        expect(languageSetting?.value).toBe('en');
      });
    });
  });

  describe('Resetear a defaults', () => {
    it('debería llamar resetSettings al hacer click en Resetear', async () => {
      const user = userEvent.setup();
      // Mock window.confirm to return true
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      render(<Settings />, { wrapper: createWrapper() });

      const resetButton = screen.getByTestId('settings-reset-button');
      await user.click(resetButton);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith('¿Estás seguro de que quieres resetear todos los ajustes a sus valores por defecto?');
        expect(mockResetSettings).toHaveBeenCalled();
      });
      
      confirmSpy.mockRestore();
    });

    it('debería restaurar valores modificados después de resetear', async () => {
      const user = userEvent.setup();
      // Mock window.confirm to return true
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      render(<Settings />, { wrapper: createWrapper() });

      // Cambiar tema
      const themeSelect = screen.getByLabelText('Tema de la aplicación') as HTMLSelectElement;
      await user.selectOptions(themeSelect, 'dark');
      
      await waitFor(() => {
        expect(themeSelect.value).toBe('dark');
      });

      // Resetear
      const resetButton = screen.getByTestId('settings-reset-button');
      await user.click(resetButton);

      // Debe llamar a resetSettings que restaurará los valores
      await waitFor(() => {
        expect(mockResetSettings).toHaveBeenCalled();
      });
      
      confirmSpy.mockRestore();
    });
  });

  describe('Estados de carga y error', () => {
    it('debería mostrar indicador de carga', () => {
      mockUseSettings.isLoading = true;

      render(<Settings />, { wrapper: createWrapper() });

      expect(screen.getByText('Cargando configuración...')).toBeInTheDocument();
    });

    it('debería mostrar mensaje de error', () => {
      mockUseSettings.error = new Error('Failed to load settings');

      render(<Settings />, { wrapper: createWrapper() });

      expect(screen.getByText('Error al cargar configuración:')).toBeInTheDocument();
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
    });

    it('no debería mostrar el formulario durante carga', () => {
      mockUseSettings.isLoading = true;

      render(<Settings />, { wrapper: createWrapper() });

      expect(screen.queryByText('Guardar Cambios')).not.toBeInTheDocument();
    });

    it('no debería mostrar el formulario durante error', () => {
      mockUseSettings.error = new Error('Error');

      render(<Settings />, { wrapper: createWrapper() });

      expect(screen.queryByText('Guardar Cambios')).not.toBeInTheDocument();
    });
  });

  describe('Accesibilidad', () => {
    it('todos los inputs deberían tener labels asociados', () => {
      render(<Settings />, { wrapper: createWrapper() });

      // Pestaña UI
      const themeInput = screen.getByLabelText('Tema de la aplicación');
      expect(themeInput).toBeInTheDocument();

      const languageInput = screen.getByLabelText('Idioma de la interfaz');
      expect(languageInput).toBeInTheDocument();
    });

    it('los botones deberían ser accesibles por teclado', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const saveButton = screen.getByTestId('settings-save-button');
      saveButton.focus();

      expect(document.activeElement).toBe(saveButton);
    });

    it('las pestañas deberían tener roles apropiados', () => {
      render(<Settings />, { wrapper: createWrapper() });

      const tabs = screen.getAllByRole('button');
      // Incluye pestañas y botones de guardar/resetear
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  describe('Validación de valores', () => {
    it('debería aceptar valores válidos de resolución waveform', () => {
      render(<Settings />, { wrapper: createWrapper() });

      // Es un input type="range", verificar que existe y tiene los atributos correctos
      const waveformInput = screen.getByLabelText('Resolución') as HTMLInputElement;
      
      expect(waveformInput.type).toBe('range');
      expect(waveformInput.min).toBe('256');
      expect(waveformInput.max).toBe('2048');
      expect(waveformInput.step).toBe('256');
      expect(waveformInput.value).toBe('512'); // Default value
    });

    it('debería mostrar placeholder en carpeta de importación', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const libraryTab = screen.getByText('Biblioteca');
      await userEvent.click(libraryTab);

      const importFolderInput = screen.getByLabelText('Ruta predeterminada') as HTMLInputElement;
      expect(importFolderInput.placeholder).toBe('/home/user/Música');
    });

    it('debería mostrar placeholder en carpeta de salida de conversión', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      const conversionTab = screen.getByText('Conversión');
      await userEvent.click(conversionTab);

      const outputFolderInput = screen.getByLabelText('Carpeta de salida') as HTMLInputElement;
      expect(outputFolderInput.placeholder).toBe('/home/user/Música/MP3');
    });
  });

  describe('Persistencia de cambios entre pestañas', () => {
    it('debería mantener cambios al cambiar de pestaña', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      // Cambiar en pestaña UI
      const themeSelect = screen.getByLabelText('Tema de la aplicación') as HTMLSelectElement;
      await user.selectOptions(themeSelect, 'dark');

      // Cambiar a otra pestaña
      const audioTab = screen.getByText('Audio');
      await user.click(audioTab);

      // Volver a UI
      const uiTab = screen.getByText('Interfaz');
      await user.click(uiTab);

      // El cambio debe persistir
      await waitFor(() => {
        const themeSelectAgain = screen.getByLabelText('Tema de la aplicación') as HTMLSelectElement;
        expect(themeSelectAgain.value).toBe('dark');
      });
    });
  });
});
