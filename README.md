# Symphony 🎵

Aplicación de escritorio profesional para gestionar bibliotecas musicales con importación, reproducción, análisis de audio y herramientas de organización avanzadas.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-0.1.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## ✨ Características

- 📁 **Importación de Bibliotecas:** Escaneo recursivo con preservación de estructura
- 🎵 **Reproducción Integrada:** Player completo con waveform interactivo
- 📊 **Análisis de Audio:** Beatgrids automáticos, cue points y loops personalizados
- 📋 **Playlists:** Gestión completa con drag & drop
- ✏️ **Edición de Metadatos:** Editor integrado con rating de pistas
- 🔄 **Conversión de Audio:** Opcional a MP3 durante importación
- 🌙 **Modo Oscuro:** Interfaz optimizada para uso prolongado

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Tauri 2.0 + Rust
- **Audio:** Symphonia (decodificación) + Rodio (reproducción)
- **Base de Datos:** SQLite
- **State Management:** Zustand / Jotai
- **Data Fetching:** TanStack Query

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

**Objetivo de cobertura:** ≥ 80%

## 📖 Documentación

- [Requisitos (EARS)](./docs/requirements.md) - Especificación completa de requisitos
- [Arquitectura](./docs/design.md) - Diseño técnico detallado
- [Plan de Implementación](./docs/implementation-plan.md) - Roadmap y milestones
- [Tareas](./docs/tasks.md) - Plan de tareas detallado
- [Estándares de Código](./.github/copilot-instructions.md)

## 🎯 Estado del Proyecto

**Milestone Actual:** Milestone 0 - Setup Inicial (62.5% completado)

### ✅ Completado
- Requisitos documentados en formato EARS
- Arquitectura técnica diseñada
- Proyecto Tauri + React + TypeScript inicializado
- Tailwind CSS configurado con modo oscuro
- Componentes UI base implementados

### 🔄 En Progreso
- Setup de testing (Vitest + cargo test)
- Esquema SQLite
- CI/CD con GitHub Actions

Ver [implementation-plan.md](./docs/implementation-plan.md) para detalles completos.

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
