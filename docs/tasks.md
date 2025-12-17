# Tasks - Symphony Milestone 0

## Milestone 0: Setup Inicial (Semana 1)

**Objetivo:** Establecer la base técnica del proyecto con estructura de directorios, configuración de herramientas, setup de testing y CI/CD.

**Criterios de Éxito:**
- ✅ Proyecto Tauri + React funcional con build exitoso
- ✅ Tests configurados con cobertura del 80%
- ✅ Base de datos SQLite con esquema inicial
- ✅ CI/CD funcional para builds automáticos
- ✅ Documentación completa de setup

---

## [NUEVO] Fixes Críticos de Interacción Waveform (17 dic 2025)

### 🐛 Tres bugs críticos de interacción waveform RESUELTOS ([commit eb3ea9a](https://github.com/jvegaf/Symphony/commit/eb3ea9a))

- **1. Seek en waveform no funcionaba:**
  - Solución: Cambio de evento 'interaction' a 'click' en `WaveformViewer.tsx`
- **2. Waveform generado al seleccionar pista:**
  - Solución: Separación de estado `selectedTrack` (UI) y `playingTrack` (audio) en `App.tsx`
- **3. Overlay de CuePointEditor bloqueaba clicks:**
  - Solución: Uso de `pointer-events-none` en SVG y `pointer-events-auto` en marcadores `<g>`

**Documentación y verificación:**
- Ver [`docs/WAVEFORM_FIXES_COMPLETE.md`](docs/WAVEFORM_FIXES_COMPLETE.md)
- Ver [`docs/WAVEFORM_FIXES_QUICKREF.md`](docs/WAVEFORM_FIXES_QUICKREF.md)
- Script: [`scripts/verify-waveform-fixes.sh`](scripts/verify-waveform-fixes.sh)

**Resultado:**
- Todos los bugs críticos de interacción de waveform resueltos y verificados.
- Milestone 5: COMPLETO y estable.
- Tests totales: 567 (420 frontend + 147 backend)

---

## Tarea 1: Inicializar Proyecto Tauri con React y TypeScript

**Prioridad:** Alta  
**Dependencias:** Ninguna  
**Estimación:** 2 horas  

### Descripción
Crear estructura base del proyecto usando el CLI de Tauri con plantilla de React y TypeScript.

### Pasos de Implementación

1. **Instalar prerrequisitos**
   ```bash
   # Verificar instalación de Rust
   rustc --version
   cargo --version
   
   # Verificar Node.js 18+
   node --version
   npm --version
   ```

2. **Crear proyecto Tauri**
   ```bash
   npm create tauri-app@latest
   # Opciones:
   # - Project name: symphony
   # - Package manager: npm
   # - Frontend template: React + TypeScript
   # - Tauri version: 2.0
   ```

3. **Verificar estructura generada**
   ```
   symphony/
   ├── src/              # Frontend React
   ├── src-tauri/        # Backend Rust
   ├── package.json
   ├── tsconfig.json
   └── vite.config.ts
   ```

4. **Configurar TypeScript strict mode**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true
     }
   }
   ```

5. **Probar build**
   ```bash
   npm install
   npm run tauri dev    # Verificar modo desarrollo
   npm run build        # Verificar build de producción
   ```

### Resultado Esperado
- Aplicación Tauri funcional con ventana vacía
- Build exitoso sin errores de TypeScript
- Hot reload funcionando en modo dev

### Validación
- [ ] `npm run tauri dev` abre ventana de aplicación
- [ ] No hay errores de TypeScript
- [ ] Build de producción genera ejecutable

---

## Tareas históricas y checklist de milestones previos: [ver documento completo]

---

## Estado Final Milestone 5
- Todas las tareas de interacción de waveform: ✅ COMPLETADAS
- Milestone 5: ✅ COMPLETO y estable (ver [`docs/milestone-5-summary.md`](docs/milestone-5-summary.md))
- Todos los tests: ✅ PASANDO (567/567)

---

## Referencias

- [WAVEFORM_FIXES_COMPLETE.md](./WAVEFORM_FIXES_COMPLETE.md)
- [WAVEFORM_FIXES_QUICKREF.md](./WAVEFORM_FIXES_QUICKREF.md)
- [verify-waveform-fixes.sh](../scripts/verify-waveform-fixes.sh)
- [AIDEV-CuePointEditor-PointerEvents.md](../src/components/analysis/AIDEV-CuePointEditor-PointerEvents.md)
