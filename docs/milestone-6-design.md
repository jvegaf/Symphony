# Milestone 6 - Testing E2E, Refinamiento UI/UX y Release v1.0.0

## Diseño Técnico Detallado

**Versión:** v1.0.0  
**Fecha:** 17 dic 2025  
**Estado:** En diseño

---

## 1. Resumen Ejecutivo

### Objetivo
Completar Symphony v1.0.0 con testing end-to-end robusto, refinamiento de UI/UX, optimización de performance y preparación para release público.

### Alcance
- Tests E2E automatizados con Playwright/Tauri
- Refinamiento de interfaz de usuario
- Optimización de performance (carga, memoria, CPU)
- Documentación de usuario completa
- Scripts de release automation
- Validación de requisitos no funcionales (RNF)
- Accessibility improvements

### Fuera de Alcance (v1.1.0+)
- Integración con APIs externas (Beatport, Traxsource, etc.)
- Soporte para Windows/macOS (focus en Linux primero)
- Cloud sync de bibliotecas
- Plugins de terceros
- Mobile apps

---

## 2. Análisis de Requisitos

### Tests E2E Requeridos

#### Flujo 1: Importación de Biblioteca
**Escenario:** Usuario importa biblioteca musical por primera vez
- Abrir aplicación
- Click en "Importar Biblioteca"
- Seleccionar carpeta con 100 archivos de audio
- Verificar progreso en tiempo real
- Validar que 100 pistas aparecen en TrackList
- Verificar metadatos correctos (título, artista, duración)

**Criterio de éxito:** Importación completa en < 2 min (RNF-001.2)

#### Flujo 2: Reproducción con Análisis
**Escenario:** Usuario reproduce pista y visualiza análisis
- Seleccionar pista de biblioteca
- Doble-click para reproducir
- Verificar que waveform se genera
- Verificar que controles de player funcionan (play/pause/stop/seek)
- Crear 2 cue points manualmente
- Verificar que cue points se guardan

**Criterio de éxito:** Reproducción inicia en < 500ms (CU-002)

#### Flujo 3: Gestión de Playlists
**Escenario:** Usuario crea y gestiona playlist
- Crear nueva playlist "Test Playlist"
- Arrastrar 10 pistas a playlist
- Reordenar pistas con drag & drop
- Eliminar 2 pistas de playlist
- Guardar playlist
- Reabrir aplicación y verificar persistencia

**Criterio de éxito:** Playlist creada sin errores (CU-003)

#### Flujo 4: Edición de Metadatos
**Escenario:** Usuario edita metadatos de pista
- Seleccionar pista
- Abrir editor de metadatos
- Cambiar título, artista, BPM
- Asignar rating de 4 estrellas
- Guardar cambios
- Verificar que cambios persisten

#### Flujo 5: Conversión MP3
**Escenario:** Usuario convierte archivos a MP3
- Abrir configuración
- Habilitar conversión MP3
- Configurar bitrate 320kbps
- Seleccionar carpeta de salida
- Convertir 3 archivos FLAC
- Verificar progreso
- Validar que archivos MP3 existen

**Criterio de éxito:** Conversión de archivo 5min < 30s

#### Flujo 6: Modo Oscuro
**Escenario:** Usuario cambia tema de aplicación
- Abrir configuración
- Cambiar tema de "light" a "dark"
- Verificar que UI cambia inmediatamente
- Reiniciar aplicación
- Verificar que tema persiste

### Requisitos No Funcionales a Validar

#### RNF-001.1: Tamaño de Biblioteca
**THE SYSTEM SHALL** soportar bibliotecas de hasta 10,000 pistas con tiempo de carga inicial menor a 5 segundos.

**Tests:**
- Importar 10,000 pistas (benchmark)
- Medir tiempo de carga inicial
- Verificar que TrackList virtualiza correctamente
- Validar uso de memoria < 500MB

#### RNF-001.2: Importación
**THE SYSTEM SHALL** importar al menos 50 pistas por segundo en hardware de referencia (CPU 4 núcleos, SSD).

**Tests:**
- Benchmark de importación con 1000 pistas
- Calcular tasa de pistas/segundo
- Validar que cumple ≥ 50 pistas/seg

#### RNF-001.3: Memoria
**THE SYSTEM SHALL** mantener uso de memoria RAM por debajo de 500MB con 5,000 pistas cargadas.

**Tests:**
- Importar 5,000 pistas
- Monitorear uso de memoria con `htop`
- Validar que RAM < 500MB

#### RNF-002.3: Accesibilidad
**THE SYSTEM SHALL** soportar navegación completa por teclado y lectores de pantalla.

**Tests:**
- Navegación con Tab/Shift+Tab
- Activación con Enter/Space
- Verificar atributos ARIA
- Test con Lighthouse Accessibility Score ≥ 90%

---

## 3. Testing E2E con Playwright

### 3.1. Setup de Playwright para Tauri

#### Instalación
```bash
npm install -D @playwright/test
npm install -D @tauri-apps/cli-playwright
```

#### Configuración (`playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // E2E tests deben correr secuencialmente
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Un worker para evitar conflictos de DB
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    {
      name: 'linux',
      use: { ...devices['Desktop Linux'] },
    },
  ],
  
  timeout: 60000, // 60 segundos por test
});
```

### 3.2. Tests E2E (15 tests)

#### E2E-001: Importación Básica
```typescript
// e2e/import-library.spec.ts
import { test, expect } from '@playwright/test';
import { startTauriApp, getTauriHandle } from './helpers/tauri';

test.describe('Importación de Biblioteca', () => {
  test('debería importar 100 archivos de audio', async () => {
    const app = await startTauriApp();
    
    // 1. Click en botón "Importar"
    await app.locator('[data-testid="import-button"]').click();
    
    // 2. Seleccionar carpeta de test (mock dialog)
    await app.evaluate(() => {
      // Mock tauri dialog
      window.__TAURI__.dialog.open = async () => '/path/to/test/music';
    });
    
    // 3. Esperar progreso
    await expect(app.locator('[data-testid="import-progress"]')).toBeVisible();
    
    // 4. Esperar completado
    await expect(app.locator('[data-testid="import-complete"]')).toBeVisible({ timeout: 120000 });
    
    // 5. Verificar que pistas aparecen
    const trackCount = await app.locator('[data-testid="track-row"]').count();
    expect(trackCount).toBeGreaterThan(0);
    
    await app.close();
  });
  
  test('debería mostrar progreso en tiempo real', async () => {
    const app = await startTauriApp();
    
    await app.locator('[data-testid="import-button"]').click();
    
    // Verificar que barra de progreso actualiza
    const progressBar = app.locator('[data-testid="import-progress-bar"]');
    await expect(progressBar).toBeVisible();
    
    // Verificar porcentaje aumenta
    const initialProgress = await progressBar.getAttribute('aria-valuenow');
    await app.waitForTimeout(2000);
    const updatedProgress = await progressBar.getAttribute('aria-valuenow');
    
    expect(Number(updatedProgress)).toBeGreaterThan(Number(initialProgress));
    
    await app.close();
  });
});
```

#### E2E-002: Reproducción de Audio
```typescript
// e2e/audio-playback.spec.ts
test.describe('Reproducción de Audio', () => {
  test('debería reproducir pista al hacer doble-click', async () => {
    const app = await startTauriApp();
    
    // 1. Importar biblioteca de test
    await importTestLibrary(app);
    
    // 2. Doble-click en primera pista
    const firstTrack = app.locator('[data-testid="track-row"]').first();
    await firstTrack.dblclick();
    
    // 3. Verificar que PlayerSection muestra info de pista
    await expect(app.locator('[data-testid="player-track-title"]')).toBeVisible();
    
    // 4. Verificar que waveform se genera
    await expect(app.locator('[data-testid="waveform-canvas"]')).toBeVisible();
    
    // 5. Verificar botón play cambia a pause
    const playButton = app.locator('[data-testid="play-pause-button"]');
    await expect(playButton).toHaveAttribute('data-state', 'playing');
    
    await app.close();
  });
  
  test('debería permitir seek en waveform', async () => {
    const app = await startTauriApp();
    
    await importTestLibrary(app);
    await app.locator('[data-testid="track-row"]').first().dblclick();
    
    // Click en waveform a 50% de posición
    const waveform = app.locator('[data-testid="waveform-canvas"]');
    const bbox = await waveform.boundingBox();
    await waveform.click({ position: { x: bbox.width / 2, y: bbox.height / 2 } });
    
    // Verificar que posición cambió
    await app.waitForTimeout(500);
    const position = await app.locator('[data-testid="player-position"]').textContent();
    expect(position).not.toBe('00:00');
    
    await app.close();
  });
});
```

#### E2E-003: Playlists
```typescript
// e2e/playlists.spec.ts
test.describe('Gestión de Playlists', () => {
  test('debería crear playlist y agregar pistas', async () => {
    const app = await startTauriApp();
    
    await importTestLibrary(app);
    
    // 1. Click en "Nueva Playlist"
    await app.locator('[data-testid="new-playlist-button"]').click();
    
    // 2. Ingresar nombre
    await app.locator('[data-testid="playlist-name-input"]').fill('Test Playlist');
    await app.locator('[data-testid="save-playlist-button"]').click();
    
    // 3. Verificar que playlist aparece
    await expect(app.locator('text=Test Playlist')).toBeVisible();
    
    // 4. Abrir playlist
    await app.locator('text=Test Playlist').click();
    
    // 5. Drag & drop de pista
    const track = app.locator('[data-testid="track-row"]').first();
    const playlist = app.locator('[data-testid="playlist-drop-zone"]');
    await track.dragTo(playlist);
    
    // 6. Verificar que pista aparece en playlist
    const playlistTracks = app.locator('[data-testid="playlist-track"]');
    await expect(playlistTracks).toHaveCount(1);
    
    await app.close();
  });
});
```

#### E2E-004: Configuración
```typescript
// e2e/settings.spec.ts
test.describe('Configuración', () => {
  test('debería cambiar tema a oscuro', async () => {
    const app = await startTauriApp();
    
    // 1. Abrir configuración
    await app.locator('[data-testid="settings-button"]').click();
    
    // 2. Cambiar tema
    await app.locator('[data-testid="theme-select"]').selectOption('dark');
    
    // 3. Guardar
    await app.locator('[data-testid="save-settings-button"]').click();
    
    // 4. Verificar que UI cambió
    const body = app.locator('body');
    await expect(body).toHaveClass(/dark/);
    
    // 5. Reiniciar app
    await app.close();
    const newApp = await startTauriApp();
    
    // 6. Verificar que tema persiste
    await expect(newApp.locator('body')).toHaveClass(/dark/);
    
    await newApp.close();
  });
});
```

#### E2E-005: Conversión MP3
```typescript
// e2e/conversion.spec.ts
test.describe('Conversión MP3', () => {
  test.skip('debería convertir FLAC a MP3', async ({ page }) => {
    // AIDEV-NOTE: Este test requiere ffmpeg instalado
    // Se ejecuta solo si ffmpeg está disponible
    const app = await startTauriApp();
    
    // Verificar ffmpeg
    const hasFfmpeg = await app.evaluate(() => {
      return window.__TAURI__.invoke('check_ffmpeg_installed');
    });
    
    if (!hasFfmpeg) {
      console.log('Skipping: ffmpeg not installed');
      return;
    }
    
    // 1. Abrir configuración
    await app.locator('[data-testid="settings-button"]').click();
    await app.locator('[data-testid="conversion-tab"]').click();
    
    // 2. Habilitar conversión
    await app.locator('[data-testid="conversion-enabled"]').check();
    await app.locator('[data-testid="save-settings-button"]').click();
    
    // 3. Seleccionar pista FLAC
    const flacTrack = app.locator('[data-testid="track-row"]').filter({ hasText: '.flac' }).first();
    await flacTrack.click({ button: 'right' });
    
    // 4. Click en "Convertir a MP3"
    await app.locator('[data-testid="convert-to-mp3"]').click();
    
    // 5. Verificar progreso
    await expect(app.locator('[data-testid="conversion-progress"]')).toBeVisible();
    
    // 6. Esperar completado
    await expect(app.locator('[data-testid="conversion-complete"]')).toBeVisible({ timeout: 60000 });
    
    await app.close();
  });
});
```

### 3.3. Helpers para Tests E2E

```typescript
// e2e/helpers/tauri.ts
import { _electron as electron } from '@playwright/test';
import path from 'path';

export async function startTauriApp() {
  const app = await electron.launch({
    args: [path.join(__dirname, '../../src-tauri/target/debug/symphony')],
    env: {
      ...process.env,
      RUST_BACKTRACE: '1',
    },
  });
  
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  
  return window;
}

export async function importTestLibrary(app) {
  // Mock dialog para usar carpeta de test
  await app.evaluate(() => {
    window.__TAURI__.dialog.open = async () => '/path/to/test/music';
  });
  
  await app.locator('[data-testid="import-button"]').click();
  await app.waitForSelector('[data-testid="import-complete"]', { timeout: 60000 });
}

export async function cleanDatabase() {
  // Eliminar DB de test antes de cada suite
  const fs = require('fs');
  const dbPath = path.join(process.env.HOME, '.config/symphony-test/symphony.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
}
```

---

## 4. Refinamiento UI/UX

### 4.1. Mejoras de Interfaz

#### Loading States Mejorados
- Skeleton loaders para TrackList
- Shimmer effect durante importación
- Progress indicators con porcentaje y ETA

#### Error Handling Mejorado
- Error boundaries con stack traces
- Toast notifications con acciones (retry, dismiss)
- Fallback UI para errores críticos

#### Feedback Visual
- Micro-interactions (hover states, transitions)
- Ripple effects en botones
- Smooth scrolling en listas

#### Accessibility
- Focus indicators visibles
- Atributos ARIA completos
- Navegación por teclado mejorada
- Contraste de colores según WCAG 2.1 AA

### 4.2. Performance Optimizations

#### Frontend
- Lazy loading de componentes pesados
- Memoization de componentes costosos
- Debouncing de búsqueda mejorado (300ms)
- Virtual scrolling optimizado

#### Backend
- Connection pooling para DB
- Cache de queries frecuentes
- Batch processing de operaciones
- Async operations no bloqueantes

---

## 5. Documentación de Usuario

### 5.1. Guía de Inicio Rápido

#### Documento: `docs/user-guide/getting-started.md`
- Instalación del sistema
- Primera ejecución
- Importación de biblioteca
- Reproducción básica
- Configuración inicial

### 5.2. Manual de Usuario Completo

#### Documento: `docs/user-guide/user-manual.md`
- Gestión de biblioteca
- Análisis de audio (beatgrids, cue points, loops)
- Playlists
- Edición de metadatos
- Conversión MP3
- Configuración avanzada
- Troubleshooting

### 5.3. FAQ

#### Documento: `docs/user-guide/faq.md`
- Problemas comunes y soluciones
- Requisitos del sistema
- Formatos soportados
- Limitaciones conocidas

---

## 6. Release Automation

### 6.1. Scripts de Release

#### Script: `scripts/prepare-release.sh`
```bash
#!/bin/bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/prepare-release.sh v1.0.0"
  exit 1
fi

echo "🚀 Preparando release $VERSION"

# 1. Actualizar versión en archivos
echo "📝 Actualizando versión..."
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION#v}\"/" package.json
sed -i "s/version = \".*\"/version = \"${VERSION#v}\"/" src-tauri/Cargo.toml
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION#v}\"/" src-tauri/tauri.conf.json

# 2. Ejecutar tests completos
echo "🧪 Ejecutando tests..."
make ci-check

# 3. Generar CHANGELOG
echo "📋 Actualizando CHANGELOG..."
git cliff --tag $VERSION --output CHANGELOG.md

# 4. Build de producción
echo "🏗️  Building..."
make build

# 5. Crear commit de release
echo "📦 Creando commit de release..."
git add .
git commit -m "chore: release $VERSION"

# 6. Crear tag
echo "🏷️  Creando tag..."
git tag -a $VERSION -m "Release $VERSION"

echo "✅ Release preparado. Ejecuta 'git push origin main && git push origin $VERSION' para publicar"
```

### 6.2. GitHub Release Workflow

#### `.github/workflows/release.yml` (ya existente - verificar)
- Trigger en push de tags `v*`
- Build para Linux (AppImage, .deb)
- Generación de checksums
- Upload de artifacts
- Creación de GitHub Release con notas automáticas

---

## 7. Plan de Testing

### Tests E2E (15 tests nuevos)
- Import flow: 3 tests
- Playback flow: 4 tests
- Playlists flow: 3 tests
- Settings flow: 3 tests
- Conversion flow: 2 tests

### Performance Tests (5 tests)
- Benchmark importación 10k pistas
- Benchmark carga inicial
- Memory usage test
- CPU usage test
- Render performance test

### Accessibility Tests (3 tests)
- Keyboard navigation
- Screen reader compatibility
- Color contrast validation

**Total nuevo: 23 tests E2E + validaciones**

---

## 8. Estimación de Esfuerzo

| Tarea | Horas | Prioridad |
|-------|-------|-----------|
| Setup Playwright + Tauri | 3 | Alta |
| Tests E2E (15 tests) | 12 | Alta |
| Performance tests | 4 | Alta |
| Accessibility tests | 3 | Alta |
| UI refinement | 6 | Media |
| Performance optimization | 5 | Media |
| Documentación de usuario | 8 | Media |
| Scripts de release | 2 | Media |
| Validación final | 4 | Alta |
| **TOTAL** | **47 horas** | - |

---

## 9. Criterios de Aceptación

### Funcionales
- ✅ 15+ tests E2E passing con Playwright
- ✅ Todos los flujos principales cubiertos (import, playback, playlists, settings)
- ✅ Documentación de usuario completa y clara
- ✅ Scripts de release automation funcionales
- ✅ GitHub Release workflow validado

### No Funcionales
- ✅ Tiempo de importación: ≥ 50 pistas/seg
- ✅ Tiempo de carga inicial: < 5 seg con 10k pistas
- ✅ Uso de memoria: < 500MB con 5k pistas
- ✅ Lighthouse Accessibility Score: ≥ 90%
- ✅ Build size: < 50MB (AppImage)
- ✅ Startup time: < 2 segundos

### Calidad
- ✅ Cobertura total de tests ≥ 80%
- ✅ Cero errores de TypeScript
- ✅ Cero warnings de clippy
- ✅ Cero dependencias con vulnerabilidades críticas
- ✅ Documentación completa en español

---

## 10. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Playwright incompatible con Tauri 2.0 | Media | Alto | Investigar y usar @tauri-apps/cli-playwright |
| Tests E2E flaky | Alta | Medio | Retries en CI, screenshots on failure |
| Performance no cumple RNF | Media | Alto | Benchmark temprano, optimización incremental |
| Release automation falla | Baja | Alto | Testing exhaustivo en branches de prueba |
| Documentación incompleta | Media | Medio | Revisión por pares, feedback de beta testers |

---

## 11. Notas de Implementación

### AIDEV-NOTE: Orden de Implementación
1. **Setup E2E primero:** Playwright + helpers → tests básicos → tests avanzados
2. **Performance tests:** Benchmarks → optimizaciones basadas en datos
3. **Refinamiento UI:** Mejoras incrementales con validación visual
4. **Documentación:** Mientras se hacen tests (documentar lo que se prueba)
5. **Release automation:** Al final, cuando todo esté validado

### AIDEV-NOTE: Testing Strategy
- Tests E2E deben correr secuencialmente (1 worker) para evitar conflictos de DB
- Usar base de datos de test separada (symphony-test.db)
- Cleanup de DB antes de cada suite
- Screenshots y videos solo en fallos (para debugging)

### AIDEV-NOTE: Performance Benchmarks
- Hardware de referencia: Intel i5-8400 (6 cores), 16GB RAM, NVMe SSD
- Benchmarks deben ejecutarse en máquina limpia (sin otras apps)
- Resultados deben ser reproducibles (±10% varianza aceptable)

---

## 12. Checklist de Release v1.0.0

### Pre-release
- [ ] Todos los tests pasando (unit + integration + E2E)
- [ ] Performance benchmarks validados
- [ ] Accessibility score ≥ 90%
- [ ] Documentación completa
- [ ] CHANGELOG actualizado
- [ ] Versiones bumpeadas en package.json y Cargo.toml

### Release
- [ ] Tag creado (v1.0.0)
- [ ] GitHub Release con binarios
- [ ] Checksums generados
- [ ] Release notes publicadas
- [ ] Documentación publicada

### Post-release
- [ ] Anuncio en redes/comunidades
- [ ] Monitoreo de issues reportados
- [ ] Plan de hotfixes si necesario

---

**Fin del documento de diseño - Milestone 6**
