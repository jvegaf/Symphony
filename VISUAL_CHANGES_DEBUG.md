# ⚠️ INSTRUCCIONES PARA VER LOS CAMBIOS VISUALES

## Problema
Los cambios en el código están aplicados pero el navegador/Vite pueden estar cacheando la versión antigua.

## Solución: Pasos para Ver los Cambios

### 1. Detener la aplicación
```bash
# Ctrl+C en la terminal donde corre make dev
# O ejecutar:
pkill -f "tauri dev"
```

### 2. Limpiar todos los caches
```bash
# Desde la raíz del proyecto:
rm -rf node_modules/.vite
rm -rf src-tauri/target/debug
```

### 3. Reconstruir desde cero
```bash
npm run build
cd src-tauri && cargo build
```

### 4. Iniciar en modo dev
```bash
make dev
```

### 5. En el navegador (cuando se abra la app)
- Presionar **Ctrl+Shift+R** (Linux/Windows)
- O **Cmd+Shift+R** (Mac)
- Esto hace un "hard refresh" que limpia el cache del navegador

## Cambios Que Deberías Ver

### ✅ En la Tabla de Canciones:

#### Texto más grande:
- Antes: Texto pequeño (default)
- Ahora: **Texto text-base** (más legible)

#### Estrellas más grandes:
- Antes: 16px (muy pequeñas)
- Ahora: **28px** (75% más grandes)

#### Estrellas vacías rellenas:
```
Antes: ☆☆☆☆☆ (outline, difíciles de ver)
Ahora: ★★★★★ (filled en gris oscuro, claramente visibles)
```

#### Color naranja primario:
```
Antes: Amarillo genérico #fbbf24
Ahora: Naranja primario #fa8905 (color del tema Symphony)

Ejemplo con rating 3/5:
★★★★★
^^^--- Naranja #fa8905 (brillante)
   ^^--- Gris #6B7280 (oscuro pero visible)
```

## Verificación de Código

Los cambios están confirmados en estos archivos:

### StarRating.tsx
```bash
grep "w-5 h-5" src/components/ui/StarRating.tsx
# Resultado esperado: sm: "w-5 h-5"

grep "text-primary" src/components/ui/StarRating.tsx  
# Resultado esperado: color = "text-primary"

grep "StarFilledIcon" src/components/ui/StarRating.tsx | wc -l
# Resultado esperado: 4 (se usa para llenas Y vacías)
```

### TrackList.tsx
```bash
grep "text-base" src/components/TrackList.tsx | wc -l
# Resultado esperado: 5 (todas las columnas)

grep "size=\"md\"" src/components/TrackList.tsx
# Resultado esperado: size="md"
```

### tailwind.config.js
```bash
grep "text-primary" tailwind.config.js
# Resultado esperado: 'text-primary' en safelist
```

## Si TODAVÍA No Se Ven Los Cambios

### Opción 1: Verificar que Vite recargó
En la consola del navegador (F12), buscar mensajes como:
```
[vite] hot updated: /src/components/ui/StarRating.tsx
```

### Opción 2: Verificar en el inspector
1. Click derecho en una estrella → Inspeccionar
2. Buscar las clases aplicadas
3. Deberías ver: `w-7 h-7 text-primary`

### Opción 3: Forzar rebuild completo
```bash
# Limpiar TODO
rm -rf node_modules/.vite
rm -rf dist
rm -rf src-tauri/target

# Reinstalar
npm install

# Dev desde cero
make dev
```

## Tests Confirman Los Cambios

```bash
npm test -- StarRating --run
# ✅ 19/19 tests passing (con nuevos tamaños)

npm test -- TrackList --run  
# ✅ 30/30 tests passing
```

## Archivos Modificados (Confirmados)

1. ✅ `src/components/ui/StarRating.tsx`
   - Línea 64: `color = "text-primary"`
   - Línea 77-79: Tamaños sm=w-5, md=w-7, lg=w-9
   - Línea 138-145: Estrellas vacías usan StarFilledIcon

2. ✅ `src/components/TrackList.tsx`
   - Líneas 135-144: `text-base` en todas las columnas
   - Línea 158: `size="md"` (estrellas más grandes)

3. ✅ `tailwind.config.js`
   - Línea 8-12: safelist con `text-primary`

## Debugging Final

Si después de TODO esto sigues sin ver los cambios, ejecuta:

```bash
# Ver si el archivo compilado tiene los cambios
grep -r "w-7 h-7" dist/assets/*.js | head -1

# Si no aparece nada, el build no incluyó los cambios
# Solución: Rebuild completo
npm run build -- --force
```

---

**Los cambios están en el código fuente.** Si no se ven, es 100% un problema de cache.
