import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear();
    // Limpiar classList del document
    document.documentElement.classList.remove('dark');
  });

  it('debería inicializar con tema por defecto desde localStorage', () => {
    localStorage.setItem('theme', 'dark');
    
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe('dark');
  });

  it('debería usar preferencia del sistema cuando no hay localStorage', () => {
    // Mock de matchMedia para retornar dark mode
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe('dark');
  });

  it('debería cambiar el tema cuando se llama setTheme', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(result.current.theme).toBe('dark');
  });

  it('debería agregar clase "dark" al document cuando el tema es dark', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('debería remover clase "dark" del document cuando el tema es light', () => {
    document.documentElement.classList.add('dark');
    
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('light');
    });
    
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('debería persistir el tema en localStorage', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('debería alternar entre light y dark con toggleTheme', () => {
    const { result } = renderHook(() => useTheme());
    
    // Inicialmente light (o según preferencia del sistema)
    const initialTheme = result.current.theme;
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe(initialTheme === 'dark' ? 'light' : 'dark');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe(initialTheme);
  });

  it('debería actualizar localStorage al hacer toggle', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('light');
    });
    
    expect(localStorage.getItem('theme')).toBe('light');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('debería mantener sincronizado el DOM con el estado', () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(result.current.theme).toBe('dark');
    
    act(() => {
      result.current.setTheme('light');
    });
    
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(result.current.theme).toBe('light');
  });
});
