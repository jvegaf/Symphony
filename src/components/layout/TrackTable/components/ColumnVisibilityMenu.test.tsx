/**
 * Tests para ColumnVisibilityMenu
 * Menú contextual para mostrar/ocultar columnas de la tabla
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu';
import type { SortColumn } from '../hooks/useTrackSorting';

describe('ColumnVisibilityMenu', () => {
  const mockOnToggleColumn = vi.fn();
  const mockOnResetColumns = vi.fn();
  const mockOnClose = vi.fn();

  const defaultVisibleColumns: Set<SortColumn> = new Set([
    'fixed',
    'title',
    'artist',
    'album',
    'duration',
    'bpm',
    'rating',
    'year',
    'dateAdded',
    'bitrate',
    'genre',
    'key',
  ]);

  const defaultProps = {
    isOpen: true,
    position: { x: 100, y: 200 },
    visibleColumns: defaultVisibleColumns,
    onToggleColumn: mockOnToggleColumn,
    onResetColumns: mockOnResetColumns,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderizado', () => {
    it('debe renderizar cuando isOpen=true', () => {
      render(<ColumnVisibilityMenu {...defaultProps} />);

      expect(screen.getByText(/column visibility/i)).toBeInTheDocument();
    });

    it('NO debe renderizar cuando isOpen=false', () => {
      render(<ColumnVisibilityMenu {...defaultProps} isOpen={false} />);

      expect(screen.queryByText(/column visibility/i)).not.toBeInTheDocument();
    });

    it('debe posicionarse en las coordenadas especificadas', () => {
      render(<ColumnVisibilityMenu {...defaultProps} />);

      // El menú se renderiza en un portal (document.body), usar screen en vez de container
      const menu = screen.getByTestId('column-visibility-menu');
      expect(menu).toHaveStyle({
        left: '100px',
        top: '200px',
      });
    });

    it('debe renderizar todas las columnas', () => {
      render(<ColumnVisibilityMenu {...defaultProps} />);

      expect(screen.getByText('Fixed')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Artist')).toBeInTheDocument();
      expect(screen.getByText('Album')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('BPM')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('Year')).toBeInTheDocument();
      expect(screen.getByText('Date Added')).toBeInTheDocument();
      expect(screen.getByText('Bitrate')).toBeInTheDocument();
      expect(screen.getByText('Genre')).toBeInTheDocument();
      expect(screen.getByText('Key')).toBeInTheDocument();
    });
  });

  describe('Estado de checkboxes', () => {
    it('debe mostrar checked para columnas visibles', () => {
      render(<ColumnVisibilityMenu {...defaultProps} />);

      const titleCheckbox = screen.getByLabelText('Title') as HTMLInputElement;
      expect(titleCheckbox.checked).toBe(true);

      const genreCheckbox = screen.getByLabelText('Genre') as HTMLInputElement;
      expect(genreCheckbox.checked).toBe(true);
    });

    it('debe mostrar unchecked para columnas ocultas', () => {
      const visibleWithHidden: Set<SortColumn> = new Set([
        'fixed',
        'title',
        'artist',
        'album',
        'duration',
        'rating',
        'dateAdded',
      ]);

      render(
        <ColumnVisibilityMenu
          {...defaultProps}
          visibleColumns={visibleWithHidden}
        />,
      );

      const bpmCheckbox = screen.getByLabelText('BPM') as HTMLInputElement;
      expect(bpmCheckbox.checked).toBe(false);

      const genreCheckbox = screen.getByLabelText('Genre') as HTMLInputElement;
      expect(genreCheckbox.checked).toBe(false);
    });

    it('debe deshabilitar columnas obligatorias (title, artist)', () => {
      render(<ColumnVisibilityMenu {...defaultProps} />);

      const titleCheckbox = screen.getByLabelText('Title') as HTMLInputElement;
      expect(titleCheckbox.disabled).toBe(true);

      const artistCheckbox = screen.getByLabelText('Artist') as HTMLInputElement;
      expect(artistCheckbox.disabled).toBe(true);
    });

    it('NO debe deshabilitar columnas no obligatorias', () => {
      render(<ColumnVisibilityMenu {...defaultProps} />);

      const genreCheckbox = screen.getByLabelText('Genre') as HTMLInputElement;
      expect(genreCheckbox.disabled).toBe(false);

      const bpmCheckbox = screen.getByLabelText('BPM') as HTMLInputElement;
      expect(bpmCheckbox.disabled).toBe(false);
    });
  });

  describe('Interacciones', () => {
    it('debe llamar onToggleColumn al hacer click en checkbox', async () => {
      const user = userEvent.setup();
      render(<ColumnVisibilityMenu {...defaultProps} />);

      const genreCheckbox = screen.getByLabelText('Genre');
      await user.click(genreCheckbox);

      expect(mockOnToggleColumn).toHaveBeenCalledWith('genre');
      expect(mockOnToggleColumn).toHaveBeenCalledTimes(1);
    });

    it('debe permitir toggle de múltiples columnas', async () => {
      const user = userEvent.setup();
      render(<ColumnVisibilityMenu {...defaultProps} />);

      await user.click(screen.getByLabelText('Genre'));
      await user.click(screen.getByLabelText('Key'));
      await user.click(screen.getByLabelText('Bitrate'));

      expect(mockOnToggleColumn).toHaveBeenCalledTimes(3);
      expect(mockOnToggleColumn).toHaveBeenNthCalledWith(1, 'genre');
      expect(mockOnToggleColumn).toHaveBeenNthCalledWith(2, 'key');
      expect(mockOnToggleColumn).toHaveBeenNthCalledWith(3, 'bitrate');
    });

    it('NO debe permitir toggle de columnas obligatorias', async () => {
      const user = userEvent.setup();
      render(<ColumnVisibilityMenu {...defaultProps} />);

      await user.click(screen.getByLabelText('Title'));
      await user.click(screen.getByLabelText('Artist'));

      expect(mockOnToggleColumn).not.toHaveBeenCalled();
    });

    it('debe llamar onResetColumns al hacer click en Reset', async () => {
      const user = userEvent.setup();
      render(<ColumnVisibilityMenu {...defaultProps} />);

      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      expect(mockOnResetColumns).toHaveBeenCalledTimes(1);
    });

    it('debe cerrar menú al hacer click en Close', async () => {
      const user = userEvent.setup();
      render(<ColumnVisibilityMenu {...defaultProps} />);

      // Usamos getAllByRole y buscamos el botón con icono X (no el backdrop)
      const buttons = screen.getAllByRole('button', { name: /close/i });
      // El botón de cerrar con X es el segundo (el primero es el backdrop)
      const closeButton = buttons.find(btn => btn.querySelector('svg'));
      expect(closeButton).toBeDefined();
      
      await user.click(closeButton!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('debe cerrar menú al hacer click fuera (backdrop)', async () => {
      const user = userEvent.setup();
      render(<ColumnVisibilityMenu {...defaultProps} />);

      const backdrop = screen.getByTestId('column-visibility-backdrop');
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('NO debe cerrar menú al hacer click dentro del menú', async () => {
      const user = userEvent.setup();
      render(<ColumnVisibilityMenu {...defaultProps} />);

      const menu = screen.getByTestId('column-visibility-menu');
      await user.click(menu);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Teclas de atajo', () => {
    it('debe cerrar menú al presionar Escape', async () => {
      const user = userEvent.setup();
      render(<ColumnVisibilityMenu {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('debe resetear columnas al presionar Ctrl+R', async () => {
      const user = userEvent.setup();
      render(<ColumnVisibilityMenu {...defaultProps} />);

      await user.keyboard('{Control>}r{/Control}');

      expect(mockOnResetColumns).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tooltip de columnas obligatorias', () => {
    it('debe mostrar tooltip explicando por qué title está deshabilitado', () => {
      render(<ColumnVisibilityMenu {...defaultProps} />);

      const titleLabel = screen.getByText('Title').closest('label');
      expect(titleLabel).toHaveAttribute(
        'title',
        'Required column - cannot be hidden',
      );
    });

    it('debe mostrar tooltip explicando por qué artist está deshabilitado', () => {
      render(<ColumnVisibilityMenu {...defaultProps} />);

      const artistLabel = screen.getByText('Artist').closest('label');
      expect(artistLabel).toHaveAttribute(
        'title',
        'Required column - cannot be hidden',
      );
    });
  });

  describe('Contador de columnas visibles', () => {
    it('debe mostrar contador de columnas visibles', () => {
      render(<ColumnVisibilityMenu {...defaultProps} />);

      expect(screen.getByText(/12\/12 columns visible/i)).toBeInTheDocument();
    });

    it('debe actualizar contador cuando hay columnas ocultas', () => {
      const visibleWithHidden: Set<SortColumn> = new Set([
        'fixed',
        'title',
        'artist',
        'album',
        'duration',
        'rating',
      ]);

      render(
        <ColumnVisibilityMenu
          {...defaultProps}
          visibleColumns={visibleWithHidden}
        />,
      );

      expect(screen.getByText(/6\/12 columns visible/i)).toBeInTheDocument();
    });
  });
});
