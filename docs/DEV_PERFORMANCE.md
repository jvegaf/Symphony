# Optimizaciones de Rendimiento en Desarrollo

Este documento explica las diferencias de rendimiento entre `make dev` (desarrollo) y el AppImage (producción), y cómo optimizar la experiencia de desarrollo.

## ¿Por qué hay lag en desarrollo?

En modo desarrollo (`make dev`), hay varios factores que causan lag comparado con producción:

### Frontend (Vite)
1. **Sin bundling completo**: Vite sirve módulos ES nativos individualmente
2. **HMR overhead**: El sistema de Hot Module Replacement añade listeners y lógica
3. **Source maps**: Se generan para debugging
4. **CSS JIT**: Tailwind genera estilos on-demand
5. **Console logs**: Mensajes de debug frecuentes ralentizan el rendering

### Backend (Rust/Tauri)
1. **Debug build**: Código Rust sin optimizaciones (~40x más lento en symphonia)
2. **Símbolos de debug**: Binarios más grandes, más lento en cargar
3. **Sin LTO**: Sin Link Time Optimization

## Comandos de Desarrollo

### `make dev` (Estándar)
```bash
make dev
```
- Compilación rápida, rendimiento bajo
- Mejor para cambios frecuentes de código
- Debug info completa

### `make dev-fast` (Recomendado)
```bash
make dev-fast
```
- Usa perfil `dev-fast` con opt-level=1
- Primera compilación más lenta
- Rendimiento significativamente mejor después
- Debug info reducida pero funcional

### `make dev-release` (Máximo rendimiento)
```bash
make dev-release
```
- Compilación completa release
- Rendimiento igual a producción
- Compilación muy lenta (~5-10 min)
- Ideal para testing final antes de release

## Optimizaciones Implementadas

### Vite (vite.config.ts)
```typescript
// Pre-bundle de dependencias pesadas
optimizeDeps: {hen users started reporting crashes and freezes during heavy file operations.
  include: [
    "react", "react-dom", "@tanstack/react-query",
    "lucide-react", "wavesurfer.js", // ...
  ],
},

// Warmup de archivos frecuentes
server: {
  warmup: {
    clientFiles: ["./src/App.tsx", "./src/main.tsx", ...]
  }
},

// Sin sourcemaps de CSS (mejora rendimiento)
css: { devSourcemap: false },
```

### Cargo.toml (Rust)
```toml
# Dependencias de audio optimizadas en dev
[profile.dev.package.symphonia]
opt-level = 3

[profile.dev.package.rusqlite]
opt-level = 2

# Perfil dev-fast intermedio
[profile.dev-fast]
opt-level = 1
debug = 1
codegen-units = 256
```

## Debug Controlado

Los logs de waveform y otros componentes están deshabilitados por defecto.

### Habilitar logs de debug
```javascript
// En la consola del navegador:
localStorage.setItem('SYMPHONY_DEBUG', 'true');
localStorage.setItem('SYMPHONY_DEBUG_WAVEFORM', 'true');
location.reload();
```

### Deshabilitar logs de debug
```javascript
localStorage.removeItem('SYMPHONY_DEBUG');
localStorage.removeItem('SYMPHONY_DEBUG_WAVEFORM');
location.reload();
```

## Comparativa de Tiempos

| Operación | `make dev` | `make dev-fast` | `make dev-release` |
|-----------|------------|-----------------|---------------------|
| Primera compilación | ~30s | ~2min | ~8min |
| Recompilación incremental | ~2s | ~5s | ~30s |
| Waveform generation | ~5s | ~1s | ~0.3s |
| UI scroll | Laggy | Fluido | Muy fluido |
| Memory usage | Alto | Medio | Bajo |

## Recomendaciones

1. **Para desarrollo diario**: Usar `make dev-fast`
2. **Para debugging de bugs raros**: Usar `make dev`
3. **Para testing de performance**: Usar `make dev-release`
4. **Mantener la consola cerrada** si no necesitas debug
5. **Usar React DevTools con cuidado**: Añaden overhead significativo

## Troubleshooting

### La UI sigue lenta después de optimizar
1. Verificar que no hay console.log activos
2. Cerrar React DevTools si está abierto
3. Verificar que no hay queries infinitas en TanStack Query
4. Usar `make dev-release` para comparar

### Compilación incremental lenta
1. Limpiar cache: `make clean-cache`
2. Verificar espacio en disco
3. Cerrar otros procesos pesados

### HMR no funciona correctamente
1. Reiniciar servidor: `Ctrl+C` y `make dev` de nuevo
2. Limpiar node_modules: `rm -rf node_modules && npm i`

---

*Última actualización: Enero 2026*
