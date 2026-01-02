import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsModal } from './SettingsModal';

// AIDEV-NOTE: Mock de useSettingsForm para evitar dependencias de Tauri
vi.mock('../pages/Settings/hooks/useSettingsForm', () => ({
  useSettingsForm: () => ({
    localSettings: {
      ui: {
        theme: 'dark',
        language: 'es',
        waveformResolution: 800,
      },
      audio: {
        outputDevice: 'default',
        sampleRate: 44100,
        bufferSize: 512,
      },
      library: {
        autoScanOnStartup: false,
        scanIntervalHours: 24,
        importFolder: '',
      },
      conversion: {
        enabled: false,
        autoConvert: false,
        bitrate: 320,
        outputFolder: '',
        preserveStructure: true,
      },
    },
    setLocalSettings: vi.fn(),
    handleSave: vi.fn(),
    handleReset: vi.fn(),
    isUpdating: false,
    isResetting: false,
    isLoading: false,
    error: null,
  }),
}));

/**
 * Helper para renderizar componentes con QueryClient
 */
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('SettingsModal', () => {
  it('no renderiza cuando isOpen es false', () => {
    renderWithQueryClient(
      <SettingsModal isOpen={false} onClose={vi.fn()} />
    );

    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });

  it('renderiza el modal cuando isOpen es true', () => {
    renderWithQueryClient(
      <SettingsModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    // AIDEV-NOTE: Usamos getByRole para evitar conflictos con SVG titles que también contienen "Configuración"
    expect(screen.getByRole('heading', { name: 'Configuración' })).toBeInTheDocument();
  });

  it('muestra las 4 pestañas de configuración', () => {
    renderWithQueryClient(
      <SettingsModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByTestId('settings-tab-ui')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-audio')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-library')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-conversion')).toBeInTheDocument();
  });

  it('muestra los botones de guardar y reiniciar', () => {
    renderWithQueryClient(
      <SettingsModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByTestId('settings-save-button')).toBeInTheDocument();
    expect(screen.getByTestId('settings-reset-button')).toBeInTheDocument();
  });

  it('llama a onClose cuando se hace click en el botón de cerrar', () => {
    const onClose = vi.fn();
    renderWithQueryClient(
      <SettingsModal isOpen={true} onClose={onClose} />
    );

    const closeButton = screen.getByTestId('settings-modal-close');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('llama a onClose cuando se hace click en el backdrop', () => {
    const onClose = vi.fn();
    renderWithQueryClient(
      <SettingsModal isOpen={true} onClose={onClose} />
    );

    const backdrop = screen.getByTestId('settings-modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cambia de pestaña cuando se hace click en una tab', () => {
    renderWithQueryClient(
      <SettingsModal isOpen={true} onClose={vi.fn()} />
    );

    // Por defecto está en UI
    const audioTab = screen.getByTestId('settings-tab-audio');
    fireEvent.click(audioTab);

    // Verificar que el tab está activo (tiene las clases de estado activo)
    expect(audioTab).toHaveClass('bg-gradient-to-r', 'from-blue-500', 'to-purple-600');
  });

  it('cierra el modal con tecla Escape', () => {
    const onClose = vi.fn();
    renderWithQueryClient(
      <SettingsModal isOpen={true} onClose={onClose} />
    );

    // Simular presionar Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
