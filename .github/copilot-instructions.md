---
description: "Instrucciones principales para GitHub Copilot - Symphony Music Library Application"
---

# Instrucciones de GitHub Copilot - Symphony

**Comportamiento de Copilot:**
- Nombre: `GitHub Copilot` (responder así si se te pregunta).
- Idioma: Español.
- Estilo: Respuestas cortas, impersonales y directas; prioriza la claridad, sigue TDD y las convenciones del proyecto (Conventional Commits, documentación en español).

Symphony es una aplicación de escritorio para gestionar bibliotecas musicales profesionales, construida con **Tauri 2.0**, **React 18**, **TypeScript** y **Rust**.

## Principios Fundamentales

### 1. Metodología TDD (Test-Driven Development)
- **Escribe pruebas primero**: Define el comportamiento esperado antes de implementar.
- **Cobertura mínima del 80%**: Todo nuevo código debe alcanzar al menos 80% de cobertura.
- **Pruebas significativas**: Las pruebas deben verificar comportamiento, no solo cobertura.
- Referencia: [testing.instructions.md](./instructions/testing.instructions.md)

### 2. Convenciones de Commit (Conventional Commits)
Todos los commits deben seguir el formato:
```
<tipo>(<alcance>): <descripción>

<cuerpo opcional>
<pie opcional>
```

**Tipos permitidos:**
- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (sin lógica)
- `refactor`: Refactorización sin cambios de funcionalidad
- `perf`: Mejoras de rendimiento
- `test`: Agregar o actualizar pruebas
- `chore`: Cambios en herramientas, dependencias, etc.
- `ci`: Cambios en CI/CD

**Ejemplos:**
```
feat(audio-player): agregar soporte para loops personalizados
fix(library): corregir sincronización de metadatos de FLAC
test(waveform): aumentar cobertura de visualización al 85%
docs(setup): actualizar instrucciones de instalación
```

### 3. Versionado Semántico
Usa [Semantic Versioning](https://semver.org/es/) para versiones:
- `MAJOR.MINOR.PATCH` (ej: v1.2.3)
- MAJOR: Cambios incompatibles
- MINOR: Nuevas características compatibles
- PATCH: Correcciones de bugs

### 4. Documentación en Español
- Toda documentación debe estar en español.
- Mantén README, CHANGELOG y comentarios de código claros y accesibles.
- Usa terminología consistente en la documentación técnica.

## Stack Tecnológico

### Frontend
- **React 18** con TypeScript (strict mode)
- **Tailwind CSS** con soporte para modo oscuro
- **Zustand/Jotai** para state management
- **TanStack Query** para manejo de datos y cache
- **WaveSurfer.js o Peaks.js** para visualización de waveforms

### Backend (Rust + Tauri)
- **Tauri 2.0** como framework principal
- **Symphonia**: Decodificación de audio
- **Rodio**: Reproducción de audio
- **Diesel o Rusqlite**: Base de datos
- **Serde**: Serialización JSON

### Testing
- **Vitest**: Unit tests para TypeScript/React
- **React Testing Library**: Pruebas de componentes
- **Cypress/Playwright**: E2E tests
- **Rust tests**: Pruebas unitarias de backend

### CI/CD
- **GitHub Actions**: Para builds y releases automatizados
- Genera releases para Windows y Linux (instalable y portable)
- Activados automáticamente por semantic version tags

## Estructura de Archivos y Carpetas

```
symphony/
├── .github/
│   ├── copilot-instructions.md (este archivo)
│   ├── instructions/
│   │   ├── react-typescript.instructions.md
│   │   ├── tauri-rust.instructions.md
│   │   ├── testing.instructions.md
│   │   ├── documentation.instructions.md
│   │   ├── security.instructions.md
│   │   └── git-workflow.instructions.md
│   ├── prompts/
│   ├── chatmodes/
│   └── workflows/
│       ├── copilot-setup-steps.yml
│       └── release.yml
├── src/
│   ├── main.tsx          # Entrada de React
│   ├── components/       # Componentes reutilizables
│   ├── pages/           # Páginas principales
│   ├── stores/          # Estado global (Zustand/Jotai)
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utilidades
│   ├── types/           # Tipos TypeScript compartidos
│   └── styles/          # Estilos globales
├── src-tauri/
│   ├── src/
│   │   ├── main.rs      # Entrada del backend Rust
│   │   ├── audio/       # Lógica de audio
│   │   ├── library/     # Gestión de biblioteca
│   │   ├── db/          # Operaciones de base de datos
│   │   └── commands/    # Comandos Tauri
│   ├── Cargo.toml
│   └── tests/
├── tests/               # E2E tests
├── docs/
│   ├── base.md         # Especificación del proyecto
│   ├── ARCHITECTURE.md # Arquitectura técnica
│   ├── API.md         # API Tauri
│   └── ui/            # Prototipos HTML
├── vite.config.ts     # Configuración Vite
├── tauri.conf.json    # Configuración Tauri
├── tsconfig.json      # Configuración TypeScript
├── vitest.config.ts   # Configuración Vitest
└── CHANGELOG.md       # Registro de cambios

```

## Patrones de Desarrollo

### Componentes React
- Usa **componentes funcionales** con hooks
- Mantén componentes pequeños y enfocados (máx 200 líneas)
- Coloca estilos específicos en carpeta del componente
- Implementa pruebas unitarias junto al componente

### Llamadas a Tauri
- Centraliza comandos Tauri en hooks personalizados
- Usa **TanStack Query** para cacheo y sincronización
- Maneja errores explícitamente con tipos
- Registra todos los comandos en un archivo central

### Estado Global
- Usa **Zustand** o **Jotai** según preferencia
- Mantén stores cercanos a donde se usan
- Divide por feature, no por tipo de dato
- Siempre tipifica con TypeScript

### Base de Datos
- Usa migraciones versionadas
- Implementa índices para consultas frecuentes
- Mantén esquema sincronizado con tipos TypeScript

## Estándares de Código

### TypeScript
- **Modo strict**: Siempre habilitado
- **No usar `any`**: Usa tipos explícitos
- **Nombres descriptivos**: Variables y funciones autoexplicativas
- **Prefer const/readonly**: Minimiza mutabilidad

### React
- **Hooks rules**: No condicionales, siempre en el mismo orden
- **Composición**: Prefiere composición sobre herencia
- **Memo**: Usa `React.memo` solo cuando sea necesario
- **Keys**: Nunca uses índices como keys en listas

### Rust
- Sigue `rustfmt` y `clippy`
- Manejo explícito de errores con `Result`
- Documentación con `///` para funciones públicas
- Tests integrados en mismo archivo

## Flujo de Desarrollo
Antes de planificar cualquier trabajo, repasa la documentación disponible usando el servicio MCP Context7 (buscar la librería/proyecto relevante y leer los documentos devueltos). Esto asegura que las decisiones de diseño y planificación se basen en la documentación vigente.

Pauta rápida para usar MCP Context7:
- Resuelve la librería con `mcp_context7_resolve-library-id` usando el nombre del paquete o proyecto.
- Recupera documentación focalizada con `mcp_context7_get-library-docs` (topics: 'hooks', 'routing', 'architecture', etc.).
- Anota enlaces y referencias en el `requirements.md` o en la tarea/issue antes de planificar.

1. **Crear issue**: Describe la característica o bug
2. **Crear rama**: `git checkout -b feat/descripcion` o `fix/descripcion`
3. **Escribir tests**: Primero (TDD)
4. **Implementar**: Código para que pasen los tests
5. **Refactorizar**: Mejorar código manteniendo tests verdes
6. **Validar cobertura**: Asegurar 80%+ coverage
7. **Commit**: Seguir Conventional Commits
8. **PR**: Referencia el issue, incluye descripción clara
9. **Review**: Espera aprobación
10. **Merge**: Squash o rebase según política

## Verificación de Calidad

Antes de hacer push, verifica:
- [ ] Tests pasan (`npm test` y `cargo test`)
- [ ] Cobertura ≥ 80% (`npm run coverage`)
- [ ] Linter sin errores (`npm run lint`)
- [ ] Tipos correctos (`npm run type-check`)
- [ ] Build exitoso (`npm run build` y `cargo build`)
- [ ] Commits siguen Conventional Commits

## Recursos

- [React TypeScript Guidelines](./instructions/react-typescript.instructions.md)
- [Tauri Rust Guidelines](./instructions/tauri-rust.instructions.md)
- [Testing Strategy](./instructions/testing.instructions.md)
- [Documentation Standards](./instructions/documentation.instructions.md)
- [Git Workflow & Commits](./instructions/git-workflow.instructions.md)
- [Security Best Practices](./instructions/security.instructions.md)

---

*Última actualización: Diciembre 2025*
