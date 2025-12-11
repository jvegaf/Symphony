# Changelog

Todos los cambios notables de Symphony se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/es/).

## [Unreleased]

### 📋 Milestone 0 - Setup Inicial (En Progreso)

#### Agregado - 2025-12-11

##### Documentación
- Creado `requirements.md` con requisitos completos en formato EARS
  - 10 requisitos funcionales (RF-001 a RF-010)
  - 5 requisitos no funcionales (RNF-001 a RNF-005)
  - Casos de uso principales y edge cases
  - Matriz de trazabilidad y confidence score (88%)
- Creado `design.md` con arquitectura técnica completa
  - Arquitectura de 3 capas (Frontend, Backend, Database)
  - Esquema de base de datos SQLite
  - Flujos de comunicación IPC
  - Consideraciones de performance y seguridad
- Creado `tasks.md` con plan detallado de implementación del Milestone 0
- Actualizado `implementation-plan.md` con progreso actual
- Actualizado `README.md` con información completa del proyecto

##### Infraestructura
- Inicializado proyecto Tauri v2.0 con React 18 y TypeScript
- Configurado TypeScript en strict mode
  - Habilitado `strict`, `noUnusedLocals`, `noUnusedParameters`
  - Habilitado `noImplicitReturns`, `noFallthroughCasesInSwitch`
- Configurado Tailwind CSS v4 con `@tailwindcss/postcss`
- Implementado modo oscuro con hook `useTheme`
  - Persistencia en localStorage
  - Detección de preferencia del sistema
  - Toggle dinámico

##### Componentes UI
- Creado componente `Button` con variantes primary/secondary
- Creado componente `Input` con soporte para label y error
- Creado componente `Card` para agrupar contenido
- Creada utilidad `cn()` para combinar clases CSS
- Implementados estilos globales con Tailwind

##### Desarrollo
- Configurado build de producción funcional
- Estructura de directorios según arquitectura diseñada
- Hot reload funcionando en modo desarrollo

#### Próximos Pasos
- ⏳ Configurar Vitest para testing frontend
- ⏳ Setup de cargo test para backend
- ⏳ Implementar esquema SQLite con migraciones
- ⏳ Configurar GitHub Actions para CI/CD

---

## [0.1.0] - Planeado para Q1 2026

### Milestone 1 - Core Audio
- Decodificación de audio con Symphonia
- Reproducción con Rodio
- Generación de waveforms
- Comandos Tauri de audio
- UI de AudioPlayer y WaveformViewer

### Milestone 2 - Importación de Biblioteca
- Escaneo recursivo de directorios
- Extracción de metadatos
- Importación con progreso en tiempo real
- UI de importación y lista de pistas

### Milestone 3 - Playlists y Edición
- CRUD de playlists
- Edición de metadatos
- Sistema de rating
- Drag & drop

### Milestone 4 - Análisis Avanzado
- Análisis de beatgrids
- Cue points personalizados
- Loops de reproducción
- UI de edición sobre waveform

### Milestone 5 - Settings y Conversión
- Sistema de configuración
- Conversión a MP3 opcional
- Refinamiento de UI

### Milestone 6 - Testing y Release
- Cobertura de tests ≥ 80%
- E2E tests
- Documentación completa
- Release v1.0.0

---

**Formato de Commits:** Este proyecto usa [Conventional Commits](https://www.conventionalcommits.org/es/)

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`
