/**
 * Tests para el componente Header
 * 
 * Verifica:
 * - Renderizado de tabs y controles de ventana
 * - Funcionalidad de drag (data-tauri-drag-region)
 * - Doble-click para maximizar ventana
 * - Botones de minimizar, maximizar y cerrar
 * - Display de progreso de importación
 * - Badge de selección de tracks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import type { ImportProgress } from '../../types/library';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Mock de @tauri-apps/api/window
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
    close: vi.fn(),
  })),
}));

describe('Header', () => {
  const defaultProgress: ImportProgress = {
    current: 0,
    total: 0,
    phase: 'scanning',
  };

  const defaultProps = {
    activeTab: 'library' as const,
    onTabChange: vi.fn(),
    onImport: vi.fn(),
    onSettingsClick: vi.fn(),
    isImporting: false,
    progress: defaultProgress,
    selectedTracksCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderizado básico', () => {
    it('debería renderizar el header correctamente', () => {
      render(<Header {...defaultProps} />);
      
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('debería renderizar todos los tabs', () => {
      render(<Header {...defaultProps} />);
      
      expect(screen.getByTestId('tab-library')).toBeInTheDocument();
      expect(screen.getByTestId('tab-settings')).toBeInTheDocument();
      expect(screen.getByTestId('tab-import')).toBeInTheDocument();
      expect(screen.getByTestId('tab-export')).toBeInTheDocument();
      expect(screen.getByTestId('tab-tools')).toBeInTheDocument();
    });

    it('debería renderizar los controles de ventana', () => {
      render(<Header {...defaultProps} />);
      
      expect(screen.getByTestId('window-minimize')).toBeInTheDocument();
      expect(screen.getByTestId('window-maximize')).toBeInTheDocument();
      expect(screen.getByTestId('window-close')).toBeInTheDocument();
    });

    it('debería tener el atributo data-tauri-drag-region para drag de ventana', () => {
      const { container } = render(<Header {...defaultProps} />);
      
      const dragRegion = container.querySelector('[data-tauri-drag-region]');
      expect(dragRegion).toBeInTheDocument();
    });
  });

  describe('Navegación de tabs', () => {
    it('debería resaltar el tab activo', () => {
      render(<Header {...defaultProps} activeTab="library" />);
      
      const libraryTab = screen.getByTestId('tab-library');
      expect(libraryTab).toHaveClass('bg-primary');
    });

    it('debería llamar onTabChange al hacer click en un tab', () => {
      const onTabChange = vi.fn();
      render(<Header {...defaultProps} onTabChange={onTabChange} />);
      
      fireEvent.click(screen.getByTestId('tab-export'));
      expect(onTabChange).toHaveBeenCalledWith('export');
    });

    it('debería llamar onSettingsClick al hacer click en Settings', () => {
      const onSettingsClick = vi.fn();
      render(<Header {...defaultProps} onSettingsClick={onSettingsClick} />);
      
      fireEvent.click(screen.getByTestId('tab-settings'));
      expect(onSettingsClick).toHaveBeenCalled();
    });

    it('debería llamar onImport al hacer click en Import', () => {
      const onImport = vi.fn();
      render(<Header {...defaultProps} onImport={onImport} />);
      
      fireEvent.click(screen.getByTestId('tab-import'));
      expect(onImport).toHaveBeenCalled();
    });
  });

  describe('Controles de ventana', () => {
    it('debería llamar minimize al hacer click en el botón minimizar', () => {
      const mockWindow = {
        minimize: vi.fn(),
        toggleMaximize: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(getCurrentWindow).mockReturnValue(mockWindow as never);

      render(<Header {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('window-minimize'));
      expect(mockWindow.minimize).toHaveBeenCalled();
    });

    it('debería llamar toggleMaximize al hacer click en el botón maximizar', () => {
      const mockWindow = {
        minimize: vi.fn(),
        toggleMaximize: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(getCurrentWindow).mockReturnValue(mockWindow as never);

      render(<Header {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('window-maximize'));
      expect(mockWindow.toggleMaximize).toHaveBeenCalled();
    });

    it('debería llamar close al hacer click en el botón cerrar', () => {
      const mockWindow = {
        minimize: vi.fn(),
        toggleMaximize: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(getCurrentWindow).mockReturnValue(mockWindow as never);

      render(<Header {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('window-close'));
      expect(mockWindow.close).toHaveBeenCalled();
    });
  });

  describe('Funcionalidad de drag', () => {
    it('debería llamar toggleMaximize al hacer doble-click en la región draggable', () => {
      const mockWindow = {
        minimize: vi.fn(),
        toggleMaximize: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(getCurrentWindow).mockReturnValue(mockWindow as never);

      const { container } = render(<Header {...defaultProps} />);
      const dragRegion = container.querySelector('[data-tauri-drag-region]');
      
      expect(dragRegion).toBeInTheDocument();
      fireEvent.doubleClick(dragRegion!);
      
      expect(mockWindow.toggleMaximize).toHaveBeenCalled();
    });

    it('debería permitir interacción con elementos hijos (pointer-events: auto)', () => {
      const onTabChange = vi.fn();
      render(<Header {...defaultProps} onTabChange={onTabChange} />);
      
      // Los tabs deben seguir siendo clickeables a pesar de estar en la región draggable
      fireEvent.click(screen.getByTestId('tab-library'));
      expect(onTabChange).toHaveBeenCalled();
    });
  });

  describe('Estado de importación', () => {
    it('debería mostrar "Escaneando..." cuando phase es scanning', () => {
      render(
        <Header 
          {...defaultProps} 
          isImporting={true} 
          progress={{ current: 0, total: 0, phase: 'scanning' }}
        />
      );
      
      expect(screen.getByTestId('import-status')).toHaveTextContent('Escaneando...');
    });

    it('debería mostrar progreso cuando phase es importing', () => {
      render(
        <Header 
          {...defaultProps} 
          isImporting={true} 
          progress={{ current: 5, total: 10, phase: 'importing' }}
        />
      );
      
      expect(screen.getByTestId('import-status')).toHaveTextContent('Importando 5/10');
    });

    it('debería mostrar "¡Completado!" cuando phase es complete', () => {
      render(
        <Header 
          {...defaultProps} 
          isImporting={true} 
          progress={{ current: 10, total: 10, phase: 'complete' }}
        />
      );
      
      expect(screen.getByTestId('import-status')).toHaveTextContent('¡Completado!');
    });

    it('debería mostrar la barra de progreso durante la importación', () => {
      render(
        <Header 
          {...defaultProps} 
          isImporting={true} 
          progress={{ current: 5, total: 10, phase: 'importing' }}
        />
      );
      
      expect(screen.getByTestId('import-progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('import-progress-fill')).toHaveStyle({ width: '50%' });
    });
  });

  describe('Badge de selección', () => {
    it('no debería mostrar el badge cuando no hay tracks seleccionados', () => {
      render(<Header {...defaultProps} selectedTracksCount={0} />);
      
      expect(screen.queryByTestId('selection-badge')).not.toBeInTheDocument();
    });

    it('debería mostrar el badge cuando hay 1 track seleccionado', () => {
      render(<Header {...defaultProps} selectedTracksCount={1} />);
      
      const badge = screen.getByTestId('selection-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('1 track seleccionado');
    });

    it('debería mostrar el badge en plural cuando hay múltiples tracks', () => {
      render(<Header {...defaultProps} selectedTracksCount={5} />);
      
      const badge = screen.getByTestId('selection-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5 tracks seleccionados');
    });
  });

  describe('Accesibilidad', () => {
    it('los botones de ventana deben tener aria-label', () => {
      render(<Header {...defaultProps} />);
      
      expect(screen.getByTestId('window-minimize')).toHaveAttribute('aria-label', 'Minimizar ventana');
      expect(screen.getByTestId('window-maximize')).toHaveAttribute('aria-label', 'Maximizar ventana');
      expect(screen.getByTestId('window-close')).toHaveAttribute('aria-label', 'Cerrar ventana');
    });

    it('la región draggable debe tener role="button" para accesibilidad', () => {
      const { container } = render(<Header {...defaultProps} />);
      const dragRegion = container.querySelector('[data-tauri-drag-region]');
      
      expect(dragRegion).toHaveAttribute('role', 'button');
    });

    it('debería responder a la tecla Enter en la región draggable', () => {
      const mockWindow = {
        minimize: vi.fn(),
        toggleMaximize: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(getCurrentWindow).mockReturnValue(mockWindow as never);

      const { container } = render(<Header {...defaultProps} />);
      const dragRegion = container.querySelector('[data-tauri-drag-region]');
      
      fireEvent.keyDown(dragRegion!, { key: 'Enter' });
      expect(mockWindow.toggleMaximize).toHaveBeenCalled();
    });
  });
});
