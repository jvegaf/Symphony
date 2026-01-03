# Symphony 🎵

Aplicación de escritorio profesional para gestionar bibliotecas musicales con importación, reproducción, análisis de audio y herramientas de organización avanzadas.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
![Version](https://img.shields.io/badge/version-0.18.0-blue)
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![Tests](https://img.shields.io/badge/tests-868%20passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-80%25+-brightgreen)]()

## ✨ Características

- 🎉 **Onboarding de Primera Ejecución:** Wizard de bienvenida que guía al usuario en la configuración inicial
- 📁 **Importación de Bibliotecas:** Escaneo recursivo con preservación de estructura y detección automática de fechas
- 🗓️ **Detección Inteligente de Fechas:** Extrae fechas desde rutas (ej: `2401` → Enero 2024) para mejor organización
- 🎵 **Reproducción Integrada:** Player completo con waveform interactivo (canvas propio, streaming progresivo, seek visual, feedback instantáneo). Ver [docs/waveform-implementation.md](./docs/waveform-implementation.md) para detalles.
- ⌨️ **Atajos de Teclado:** Navegación rápida con A/D (anterior/siguiente), W/S (±10s), Espacio (pausa)
- 📊 **Análisis de Audio:** Beatgrids automáticos, cue points y loops personalizados
- 📋 **Playlists:** Gestión completa con drag & drop
- ✏️ **Edición de Metadatos:** Editor integrado con rating de pistas (nuevo sistema visual de estrellas, mejoras UX v0.4.0)
- 🔄 **Conversión de Audio:** Opcional a MP3 durante importación
- 🌙 **Modo Oscuro:** Interfaz optimizada para uso prolongado
- 🎧 **Integración con Beatport:** Selección manual de matches con indicadores visuales precisos

## 🆕 Novedades v0.18.0

### 🎉 Sistema de Onboarding para Primer Arranque

Symphony ahora incluye un wizard de bienvenida profesional que se muestra en la primera ejecución:

- **Paso 1 - Bienvenida:** Pantalla de introducción con 3 tarjetas destacando las características principales (Organización Inteligente, Reproducción Rápida, Ultra Rápido)
- **Paso 2 - Importación:** Progreso en tiempo real con barra animada, contador de archivos y fase actual
- **Paso 3 - Éxito:** Celebración con contador de pistas importadas y botón para comenzar a usar Symphony
- **Diseño moderno:** Gradientes vibrantes (purple → pink → orange), animaciones suaves, totalmente responsive
- **UX guiada:** El modal no se puede cerrar hasta completar el proceso, asegurando que el usuario configure su biblioteca

**Técnico:**
- Nuevo hook `useFirstRun` con 7 tests (100% cobertura)
- Componente `OnboardingModal` con 13 tests cubriendo todos los flujos
- Setting `app.first_run_completed` en base de datos SQLite
- 20 nuevos tests (total: **677 frontend + 191 backend = 868 tests pasando**)

### 🗓️ Detección Automática de Fechas desde Rutas

Symphony detecta automáticamente fechas en nombres de carpetas y las usa como `date_added`:

- **Formato YYMM:** `2401` → Enero 2024
- **Formato YYMMDD:** `240125` → 25 Enero 2024
- **Mejora la organización:** Las pistas mantienen su fecha original de importación según tu estructura de carpetas
- **Casos edge cubiertos:** Años bisiestos, meses inválidos, validación de días (24 tests)

**Ejemplo:**
```
/music/2401/Artist/Track.mp3  → date_added: "2024-01-01"
/music/240125/Album/Song.flac → date_added: "2024-01-25"
```

**Técnico:**
- Implementado en `src-tauri/src/utils/path_utils.rs`
- Funciones: `extract_date_from_path()`, `extract_full_date_from_path()`
- Integrado en el importador con fallback a timestamp actual
- Estrategia: YYMM → YYMMDD → current timestamp

### 🎨 UI de Configuración Mejorada

La sección de biblioteca en Settings tiene un diseño renovado:

- **"Carpeta de Música"** (antes "Carpeta de Importación")
- Input de solo lectura mostrando la ruta seleccionada
- Botón **"Elegir"** con degradado para abrir el selector nativo
- Explicación visual del sistema de detección de fechas YYMM
- Placeholder: "Ninguna carpeta seleccionada"

---

## 🆕 Novedades v0.17.0

### 🎛️ Player: tags reubicadas y cues eliminados

- Las tags (BPM, Key, Year, Genre) ahora aparecen debajo de los controles principales del reproductor para mayor claridad visual.
- Se eliminó la sección de cue points del player y todo el código relacionado, simplificando la interfaz y el flujo de usuario.
- Tests actualizados: se eliminaron pruebas de cues y se añadieron tests para overlays y tags.
- Validado: todos los tests frontend y backend pasan, cobertura ≥80%.

### 🦀 Rust: limpieza de binarios de test

- Se eliminaron imports no usados y se corrigieron imports de traits en los binarios de test Rust (`test_write_bpm.rs`, `test_beatport_writer.rs`, `test_bpm.rs`).
- Todos los binarios de test compilan sin warnings y pasan los tests.

### 🔼 Minor version bump

- Versión incrementada a 0.17.0 siguiendo semver.
- Documentación y README actualizados para reflejar los cambios recientes.

---

## 🆕 Novedades v0.16.0

### 🏗️ Mejoras Arquitectónicas

- **Logger con Dependency Inversion Principle:**
  - Sistema de logging desacoplado con interfaces abstractas
  - 4 niveles de severidad: DEBUG, INFO, WARN, ERROR
  - Factories para diferentes implementaciones (Console, Null, Custom)
  - Gestión global para configurar logger en toda la aplicación
  - 19 tests de cobertura completa

- **Documentación Viva de Convenciones:**
  - Suite de 10 tests documentando reglas de naming ([conventions.test.ts](./src/types/conventions.test.ts))
  - Valida: camelCase, snake_case, hooks (useXxx), factories (createXxx), predicados (isXxx)
  - Documenta constantes (UPPER_SNAKE_CASE), tipos (PascalCase), archivos de test (.test.ts(x))
  - Excepciones documentadas (date_created, date_modified para legacy DB)

- **Consolidación de Tipos TypeScript:**
  - Eliminados 5 tipos duplicados entre hooks y types/
  - Todos los Request types centralizados en `types/playlist.ts`
  - Migración completa de playlist IDs: `number` → `string` (UUID v4)
  - Consistencia entre frontend (TypeScript) y backend (Rust)
  - 17 errores de tipos pre-existentes corregidos

- **162 nuevos tests agregados** (total: **618/618 passing**)
- **0 errores de TypeScript** después del refactor

## 🆕 Novedades v0.13.0

### 🎯 Sistema de Tracking de Pistas Fixeadas
- **Indicador preciso en TrackTable:** Ahora solo muestra verde (✅) para tracks que realmente fueron procesados con Beatport
- **Nueva columna `beatport_id` en BD:** Tracking explícito de qué tracks fueron fixeados con Beatport (migración v5)
- **Indicador de duración coincidente:** En el modal de selección, los candidatos con duración similar (±5s) se resaltan en verde con ✓
- **Corrección de falsos positivos:** El indicador ya no muestra tracks con label/isrc de otras fuentes como "fixeados"

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

- **Tests Totales:** 618 (frontend + backend) — 100% passing ✅
- **Cobertura:** 80%+ en todos los módulos
- **Build:** Exitosa
- **TypeScript:** 0 errores (strict mode)
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

## 🏛️ Arquitectura

Symphony sigue principios de **Clean Architecture** con énfasis en:

### Dependency Inversion Principle (DIP)
- **Logger:** Abstracción con `Logger` interface, permite intercambiar implementaciones sin afectar código cliente
- **Factories:** `createConsoleLogger()`, `createNullLogger()`, `createLogger()` para instanciar según contexto
- **Global Management:** `setGlobalLogger()` para configurar implementación en toda la aplicación

### Interface Segregation Principle (ISP)
- **Tipos específicos:** Request types separados (`CreatePlaylistRequest`, `UpdatePlaylistRequest`, etc.)
- **Interfaces pequeñas:** Cada componente depende solo de métodos que realmente necesita

### Naming Conventions
Documentadas con tests vivos en [src/types/conventions.test.ts](./src/types/conventions.test.ts):
- **Componentes React:** PascalCase (ej: `TrackTable`, `AudioPlayer`)
- **Funciones/variables:** camelCase (ej: `formatDuration`, `trackId`)
- **Custom Hooks:** useXxx (ej: `useAudioPlayer`, `usePlaylistQueries`)
- **Factories:** createXxx (ej: `createConsoleLogger`)
- **Predicados:** isXxx (ej: `isValidTrack`)
- **Constantes:** UPPER_SNAKE_CASE (ej: `MAX_VOLUME`)
- **Tipos:** PascalCase (ej: `Track`, `Playlist`)
- **Tests:** .test.ts(x) (ej: `track.test.ts`)

**Excepciones documentadas:** `date_created`, `date_modified` (legacy database fields)

### Type Safety
- **TypeScript Strict Mode:** Sin `any`, tipos explícitos en toda la base de código
- **UUID v4 IDs:** Migración completa de `number` a `string` para consistencia con Rust backend
- **Type Consolidation:** Tipos Request centralizados en `types/` para evitar duplicación

### Testing Strategy
- **TDD Workflow:** Tests primero, luego implementación
- **Cobertura:** ≥80% enforcement en CI
- **618 tests totales** (162 agregados en v0.15.0)
- **Living Documentation:** Tests documentan patrones y convenciones (ej: `conventions.test.ts`)

Ver [ARCHITECTURE.md](./docs/ARCHITECTURE.md) para detalles completos.

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
