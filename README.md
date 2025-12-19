# Symphony 🎵

Aplicación de escritorio profesional para gestionar bibliotecas musicales con importación, reproducción, análisis de audio y herramientas de organización avanzadas.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-0.7.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## ✨ Características

- 📁 **Importación de Bibliotecas:** Escaneo recursivo con preservación de estructura
- 🎵 **Reproducción Integrada:** Player completo con waveform interactivo (canvas propio, streaming progresivo, seek visual, feedback instantáneo). Ver [docs/waveform-implementation.md](./docs/waveform-implementation.md) para detalles.
- 📊 **Análisis de Audio:** Beatgrids automáticos, cue points y loops personalizados
- 📋 **Playlists:** Gestión completa con drag & drop
- ✏️ **Edición de Metadatos:** Editor integrado con rating de pistas (nuevo sistema visual de estrellas, mejoras UX v0.4.0)
- 🔄 **Conversión de Audio:** Opcional a MP3 durante importación
- 🌙 **Modo Oscuro:** Interfaz optimizada para uso prolongado

## 🐛 Últimas correcciones críticas (v0.5.1)

- Tres bugs críticos de interacción con waveform RESUELTOS ([commit eb3ea9a](https://github.com/jvegaf/Symphony/commit/eb3ea9a)):
  - Seek en waveform ahora funciona correctamente (evento 'click')
  - Waveform solo se genera al reproducir (doble click), no al seleccionar
  - Overlay de CuePointEditor ya no bloquea clicks (patrón pointer-events)
- Documentación técnica: [`docs/WAVEFORM_FIXES_COMPLETE.md`](./docs/WAVEFORM_FIXES_COMPLETE.md), [`docs/WAVEFORM_FIXES_QUICKREF.md`](./docs/WAVEFORM_FIXES_QUICKREF.md)
- Script de verificación: [`scripts/verify-waveform-fixes.sh`](./scripts/verify-waveform-fixes.sh)

## 📦 Instalación

### Linux

Descarga el paquete para tu distribución desde [Releases](https://github.com/jvegaf/Symphony/releases):

- **`.deb`** - Debian, Ubuntu, Linux Mint, Pop!_OS, Elementary, etc.
  ```bash
  sudo dpkg -i Symphony_0.7.0_amd64.deb
  ```

- **`.rpm`** - Fedora, RHEL, CentOS, openSUSE, etc.
  ```bash
  sudo rpm -i Symphony-0.7.0-1.x86_64.rpm
  # o con dnf:
  sudo dnf install Symphony-0.7.0-1.x86_64.rpm
  ```

- **Arch Linux (AUR):**
  ```bash
  # Con yay
  yay -S symphony-bin

  # Con paru
  paru -S symphony-bin

  # O compilar desde fuente
  cd aur/
  makepkg -si

  # O instalar el paquete

  pacman -U paquete.pkg.tar.zst
  ```

- **Otras distribuciones - Compilar desde fuente:**
  ```bash
  git clone https://github.com/jvegaf/Symphony.git
  cd Symphony
  make build-linux
  ```

> **Nota:** AppImage temporalmente deshabilitado por incompatibilidad con Tauri 2.9.6. Ver [docs/APPIMAGE_DISABLED.md](./docs/APPIMAGE_DISABLED.md) para detalles.

### Windows / macOS

Próximamente en releases oficiales.

## 🧪 Testing

- **Tests Totales:** 567 (420 frontend + 147 backend) — 100% passing ✅
- **Cobertura:** 80%+ en todos los módulos
- **Build:** Exitosa (331.31 kB)
- No hay bugs críticos abiertos en el sistema de waveform

## 🛠️ Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo (hot-reload)
npm run tauri dev

# Tests
make test              # todos los tests
npm test              # frontend only
cd src-tauri && cargo test  # backend only

# Build producción
make build-linux       # .deb + .rpm
npm run tauri build   # usa tauri.conf.json targets

# Linting
make check            # lint + type-check + test
```

Ver [Makefile](./Makefile) para más comandos.

## 📚 Documentación

- **[Design](./docs/design.md)** - Arquitectura y decisiones técnicas
- **[API](./docs/API.md)** - Comandos Tauri y tipos
- **[Waveform](./docs/waveform-implementation.md)** - Sistema de visualización de audio
- **[Tasks](./docs/tasks.md)** - Roadmap y tareas pendientes
- **[Milestones](./docs/)** - Progreso de desarrollo (M0-M6)

## 🏗️ Stack Tecnológico

- **Frontend:** React 19 + TypeScript (strict) + TailwindCSS + shadcn/ui
- **Backend:** Rust + Tauri 2.0 + SQLite
- **Audio:** Symphonia (decodificación) + Web Audio API (reproducción)
- **Build:** Vite + Cargo + GitHub Actions

## 📄 Licencia

MIT License - Ver [LICENSE](./LICENSE) para detalles.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feat/amazing-feature`)
3. Commit tus cambios (Conventional Commits)
4. Push a la rama (`git push origin feat/amazing-feature`)
5. Abre un Pull Request

**Requisitos:** Tests deben pasar (≥80% cobertura), seguir guías de estilo del proyecto.
