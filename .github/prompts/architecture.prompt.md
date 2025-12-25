---
agent: 'agent'
model: Claude Opus 4.5 (copilot)
tools: ['search/codebase', 'web/githubRepo', 'web/fetch']
description: 'Planificar arquitectura de nuevas características'
---

# Arquitectura & Diseño

Tu objetivo es generar un plan de arquitectura para nuevas características o refactorización.

## Información Necesaria

Si no está proporcionada, pregunta por:
1. **Descripción de la característica** - Qué se quiere lograr
2. **Requisitos funcionales** - Casos de uso principales
3. **Restricciones** - Performance, compatibilidad, etc.
4. **Alcance** - Frontend, backend, ambos

## Output

Genera un **Architecture Design Document** con:

### 1. Descripción General
- Qué problema resuelve
- Por qué es importante
- Impacto en el sistema

### 2. Requisitos
- Funcionales (qué hace)
- No-funcionales (performance, escalabilidad)
- Edge cases

### 3. Diseño Técnico
- Componentes principales
- Interfaces públicas
- Flujos de datos
- Diagramas de secuencia

### 4. Plan de Implementación
- Tareas granulares
- Dependencias
- Estimación de esfuerzo
- Orden de ejecución (TDD)

### 5. Testing Strategy
- Unit tests
- Integration tests
- E2E tests
- Coverage targets

### 6. Consideraciones
- Performance
- Security
- Escalabilidad
- Mantenibilidad

## Ejemplo

**Entrada:**
```
Característica: Análisis automático de beatgrids
Descripción: Detectar tempo y beatgrid de pistas automáticamente
Requisitos: Offline, rápido (< 5 seg), cacheado
```

**Output:**
```markdown
# Architecture: Beatgrid Analysis

## Visión General
Análisis automático de beatgrids usando algoritmo de detección de tempo
en backend Rust para máxima performance offline.

## Componentes
- Frontend: UI de progreso, display de análisis
- Backend: Algoritmo Rust, cacheo de resultados
- DB: Nuevo campo beatgrid_data en tabla tracks

## Flujo
1. Usuario importa biblioteca
2. Backend detecta pistas sin beatgrid
3. Análisis en background (async)
4. Resultados cacheados
5. UI muestra progreso

## Tareas
- [ ] Implementar algoritmo de detección (Rust)
- [ ] Crear comando Tauri para análisis
- [ ] UI de progreso (React)
- [ ] Tests >= 80% coverage
- [ ] Documentación de API

## Timeline
- Semana 1: Backend (algoritmo + tests)
- Semana 2: Frontend (UI + integración)
- Semana 3: Optimización + documentación
```

## Checklist

- [ ] Diagrama de componentes / flujos incluido
- [ ] Interfaces públicas definidas
- [ ] Plan de tests (unitario, integración, E2E)
- [ ] Consideraciones de performance
- [ ] Estrategia de error handling
- [ ] Documentación del usuario final
