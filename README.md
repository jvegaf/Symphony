# Symphony 🎵

Aplicación de escritorio profesional para gestionar bibliotecas musicales con importación, reproducción, análisis de audio y herramientas de organización avanzadas.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-0.4.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## ✨ Características

- 📁 **Importación de Bibliotecas:** Escaneo recursivo con preservación de estructura
- 🎵 **Reproducción Integrada:** Player completo con waveform interactivo (canvas propio, streaming progresivo, seek visual, feedback instantáneo). Ver [docs/waveform-implementation.md](./docs/waveform-implementation.md) para detalles.
- 📊 **Análisis de Audio:** Beatgrids automáticos, cue points y loops personalizados
- 📋 **Playlists:** Gestión completa con drag & drop
- ✏️ **Edición de Metadatos:** Editor integrado con rating de pistas (nuevo sistema visual de estrellas, mejoras UX v0.4.0)
- 🔄 **Conversión de Audio:** Opcional a MP3 durante importación
- 🌙 **Modo Oscuro:** Interfaz optimizada para uso prolongado

## ⭐️ Novedades v0.4.0

- ⭐️ **Sistema de rating visual mejorado:**
  - Componente de estrellas con hover preciso (rellena hasta la estrella seleccionada)
  - Tamaños ajustados (sm=16px, md=20px, lg=28px) y sin espacios entre estrellas (gap-0)
  - Mejor integración en tablas y editor de metadatos
  - Cobertura de tests completa (20/20 tests StarRating)
- 🚦 **Script de chequeo CI local (`scripts/check-ci.sh`):**
  - Valida workflows de CI antes de hacer push
  - Modos: --fast, --frontend, --backend
  - Checks: types, lint, tests, coverage, rustfmt, clippy, cargo tests
  - Documentación: [scripts/CI_CHECK_GUIDE.md](./scripts/CI_CHECK_GUIDE.md)

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Tauri 2.0 + Rust
- **Audio:** Symphonia (decodificación) + Rodio (reproducción)
- **Base de Datos:** SQLite
- **State Management:** Zustand / Jotai
- **Data Fetching:** TanStack Query

## 🚧 Desarrollo

### Script de chequeo CI local (opcional)

Puedes validar todos los checks de CI localmente antes de hacer push usando:

```bash
./scripts/check-ci.sh         # Todos los checks (frontend + backend)
./scripts/check-ci.sh --fast  # Modo rápido (sin coverage ni build)
./scripts/check-ci.sh --frontend  # Solo frontend
./scripts/check-ci.sh --backend   # Solo backend
```

- Documentación completa: [scripts/CI_CHECK_GUIDE.md](./scripts/CI_CHECK_GUIDE.md)
- Alias en Makefile: `make ci-check`, `make ci-check-fast`, etc.
- **Ahorra 5-15 minutos por commit** evitando errores en GitHub Actions


## 📋 Requisitos

- **Node.js:** 18+
- **Rust:** 1.70+
- **npm:** 8+

### Linux
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/jvegaf/Symphony.git
cd Symphony

# Instalar dependencias
npm install

# Modo desarrollo
npm run tauri dev

# Build de producción
npm run build
npm run tauri build
```

### Con Makefile (Recomendado)

```bash
# Setup inicial completo
make setup

# Modo desarrollo
make dev

# Ejecutar tests
make test

# Build de producción
make build

# Ver todos los comandos
make help
```

Ver [MAKEFILE.md](./docs/MAKEFILE.md) para documentación completa.

## 📁 Estructura del Proyecto

```
symphony/
├── src/                    # Frontend React
│   ├── components/         # Componentes reutilizables
│   ├── hooks/             # Custom hooks
│   ├── pages/             # Páginas principales
│   ├── stores/            # Estado global
│   └── styles/            # Estilos globales
├── src-tauri/             # Backend Rust
│   ├── src/
│   │   ├── audio/         # Módulo de audio
│   │   ├── library/       # Gestión de biblioteca
│   │   ├── db/            # Base de datos
│   │   └── commands/      # Comandos Tauri
│   └── tests/             # Tests de integración
├── docs/                  # Documentación
│   ├── requirements.md    # Requisitos (EARS)
│   ├── design.md         # Arquitectura
│   ├── tasks.md          # Plan de tareas
│   └── implementation-plan.md
└── .github/               # CI/CD y configuración
```

## 🧪 Testing

```bash
# Tests frontend
npm test
npm run test:coverage

# Tests backend
cd src-tauri
cargo test
cargo tarpaulin  # Cobertura
```

### Con Makefile

```bash
# Ejecutar todos los tests (frontend + backend)
make test

# Generar reportes de cobertura
make coverage

# Tests en modo watch (desarrollo)
make test-watch

# Verificación completa (lint + types + tests)
make check
```

**Objetivo de cobertura:** ≥ 80%

## 📖 Documentación

- [Requisitos (EARS)](./docs/requirements.md) - Especificación completa de requisitos
- [Arquitectura](./docs/design.md) - Diseño técnico detallado
- [Plan de Implementación](./docs/implementation-plan.md) - Roadmap y milestones
- [Tareas](./docs/tasks.md) - Plan de tareas detallado
- [Estándares de Código](./.github/copilot-instructions.md)

## 🎯 Estado del Proyecto

**Progreso General:** 37.5% (3 de 8 milestones completados)

### ✅ Milestones Completados
- **Milestone 0:** Setup Inicial (68 tests)
- **Milestone 1:** Core Audio - Decodificación, reproducción, waveforms (82 tests)
- **Milestone 2:** Importación de Biblioteca - Scanner, metadata, importación (222 tests)

### 🔄 Siguiente Milestone
- **Milestone 3:** Playlists y Edición - CRUD, drag & drop, editor de metadatos

### 📊 Estadísticas Actuales
- **Tests Totales:** 222 (153 frontend + 69 backend)
- **Cobertura:** 80%+ en todos los módulos
- **Componentes React:** 9
- **Comandos Tauri:** 13
- **Formatos Soportados:** MP3, FLAC, WAV, OGG, M4A, AAC

Ver [project-status.md](./docs/project-status.md) y [implementation-plan.md](./docs/implementation-plan.md) para detalles completos.

## 🤝 Contribuir

Este proyecto sigue los estándares de [Conventional Commits](https://www.conventionalcommits.org/es/).

```bash
# Formato de commits
<tipo>(<alcance>): <descripción>

# Ejemplos
feat(audio): agregar soporte para loops personalizados
fix(library): corregir sincronización de metadatos FLAC
docs(setup): actualizar instrucciones de instalación
```

Ver [git-workflow.instructions.md](./.github/instructions/git-workflow.instructions.md) para más detalles.

## 📝 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 🔗 Enlaces

- [Documentación de Tauri](https://v2.tauri.app/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## 👥 Equipo

- **Desarrollador Principal:** [@jvegaf](https://github.com/jvegaf)

---

**Nota:** Este proyecto está en desarrollo activo. Symphony v1.0.0 está planeado para Q1 2026.
