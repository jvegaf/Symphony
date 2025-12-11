---
description: "Instrucciones de Setup de GitHub Copilot para Symphony"
---

# Setup de GitHub Copilot - Symphony

✅ **Tu configuración de GitHub Copilot está completa.**

Se han creado los siguientes archivos en `.github/`:

## Archivos de Configuración

### 1. Instrucciones Principales
- **[copilot-instructions.md](./copilot-instructions.md)** - Guía principal para todo el proyecto

### 2. Directorio `instructions/`
Estándares específicos por área:

| Archivo | Propósito |
|---------|-----------|
| [react-typescript.instructions.md](./instructions/react-typescript.instructions.md) | Desarrollo con React 18 + TypeScript |
| [tauri-rust.instructions.md](./instructions/tauri-rust.instructions.md) | Desarrollo con Tauri 2.0 + Rust |
| [testing.instructions.md](./instructions/testing.instructions.md) | Estrategia TDD con 80%+ cobertura |
| [documentation.instructions.md](./instructions/documentation.instructions.md) | Documentación en español |
| [git-workflow.instructions.md](./instructions/git-workflow.instructions.md) | Conventional Commits y Git workflow |
| [security.instructions.md](./instructions/security.instructions.md) | Seguridad y mejores prácticas |

### 3. Directorio `prompts/`
Prompts reutilizables para tareas comunes:

| Archivo | Para |
|---------|------|
| [create-component.prompt.md](./prompts/create-component.prompt.md) | Generar componentes React |
| [write-tests.prompt.md](./prompts/write-tests.prompt.md) | Escribir tests (TDD) |
| [code-review.prompt.md](./prompts/code-review.prompt.md) | Revisar y refactorizar código |
| [architecture.prompt.md](./prompts/architecture.prompt.md) | Planificar arquitectura |
| [generate-docs.prompt.md](./prompts/generate-docs.prompt.md) | Generar documentación |

### 4. Directorio `agents/`
Modos especializados para diferentes contextos:

| Archivo | Propósito |
|---------|-----------|
| [architect.agent.md](./agents/architect.agent.md) | Planificación de arquitectura |
| [reviewer.agent.md](./agents/reviewer.agent.md) | Code reviews de calidad |
| [debugger.agent.md](./agents/debugger.agent.md) | Debugging y troubleshooting |

### 5. Directorio `workflows/`
- [copilot-setup-steps.yml](./workflows/copilot-setup-steps.yml) - Workflow para Coding Agent

---

## Cómo Usar

### En VS Code

1. **Abre Copilot Chat** - Presiona `Ctrl+Shift+I` (Windows/Linux) o `Cmd+Shift+I` (Mac)

2. **Las instrucciones se aplican automáticamente** según:
   - Tipo de archivo que estés editando
   - Ruta del archivo
   - Contexto del proyecto

### Usar Prompts

Puedes llamar a Copilot de varias formas:

**Opción 1: Directo en Chat**
```
@workspace Quiero crear un componente React para visualizar el waveform
```

**Opción 2: Con Slash Commands**
```
/create-component AudioPlayer
```

**Opción 3: Agents**
```
Cambiar a @architect mode para planificar la arquitectura de beatgrid analysis
```

### Flujo de Desarrollo Típico

#### 1. Planificar Arquitectura
```
@architect mode

Quiero agregar análisis automático de beatgrids.
¿Cómo lo arquitecturaría?
```

#### 2. Escribir Tests Primero (TDD)
```
@workspace write-tests

Crear tests para el componente WaveformViewer
```

#### 3. Implementar Componente
```
@workspace create-component

Generar componente WaveformViewer que renderice el waveform
```

#### 4. Code Review
```
@reviewer mode

Revisar mi código de WaveformViewer.tsx
```

#### 5. Documentar
```
@workspace generate-docs

Generar documentación de la nueva API de beatgrid analysis
```

#### 6. Debuggear (Si hay problemas)
```
@debugger mode

El análisis de beatgrid falla. ¿Cómo debuggeo?
```

---

## Estructura de Directorios Creada

```
Symphony/
├── .github/
│   ├── copilot-instructions.md ................... Guía principal
│   ├── instructions/
│   │   ├── react-typescript.instructions.md
│   │   ├── tauri-rust.instructions.md
│   │   ├── testing.instructions.md
│   │   ├── documentation.instructions.md
│   │   ├── git-workflow.instructions.md
│   │   └── security.instructions.md
│   ├── prompts/
│   │   ├── create-component.prompt.md
│   │   ├── write-tests.prompt.md
│   │   ├── code-review.prompt.md
│   │   ├── architecture.prompt.md
│   │   └── generate-docs.prompt.md
│   ├── agents/
│   │   ├── architect.agent.md
│   │   ├── reviewer.agent.md
│   │   └── debugger.agent.md
│   └── workflows/
│       └── copilot-setup-steps.yml
├── docs/
│   └── base.md
├── src/
└── src-tauri/
```

---

## Principios Aplicados

Tu configuración sigue estos principios:

✅ **TDD (Test-Driven Development)**
- Escribe tests primero
- Cobertura mínima 80%
- Tests significativos, no solo para cobertura

✅ **Conventional Commits**
- `feat()`, `fix()`, `docs()`, `test()`, etc.
- Mensajes descriptivos en español
- Facilita automatización de releases

✅ **Versionado Semántico**
- MAJOR.MINOR.PATCH
- Tags automáticos en GitHub
- Workflow para builds Windows/Linux

✅ **Documentación en Español**
- Código comentado en español
- JSDoc y Doc comments
- README, ARCHITECTURE, API bien documentados

✅ **Seguridad**
- Validación de inputs
- Sin datos sensibles en logs
- Manejo explícito de errores

✅ **Modularidad**
- React con componentes pequeños
- Rust con módulos bien separados
- Arquitectura escalable

---

## Verificación de Setup

Ejecuta estos comandos para verificar que todo está correcto:

```bash
# Verificar archivos creados
ls -la .github/instructions/
ls -la .github/prompts/
ls -la .github/agents/
ls -la .github/workflows/

# El workflow debería estar disponible en GitHub Actions
git add .github/
git commit -m "ci: agregar configuración de GitHub Copilot"
git push
```

---

## Próximos Pasos

### 1. Configurar el Proyecto
Ejecuta en la terminal:
```bash
# Instala dependencias
npm install

# Instala dependencias Rust
cd src-tauri
cargo build
cd ..

# Prueba que todo funciona
npm run lint
npm test
cargo test
```

### 2. Crear Archivos de Documentación Base
```bash
# Estos archivos ya deberían existir, pero puedes mejorarlos:
- docs/ARCHITECTURE.md ............. Arquitectura técnica
- docs/API.md ...................... API de comandos Tauri
- CHANGELOG.md ..................... Registro de cambios
- README.md ........................ Descripción del proyecto
```

### 3. Usar Copilot desde el Inicio
Para la siguiente característica:
1. Abre Copilot Chat (`Ctrl+Shift+I`)
2. Usa modo `@architect` para planificar
3. Sigue flujo TDD: tests → implementación → documentación

### 4. Colaborar en Equipo
- Todos en el equipo heredan estas configuraciones
- Copilot proporcionará hints según el archivo abierto
- Los prompts aceleran tareas repetitivas

---

## Recursos Internos

- **Configuración principal:** [.github/copilot-instructions.md](./.github/copilot-instructions.md)
- **Guía de commits:** [.github/instructions/git-workflow.instructions.md](./.github/instructions/git-workflow.instructions.md)
- **Estrategia de testing:** [.github/instructions/testing.instructions.md](./.github/instructions/testing.instructions.md)
- **Especificación del proyecto:** [docs/base.md](../docs/base.md)

---

## Personalización

Si necesitas ajustar algo:

1. **Cambiar cobertura requerida** (80%) → Edita `testing.instructions.md`
2. **Cambiar convenciones de commits** → Edita `git-workflow.instructions.md`
3. **Agregar nuevos prompts** → Crea en `.github/prompts/`
4. **Agregar nuevas instrucciones** → Crea en `.github/instructions/`

---

## Soporte

Si necesitas ayuda:

- 📚 **Documentación:** Lee los archivos `.instructions.md` relevantes
- 💬 **Chat con Copilot:** Usa `@debugger mode` para preguntas
- 🔍 **Code Review:** Usa `@reviewer mode` para revisar código
- 🏗️ **Arquitectura:** Usa `@architect mode` para planificar

---

**¡Tu proyecto Symphony está listo para desarrollo con GitHub Copilot!** 🎵

*Última actualización: Diciembre 2025*
