# Symphony 🎵

Aplicación de escritorio profesional para gestionar bibliotecas musicales con importación, reproducción, análisis de audio y herramientas de organización avanzadas.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-0.12.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## ✨ Características

- 📁 **Importación de Bibliotecas:** Escaneo recursivo con preservación de estructura
- 🎵 **Reproducción Integrada:** Player completo con waveform interactivo (canvas propio, streaming progresivo, seek visual, feedback instantáneo). Ver [docs/waveform-implementation.md](./docs/waveform-implementation.md) para detalles.
- ⌨️ **Atajos de Teclado:** Navegación rápida con A/D (anterior/siguiente), W/S (±10s), Espacio (pausa)
- 📊 **Análisis de Audio:** Beatgrids automáticos, cue points y loops personalizados
- 📋 **Playlists:** Gestión completa con drag & drop
- ✏️ **Edición de Metadatos:** Editor integrado con rating de pistas (nuevo sistema visual de estrellas, mejoras UX v0.4.0)
- 🔄 **Conversión de Audio:** Opcional a MP3 durante importación
- 🌙 **Modo Oscuro:** Interfaz optimizada para uso prolongado
- 🎧 **Integración con Beatport:** Auto-completar tags faltantes (BPM, Key, Genre, Label, ISRC, Artwork) buscando en Beatport

## 🆕 Novedades v0.12.0

### 🔧 Mejoras de UX
- **Ordenamiento por Genre y Key:** Ahora puedes ordenar la tabla de tracks por las columnas Genre y Key haciendo click en el header
- **Indicadores visuales:** Las columnas Genre y Key muestran flechas de dirección al ordenar (↑ ascendente, ↓ descendente)

## 🆕 Novedades v0.11.0

### 🎧 Integración con Beatport (Fix Tags)
- **Auto-completar metadatos:** Click derecho en tracks seleccionados → "Fix Tags" para buscar en Beatport y completar automáticamente:
  - BPM (solo si no existe en local)
  - Key (tonalidad musical, siempre se actualiza)
  - Género
  - Label (sello discográfico)
  - ISRC
  - Artwork (portada del álbum)
- **Matching inteligente:** Algoritmo con ponderación (50% título, 30% artista, 20% duración) para encontrar el mejor resultado
- **Progreso visual:** Barra de progreso durante el proceso con indicadores por fase
- **Modal de resultados:** Muestra canciones encontradas y no encontradas al finalizar
- **Nuevos campos en DB:** Añadidos `label` e `isrc` a la tabla de tracks

## 🆕 Novedades v0.8.0

- **Cola de reproducción inteligente:** Se genera automáticamente al hacer doble click en una pista, respetando el orden visual de la tabla (columna ordenada)
- **Atajos de teclado para navegación:**
  - `A` — Ir al inicio de la canción. Doble pulsación (< 3s) → pista anterior
  - `D` — Siguiente pista en la cola
  - `W` — Retroceder 10 segundos
  - `S` — Avanzar 10 segundos
  - `Espacio` — Pausar/Reanudar
- **Navegación secuencial:** La cola mantiene el orden visual de la tabla, no se regenera al navegar con A/D

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

## ⚡ Waveform - Mejoras de rendimiento (v0.9.0)

- Implementado muestreo por búsqueda ("seek-sampling") en el backend Rust: se muestrean posiciones temporales uniformes y se decodifican solo unos pocos paquetes cerca de cada posición, reduciendo drásticamente la cantidad de datos decodificados.
- Renderizado progresivo en canvas: mientras se generan peaks en backend, el frontend dibuja únicamente la porción proporcional del canvas (crece de izquierda a derecha hasta completar el 100%). Esto mejora la percepción de rapidez en UI.
- Optimización de desarrollo: los crates de audio se compilan con `opt-level = 3` en el perfil `dev` para evitar la enorme penalización de rendimiento de Symphonia en modo debug.

Benchmarks (ejemplo con test-data/bang.mp3, ~362s):
- SEEK SAMPLING (release): ~0.15s para 800 peaks
- FULL DECODE (release): ~0.86s para 1950 peaks
- SEEK SAMPLING (dev optimized): ~1.35s
- FULL DECODE (dev unoptimized): ~33s (sin optimizaciones)

Comandos útiles:

```bash
# Ejecutar benchmark (release)
cd src-tauri && cargo run --bin waveform_bench --release

# Forzar regenerar waveform (borra cache DB local)
rm -f ~/.config/symphony/symphony.db

# Iniciar dev (ahora con optimizaciones en crates de audio)
npm run tauri dev
```

Ver detalles de implementación: [docs/waveform-implementation.md](./docs/waveform-implementation.md)

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
