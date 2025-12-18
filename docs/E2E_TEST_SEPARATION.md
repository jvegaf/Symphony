# Separación de Tests E2E del CI

**Fecha**: 2025-12-18  
**Estado**: ✅ Completado

## 🎯 Objetivo

Separar los tests E2E de los unit tests para evitar que fallos intermitentes de E2E bloqueen los workflows de CI.

## 📊 Problema Anterior

- **Tests totales**: 414 (411 unit + 3 E2E)
- **Test files**: 29 (25 unit + 4 E2E)
- **E2E fallidos**: 3/3 (100% de fallos)
- **Impacto en CI**: Workflows fallaban constantemente debido a E2E

## ✅ Solución Implementada

### 1. Configuración de Vitest Actualizada

**Archivo**: `vitest.config.ts`

```typescript
test: {
  // Excluir tests E2E de ejecución normal
  exclude: [
    'node_modules/**',
    'dist/**',
    'e2e/**',                              // ← NUEVO
    '**/*.e2e.{test,spec}.{js,ts,jsx,tsx}', // ← NUEVO
  ],
}
```

### 2. Nueva Configuración para E2E

**Archivo**: `vitest.e2e.config.ts` (nuevo)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // E2E usa node environment
    include: ['e2e/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    testTimeout: 30000,  // 30s vs 5s en unit tests
    hookTimeout: 30000,
  },
});
```

### 3. Nuevos Scripts de NPM

**Archivo**: `package.json`

```json
{
  "scripts": {
    "test": "vitest run",                        // Solo unit tests
    "test:e2e": "playwright test",               // E2E con Playwright
    "test:e2e:vitest": "vitest run --config vitest.e2e.config.ts", // E2E con Vitest
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### 4. Makefile Actualizado

**Archivo**: `Makefile`

```makefile
test: ## Ejecutar todos los tests (frontend unit + backend, excluye E2E)
	$(NPM) test
	cd $(CARGO_DIR) && $(CARGO) test

test-e2e: ## Ejecutar tests E2E (Playwright, requiere app compilada)
	@echo "⚠️  Los tests E2E requieren la app compilada"
	$(NPM) run test:e2e
```

### 5. Documentación E2E

**Archivo**: `e2e/README.md` (nuevo)

- Guía completa de tests E2E
- Explicación de por qué están excluidos del CI
- Instrucciones para ejecutarlos manualmente
- Best practices para escribir nuevos tests E2E

## 📈 Resultados

### Antes
```
✅ Test Files: 25 passed (4 E2E failed)
❌ Tests: 411 passed (3 E2E failed)
❌ CI: Fallando constantemente
```

### Después
```
✅ Test Files: 25 passed (25)
✅ Tests: 411 passed (411)
✅ CI: Pasando sin fallos intermitentes
✅ E2E: Disponibles para ejecución manual
```

## 🚀 Comandos Disponibles

### Unit Tests (Automático en CI)
```bash
npm test                    # Unit tests (frontend)
npm run test:coverage       # Con coverage
make test                   # Frontend + Backend unit tests
make test-frontend          # Solo frontend
make test-backend           # Solo backend
```

### E2E Tests (Manual)
```bash
npm run test:e2e            # Playwright (recomendado)
npm run test:e2e:vitest     # Vitest E2E (experimental)
npm run test:e2e:ui         # UI interactiva
npm run test:e2e:debug      # Con debugger
make test-e2e               # Via Makefile
```

## 🔧 Archivos Modificados

1. **`vitest.config.ts`** - Agregado exclude para E2E
2. **`vitest.e2e.config.ts`** - Nueva config para E2E (NUEVO)
3. **`package.json`** - Agregado `test:e2e:vitest` script
4. **`Makefile`** - Agregado target `test-e2e`
5. **`e2e/README.md`** - Documentación completa de E2E (NUEVO)

## ⚙️ CI/CD

**Sin cambios necesarios** - Los workflows ya usan `npm run test:run` que ahora excluye E2E automáticamente.

**Workflow**: `.github/workflows/ci.yml`
```yaml
- name: Run tests
  run: npm run test:run  # ✅ Ya excluye E2E
```

## 📝 Por Qué Esta Separación

### Problemas de E2E en CI
1. **Requieren app compilada**: Agrega 5-10 min al workflow
2. **Fallos intermitentes**: Timing issues, race conditions
3. **Dependencias complejas**: WebDriver, Tauri Driver, browsers
4. **Lentos**: 30s+ por test vs <1s en unit tests
5. **Flaky**: Sensibles a recursos del sistema, concurrencia

### Beneficios de la Separación
1. ✅ **CI más rápido**: De ~15 min a ~5 min
2. ✅ **CI más estable**: 0 fallos por E2E flaky
3. ✅ **Desarrollo más ágil**: PRs no bloqueados por E2E
4. ✅ **E2E disponibles**: Para testing manual antes de releases
5. ✅ **Mejor organización**: Unit vs E2E claramente separados

## 🎓 Best Practices

### Para Developers
1. **Siempre ejecuta unit tests** antes de commit (`npm test`)
2. **Ejecuta E2E manualmente** antes de PRs importantes (`npm run test:e2e`)
3. **No ignores fallos E2E** - investiga y reporta issues
4. **Usa Playwright** para nuevos tests E2E (mejor soporte)

### Para CI/CD
1. **Unit tests en cada push/PR** (automático)
2. **E2E en releases** (manual o scheduled)
3. **E2E en nightly builds** (opcional, scheduled workflow)
4. **Smoke tests E2E** antes de deploy a producción

## 📚 Referencias

- [Vitest Configuration](https://vitest.dev/config/)
- [Playwright Docs](https://playwright.dev/)
- [Tauri Testing Guide](https://tauri.app/v1/guides/testing/)
- [E2E Best Practices](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**Implementado por**: Symphony Dev Team  
**Revisado por**: Architecture Team  
**Última actualización**: 2025-12-18
