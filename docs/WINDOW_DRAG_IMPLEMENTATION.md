# Implementación de Window Drag en Custom Titlebar

## 📋 Resumen

Symphony utiliza un titlebar personalizado (sin decoraciones nativas de ventana) que permite arrastrar la ventana desde cualquier parte del header. Esta funcionalidad está implementada usando la API de Tauri 2.0.

## 🎯 Características Implementadas

- ✅ Drag de ventana desde todo el header
- ✅ Doble-click en el header para maximizar/restaurar ventana
- ✅ Botones de ventana siguen siendo clickeables (minimize, maximize, close)
- ✅ Tabs y controles interactivos siguen funcionando
- ✅ Soporte de accesibilidad (role="button", aria-labels, keyboard navigation)
- ✅ 23 tests unitarios (100% coverage)

## 🛠️ Implementación Técnica

### 1. CSS - Drag Region (`src/styles/globals.css`)

```css
/* AIDEV-NOTE: Tauri drag region - permite arrastrar la ventana desde elementos con este atributo
   Documentación: https://tauri.app/v2/learn/window-customization/#drag-region */
*[data-tauri-drag-region] {
  -webkit-app-region: drag;
  app-region: drag;
}
```

### 2. Componente Header (`src/components/layout/Header.tsx`)

**Estructura del componente:**

```tsx
<header>
  <div 
    data-tauri-drag-region    // Habilita el drag
    role="button"             // Accesibilidad
    tabIndex={0}              // Navegación por teclado
    onDoubleClick={handleDoubleClick}  // Maximizar al doble-click
    onKeyDown={handleKeyDown}          // Soporte de teclado
  >
    {/* Contenido con pointer-events: auto para mantener interactividad */}
    <div style={{ pointerEvents: 'auto' }}>
      {/* Tabs, botones, etc. */}
    </div>
  </div>
</header>
```

**Handlers de ventana:**

```tsx
const handleMinimize = () => {
  getCurrentWindow().minimize();
};

const handleMaximize = () => {
  getCurrentWindow().toggleMaximize();
};

const handleClose = () => {
  getCurrentWindow().close();
};

const handleDoubleClick = () => {
  getCurrentWindow().toggleMaximize();
};
```

### 3. Permisos Tauri (`src-tauri/capabilities/default.json`)

```json
{
  "permissions": [
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-toggle-maximize",
    "core:window:allow-start-dragging"  // ✅ Requerido para drag
  ]
}
```

### 4. Configuración de Ventana (`src-tauri/tauri.conf.json`)

```json
{
  "app": {
    "windows": [{
      "decorations": false  // ✅ Sin titlebar nativa
    }]
  }
}
```

## 🎨 Detalles de Diseño

### Interactividad de Elementos Hijos

Los elementos dentro de la región draggable (tabs, botones) necesitan `pointer-events: auto` para seguir siendo clickeables:

```tsx
<div style={{ pointerEvents: 'auto' }}>
  <button onClick={handleClick}>Clickeable</button>
</div>
```

### Doble-Click para Maximizar

Implementado manualmente porque `data-tauri-drag-region` solo maneja el drag, no eventos de doble-click:

```tsx
<div 
  data-tauri-drag-region
  onDoubleClick={() => getCurrentWindow().toggleMaximize()}
>
  {/* Header content */}
</div>
```

### Accesibilidad

- `role="button"` en la región draggable
- `tabIndex={0}` para navegación por teclado
- `aria-label` en botones de ventana
- Handler de `onKeyDown` para tecla Enter (maximizar)

## 🧪 Tests

23 tests unitarios cubriendo:

1. **Renderizado básico** (4 tests)
   - Header renderiza correctamente
   - Todos los tabs presentes
   - Controles de ventana presentes
   - Atributo `data-tauri-drag-region` presente

2. **Navegación de tabs** (4 tests)
   - Tab activo resaltado
   - Click en tabs cambia vista
   - Settings y Import llaman handlers correctos

3. **Controles de ventana** (3 tests)
   - Minimize funciona
   - Maximize funciona
   - Close funciona

4. **Funcionalidad de drag** (2 tests)
   - Doble-click maximiza ventana
   - Elementos hijos siguen siendo interactivos

5. **Estado de importación** (4 tests)
   - Muestra "Escaneando..."
   - Muestra progreso "Importando X/Y"
   - Muestra "¡Completado!"
   - Barra de progreso visual

6. **Badge de selección** (3 tests)
   - No muestra con 0 tracks
   - Muestra singular (1 track)
   - Muestra plural (N tracks)

7. **Accesibilidad** (3 tests)
   - Aria-labels en botones
   - Role="button" en región draggable
   - Tecla Enter maximiza ventana

## 📚 Referencias

- **Tauri Window Customization:** https://tauri.app/v2/learn/window-customization/#drag-region
- **Tauri Window API:** https://tauri.app/v2/reference/javascript/api/window/
- **CSS app-region:** https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-app-region

## 🚀 Uso

El usuario puede:

1. **Arrastrar la ventana:** Click y arrastre desde cualquier parte del header (excepto botones/tabs)
2. **Maximizar/Restaurar:** Doble-click en el header
3. **Minimizar:** Click en botón `-`
4. **Maximizar:** Click en botón `□`
5. **Cerrar:** Click en botón `×` (rojo)

## ⚠️ Consideraciones

1. **Elementos interactivos:** Deben tener `pointer-events: auto` (aplicado via inline style)
2. **Doble-click:** Implementado manualmente porque `data-tauri-drag-region` no lo maneja
3. **Linting:** El linter sugiere usar `<button>` en lugar de `<div role="button">`, pero esto es correcto según la documentación de Tauri (el drag funciona en cualquier elemento con el atributo)
4. **Cross-platform:** Funciona en Linux, Windows y macOS (testeado en desarrollo)

## 📊 Métricas

- **Tests:** 23 nuevos (726 totales, antes 703)
- **Coverage:** 100% en Header.tsx
- **TypeScript:** 0 errores
- **LOC Header:** 187 líneas
- **LOC Tests:** 309 líneas

---

**Última actualización:** 2026-01-06
**Versión:** v0.19.0
