---
agent: 'agent'
model: Claude Haiku 4.5
tools: ['search/codebase', 'web/githubRepo']
description: 'Generar documentación del código y proyectos'
---

# Generar Documentación

Tu objetivo es generar documentación de alta calidad en español.

## Tipos de Documentación

### README.md
Descripción general del proyecto:
- Qué es Symphony
- Características principales
- Cómo instalar
- Cómo desarrollar
- Cómo testear
- Contribuciones

### ARCHITECTURE.md
Diseño técnico del sistema:
- Capas principales (Frontend, Backend, DB)
- Componentes y responsabilidades
- Flujos principales
- Patrones usados
- Diagramas

### API.md
Referencia de comandos Tauri:
- Lista de todos los comandos
- Parámetros de entrada
- Retorno esperado
- Ejemplos de uso
- Errores posibles

### CHANGELOG.md
Historial de cambios:
- Formato: semver
- Agregado, Corregido, Cambiado
- Referencias a issues
- Comparativas entre versiones

### Comentarios en Código
JSDoc para funciones públicas:

```typescript
/**
 * Importa biblioteca musical desde ruta local
 *
 * Escanea recursivamente, detecta audio, extrae metadatos,
 * sincroniza a BD.
 *
 * @param libraryPath - Ruta absoluta a carpeta
 * @param options - Opciones (timeout, formatos)
 * @returns Promesa con resultado de importación
 * @throws LibraryImportError si falla
 *
 * @example
 * const result = await importLibrary("/home/user/Música");
 * console.log(`Importadas ${result.count} pistas`);
 */
export async function importLibrary(
  libraryPath: string,
  options?: ImportOptions
): Promise<ImportResult>
```

## Estándares

### Lenguaje
- **Español claro** - Accesible para desarrolladores
- **Terminología consistente** - Glosario del proyecto
- **Presente imperativo** - "Importa", no "importando"
- **Voz pasiva mínima** - Preferir voz activa

### Estructura
- Encabezados jerárquicos (H1, H2, H3)
- Listas con bullets cuando enumeración
- Ejemplos de código con `\`\`\`bash\` o lenguaje
- Tablas para comparativas
- Referencias con links internos

### Contenido
- Introducción clara
- Tabla de contenidos para docs largas
- Secciones bien delimitadas
- Conclusión o siguiente paso
- Checklist cuando aplique

## Output Esperado

### Para Características
```
1. Descripción
2. Cómo usar (ejemplo)
3. Configuración (si aplica)
4. Troubleshooting
5. Referencias
```

### Para APIs
```
1. Descripción general
2. Tabla de comandos
3. Detalle por comando (params, return, ejemplo, errores)
4. Casos de uso comunes
5. Troubleshooting
```

### Para Arquitectura
```
1. Visión general
2. Capas y componentes
3. Flujos principales (diagramas)
4. Patrones y decisiones
5. Escalabilidad y consideraciones
```

## Checklist

- [ ] Español claro sin jerga
- [ ] Ejemplos funcionales y realistas
- [ ] Links internos correctos
- [ ] Formato consistente
- [ ] Sin typos
- [ ] Legible (max 80 caracteres, buen spacing)
