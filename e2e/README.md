# E2E Tests

Tests end-to-end para Symphony DJ Software.

## ⚠️ Importante

**Los tests E2E están excluidos de los workflows de CI** para evitar fallos intermitentes que bloqueen el desarrollo.

## 📁 Estructura

```
e2e/
├── fixtures/           # Archivos de test (audio samples)
├── helpers/           # Utilidades compartidas (tauri.ts)
├── *.spec.ts          # Tests Playwright
├── *.spec.js          # Tests Selenium/WebDriver
└── README.md          # Este archivo
```

## 🧪 Tipos de Tests

### Playwright (Recomendado)
- `import-library.spec.ts` - Tests de importación de biblioteca
- Usa `@playwright/test`
- Mejor soporte para aplicaciones Tauri

### WebDriver IO
- `basic-launch.wdio.spec.js` - Tests básicos de lanzamiento
- Usa `webdriverio`
- Configuración en `wdio.conf.js`

### Selenium
- `selenium-basic.spec.js` - Tests básicos con Selenium
- `simple-launch.spec.js` - Test simple de lanzamiento
- `debug-tauri-driver.js` - Debugging helper

## 🚀 Ejecutar Tests

### Unit Tests (Automático en CI)
```bash
npm test                 # Ejecuta solo unit tests (excluye E2E)
npm run test:coverage    # Con coverage
```

### E2E Tests (Manual)
```bash
# Playwright (requiere app compilada)
npm run test:e2e         # Ejecutar todos
npm run test:e2e:ui      # Con UI interactiva
npm run test:e2e:debug   # Con debugger

# Vitest E2E (experimental)
npm run test:e2e:vitest  # Tests E2E con Vitest

# WebDriver IO
npm run test:wdio

# Selenium
npm run test:selenium
npm run test:simple-launch
```

## 🔧 Configuración

### Unit Tests
- **Config**: `vitest.config.ts`
- **Exclude**: `e2e/**`, `**/*.e2e.{test,spec}.{js,ts}`
- **Environment**: `jsdom`

### E2E Tests
- **Config**: `vitest.e2e.config.ts`, `playwright.config.ts`, `wdio.conf.js`
- **Include**: Solo archivos en `e2e/`
- **Environment**: `node`
- **Timeout**: 30s (vs 5s en unit tests)

## ⚙️ Requisitos

### Para Playwright
```bash
# Instalar browsers
npx playwright install

# Compilar app Tauri
npm run tauri build
```

### Para Selenium/WebDriver
```bash
# Instalar Tauri Driver (para automatización)
cargo install tauri-driver

# Compilar app en modo release
cd src-tauri && cargo build --release
```

## 🐛 Debugging

### Ver reporte de Playwright
```bash
npm run test:e2e:report
```

### Debugging interactivo
```bash
npm run test:e2e:debug
```

### Logs de Tauri Driver
```bash
npm run test:debug-tauri-driver
```

## 📝 Escribir Nuevos Tests E2E

### Playwright (Recomendado)
```typescript
import { test, expect } from '@playwright/test';
import { startTauriApp, cleanDatabase } from './helpers/tauri';

test.describe('Feature Name', () => {
  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test('should do something', async ({ page }) => {
    // Tu test aquí
  });
});
```

### Naming Convention
- Archivos: `*.spec.ts` o `*.e2e.spec.ts`
- Ubicación: Dentro de `e2e/`
- Helpers: En `e2e/helpers/`

## 🚫 Por Qué Están Excluidos de CI

1. **Requieren app compilada**: Aumenta tiempo de CI significativamente
2. **Fallos intermitentes**: Timing issues, race conditions
3. **Dependencias del sistema**: WebDriver, Tauri Driver, browsers
4. **Lentos**: 30s+ por test vs <1s en unit tests
5. **Bloqueantes**: 1 fallo E2E no debe bloquear todo el desarrollo

## ✅ Best Practices

1. **Usa Playwright** para nuevos tests (mejor soporte Tauri)
2. **Limpia la DB** antes de cada test (`cleanDatabase()`)
3. **Usa fixtures** para archivos de test (en `e2e/fixtures/`)
4. **Timeouts generosos** (30s+) para evitar flakiness
5. **Tests independientes** - no dependan de orden de ejecución
6. **Ejecuta manualmente** antes de PR importante

## 📚 Recursos

- [Playwright Docs](https://playwright.dev/)
- [Tauri Testing Guide](https://tauri.app/v1/guides/testing/)
- [WebDriver IO](https://webdriver.io/)
- [Vitest E2E](https://vitest.dev/guide/features.html#e2e-testing)

---

**Última actualización**: 2025-12-18
**Responsable**: Symphony Dev Team
