---
agent: 'agent'
model: Claude Sonnet 4.5 (copilot)
tools: ['search/codebase', 'web/githubRepo']
description: 'Generar un nuevo componente React con tests'
---

# Generar Componente React

Tu objetivo es generar un nuevo componente React reutilizable siguiendo los estándares de Symphony.

## Información Necesaria

Si no está proporcionada, pregunta por:
1. **Nombre del componente** (ej: `AudioPlayer`, `TrackList`)
2. **Props que acepta** (ej: `track: Track`, `onPlay: () => void`)
3. **Funcionalidad principal** (descripción breve)
4. **Estilos especiales** (dark mode, responsivo, etc.)

## Requisitos

### Estructura
- Componente funcional en TypeScript con tipos estrictos
- Máximo 200 líneas (incluyendo JSDoc)
- Integración con Tailwind CSS (modo oscuro)
- Archivo de test junto al componente

### Implementación
- JSDoc completo con tipos, ejemplos
- Nombres descriptivos en camelCase para funciones
- Manejo de errores explícito
- Comentarios que expliquen "por qué", no "qué"

### Testing
- Tests unitarios con Vitest + React Testing Library
- Mínimo 80% cobertura
- Tests prueban comportamiento, no implementación
- Queries por accessibility roles (`getByRole`, `getByLabel`)

### Estilos
- Usa Tailwind con `cn()` para condicionales
- Soporta `dark:` prefix
- Responsive design
- Componentes pequeños (max 100 líneas sin lógica compleja)

## Proceso

1. **Define interfaz de props** - TypeScript estricto
2. **Escribe tests** - Primero (TDD)
3. **Implementa componente** - Para pasar tests
4. **Agrega estilos** - Tailwind + dark mode
5. **Documenta** - JSDoc + ejemplos

## Output Esperado

```
src/components/NombreComponente.tsx       - Componente
src/components/NombreComponente.test.tsx  - Tests (80%+ coverage)
```

## Ejemplo

**Entrada:**
```
Nombre: WaveformViewer
Props: track: Track, currentTime?: number, onSeek?: (time: number) => void
Funcionalidad: Visualiza forma de onda interactiva de pista
Estilos: Responsive, dark mode, altura personalizable
```

**Output:**
- Componente con WaveSurfer.js integrado
- Tests para interacción y prop changes
- Integración con stores de reproducción
- Estilos Tailwind responsivos
