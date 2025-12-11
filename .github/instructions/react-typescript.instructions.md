---
applyTo: "src/**/*.ts,src/**/*.tsx"
description: "Estándares para desarrollo con React 18 y TypeScript en Symphony"
---

# Desarrollo React 18 + TypeScript

## Estructura de Componentes

### Componentes Funcionales
- Usa siempre componentes funcionales, nunca class components
- Máximo 200 líneas por componente (incluyendo tests)
- Si excede, divide en componentes más pequeños

```typescript
// Estructura recomendada
export interface ComponentProps {
  // Props documentadas
}

export const Component: React.FC<ComponentProps> = ({ prop1 }) => {
  // Hooks
  // Estado
  // Handlers
  // Render
  return <div></div>;
};

Component.displayName = "Component";
```

### TypeScript Strict Mode
- **Nunca** uses `any`
- Define interfaces para todos los props
- Type all state variables explícitamente cuando sea ambiguo
- Usa `satisfies` para validación sin cambiar tipos

### Naming Conventions
- Componentes: `PascalCase` (ej: `AudioPlayer`, `LibraryBrowser`)
- Utilidades: `camelCase` (ej: `formatDuration`, `parseMetadata`)
- Constantes: `UPPER_SNAKE_CASE` (ej: `MAX_PLAYLIST_SIZE`)
- Archivos: Coincide con nombre del export principal

## Hooks y Estado

### Custom Hooks
- Comienzan con `use` prefix
- Abstraen lógica reutilizable
- Tipificados completamente
- Incluyen documentación JSDoc

```typescript
/**
 * Hook para gestionar reproducción de audio
 * @param trackId - ID de la pista a reproducir
 * @returns Control de reproducción y estado actual
 */
export const useAudioPlayer = (trackId: string) => {
  // Implementación
};
```

### State Management (Zustand/Jotai)
- Divide por feature, no por tipo de dato
- Stores cercanos a donde se usan
- Siempre tipificados con TypeScript
- Usa immer para actualización inmutable

```typescript
// ✓ Bien: Organizado por feature
const usePlaylistStore = create<PlaylistState>((set) => ({
  playlists: [],
  addPlaylist: (playlist) => set((state) => ({
    playlists: [...state.playlists, playlist],
  })),
}));

// ✗ Evita: Organizado por tipo
const useStore = create((set) => ({
  // Todo mezclado
}));
```

### TanStack Query
- Centraliza todas las queries de datos
- Usa `useQuery` para lecturas, `useMutation` para escrituras
- Configure cache según criticidad del dato
- Implementa error boundaries

```typescript
export const useGetTracks = (libraryId: string) => {
  return useQuery({
    queryKey: ["tracks", libraryId],
    queryFn: () => getTracks(libraryId),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};
```

## Estilos (Tailwind CSS)

### Clases Tailwind
- Mantén clases en el JSX, no en strings dinámicos
- Usa `clsx` o `cn` para condicionales
- Soporta modo oscuro con `dark:` prefix
- Agrupa estilos lógicamente

```typescript
// ✓ Bien
<div className={cn(
  "p-4 rounded-lg",
  "bg-white dark:bg-slate-950",
  "border border-gray-200 dark:border-gray-800",
  isSelected && "ring-2 ring-blue-500",
)}>
  {/* Contenido */}
</div>

// ✗ Evita
<div className={`p-4 ${isSelected ? 'ring-2' : ''}`}>
```

### Componentes Reutilizables
- Crea componentes para UI compleja
- Documenta props y comportamiento
- Incluye variantes con `class-variance-authority` si es necesario

## Manejo de Errores

### Error Boundaries
- Implementa boundary por sección major
- Muestra UI amigable al usuario
- Registra errores en logs

```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <FeatureSection />
</ErrorBoundary>
```

### Manejo de Async
- Usa `try/catch` con async/await
- Captura errores de red y API explícitamente
- Proporciona feedback visual al usuario

```typescript
const handleImportLibrary = async () => {
  try {
    setIsLoading(true);
    const result = await importLibrary(path);
    showSuccess("Biblioteca importada");
  } catch (error) {
    if (error instanceof NetworkError) {
      showError("Sin conexión");
    } else {
      showError("Error durante importación");
    }
  } finally {
    setIsLoading(false);
  }
};
```

## Performance

### Optimización de Re-renders
- Usa `React.memo` solo cuando medidas muestren necesidad
- Prefiere optimización de lógica sobre memo
- Memoriza callbacks largos con `useCallback`
- Memoriza objetos de contexto complejos

### Code Splitting
- Usa lazy loading para rutas principales
- Suspense para loading states
- Agrupa por feature, no por tamaño

```typescript
const LibraryBrowser = lazy(() => 
  import("./pages/LibraryBrowser")
);

<Suspense fallback={<LoadingSpinner />}>
  <LibraryBrowser />
</Suspense>
```

### Visualización (WaveSurfer/Peaks)
- Encapsula en componentes dedicados
- Maneja ciclo de vida correctamente
- Limpia resources en useEffect cleanup

## Testing (Vitest + React Testing Library)

### Estructura de Tests
- Coloca tests junto al componente
- Archivo: `Component.test.tsx`
- Usa `describe` para agrupar tests relacionados

```typescript
// Component.tsx
export const AudioPlayer: React.FC<Props> = ({ track }) => {
  // Implementación
};

// Component.test.tsx
describe("AudioPlayer", () => {
  it("debería reproducir pista al hacer click", () => {
    // Test implementation
  });
});
```

### Testing Patterns
- Prueba comportamiento, no implementación
- Usa `userEvent` en lugar de `fireEvent`
- Query por accessibility roles (getByRole, etc.)
- Evita querys por CSS classes
- Mock llamadas a Tauri explícitamente

```typescript
it("debería mostrar controles de reproducción", () => {
  render(<AudioPlayer track={mockTrack} />);
  
  const playButton = screen.getByRole("button", { name: /reproducir/i });
  expect(playButton).toBeInTheDocument();
  
  userEvent.click(playButton);
  expect(mockOnPlay).toHaveBeenCalled();
});
```

## Integración con Tauri

### Command Invocation
- Centraliza llamadas Tauri en hooks personalizados
- Siempre especifica tipos de retorno
- Maneja errores específicos de Tauri

```typescript
export const useImportLibrary = () => {
  return useMutation({
    mutationFn: async (path: string) => {
      try {
        const result = await invoke<LibraryImportResult>(
          "import_library",
          { path }
        );
        return result;
      } catch (error) {
        throw new LibraryImportError(error);
      }
    },
  });
};
```

### Listeners
- Registra listeners en useEffect
- Limpia listeners en cleanup
- Tipifica evento completamente

```typescript
useEffect(() => {
  const unlisten = listen<SyncEvent>("library:synced", (event) => {
    setLastSync(event.payload.timestamp);
  });

  return () => {
    unlisten.then(f => f());
  };
}, []);
```

## Comentarios y Documentación

### JSDoc
- Documenta funciones y componentes públicos
- Incluye tipos, parámetros y retorno
- Agrupa métodos relacionados

```typescript
/**
 * Visualizador interactivo de formas de onda
 * Soporta zoom, navegación y marcado de puntos clave
 * 
 * @component
 * @example
 * <WaveformViewer track={track} onCuePointAdd={handler} />
 */
export const WaveformViewer: React.FC<Props> = ({ track }) => {
  // Implementación
};
```

### Comentarios Inline
- Explica "por qué", no "qué"
- Evita comentarios obvios
- Usa para resaltar decisiones no obvias

```typescript
// ✓ Bien: Explica lógica no obvia
const sortedTracks = tracks.sort((a, b) => {
  // Ordenar por beatgrid primero, luego por duración
  // para optimizar análisis de transiciones
  return (a.hasBeatgrid ? 0 : 1) - (b.hasBeatgrid ? 0 : 1);
});

// ✗ Evita: Obvio del código
const result = calculateCRC32(data); // Calcula CRC32
```

## Importes

- Usa importes ES6 (`import/export`)
- Agrupa: React → librerías → locales
- Usa path aliases para importes profundos

```typescript
import React, { FC } from "react";

import { useQuery } from "@tanstack/react-query";

import { WaveformViewer } from "@/components/WaveformViewer";
import { useAudioStore } from "@/stores/audio";
```

---

*Referencia: React 18 con TypeScript strict mode en Tauri 2.0*
