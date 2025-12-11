# Requisitos - Symphony v1.0.0

## Formato de Requisitos

Este documento utiliza **EARS Notation** (Easy Approach to Requirements Syntax) para definir requisitos claros, testeables y sin ambigüedad.

## Requisitos Funcionales

### RF-001: Importación de Biblioteca Musical

#### RF-001.1: Selección de Carpeta
**WHEN** el usuario selecciona una carpeta desde el diálogo de importación, **THE SYSTEM SHALL** escanear recursivamente todos los archivos de audio soportados.

**Formatos soportados:** MP3, FLAC, WAV, OGG, M4A, AAC

#### RF-001.2: Preservación de Estructura
**WHEN** el sistema importa archivos de una biblioteca, **THE SYSTEM SHALL** preservar la estructura de carpetas original en los metadatos.

#### RF-001.3: Progreso de Importación
**WHILE** se está realizando la importación, **THE SYSTEM SHALL** emitir eventos de progreso cada 100 pistas procesadas o cada segundo.

#### RF-001.4: Importación en Background
**WHEN** se inicia una importación, **THE SYSTEM SHALL** permitir al usuario continuar utilizando otras funcionalidades de la aplicación sin bloqueo.

#### RF-001.5: Extracción de Metadatos
**WHEN** el sistema procesa un archivo de audio, **THE SYSTEM SHALL** extraer y almacenar: título, artista, álbum, año, género, BPM, duración, bitrate, formato y artwork (si está disponible).

### RF-002: Conversión a MP3 (Opcional)

#### RF-002.1: Configuración de Conversión
**WHERE** la conversión a MP3 está habilitada en configuración, **THE SYSTEM SHALL** convertir automáticamente archivos no-MP3 durante la importación.

#### RF-002.2: Preservación de Original
**WHEN** el sistema convierte un archivo a MP3, **THE SYSTEM SHALL** mantener el archivo original sin modificación.

#### RF-002.3: Configuración de Calidad
**WHERE** la conversión a MP3 está habilitada, **THE SYSTEM SHALL** permitir al usuario configurar el bitrate de salida (128, 192, 256, 320 kbps).

### RF-003: Reproducción de Audio

#### RF-003.1: Reproducción Básica
**WHEN** el usuario selecciona "Reproducir" en una pista, **THE SYSTEM SHALL** iniciar la reproducción desde el inicio (0:00).

#### RF-003.2: Control de Reproducción
**WHILE** una pista se está reproduciendo, **THE SYSTEM SHALL** proporcionar controles para: pausa, stop, siguiente, anterior, seek y volumen.

#### RF-003.3: Estado de Reproducción
**WHEN** el usuario solicita el estado de reproducción, **THE SYSTEM SHALL** devolver: posición actual (segundos), duración total, estado (reproduciendo/pausado/detenido).

### RF-004: Visualización de Waveforms

#### RF-004.1: Generación de Waveform
**WHEN** el usuario visualiza una pista por primera vez, **THE SYSTEM SHALL** generar y cachear la forma de onda con resolución configurable.

#### RF-004.2: Interacción con Waveform
**WHEN** el usuario hace click en la forma de onda, **THE SYSTEM SHALL** realizar seek a la posición correspondiente.

#### RF-004.3: Zoom de Waveform
**WHILE** visualiza una forma de onda, **THE SYSTEM SHALL** permitir zoom in/out con límites de 1x a 64x.

### RF-005: Análisis de Beatgrids

#### RF-005.1: Análisis Automático (Opcional)
**WHERE** el análisis automático está habilitado, **THE SYSTEM SHALL** analizar el beatgrid al importar cada pista.

#### RF-005.2: Análisis Bajo Demanda
**WHEN** el usuario solicita análisis de beatgrid para una pista, **THE SYSTEM SHALL** detectar el BPM y generar una grilla de beats alineada.

#### RF-005.3: Edición Manual de Beatgrid
**WHEN** el usuario edita un beatgrid, **THE SYSTEM SHALL** permitir ajustar: BPM base, offset inicial y ajuste fino de alineación.

### RF-006: Cue Points

#### RF-006.1: Creación de Cue Points
**WHEN** el usuario marca un cue point, **THE SYSTEM SHALL** almacenar: posición (segundos), etiqueta (opcional), color (opcional).

#### RF-006.2: Navegación por Cue Points
**WHEN** el usuario selecciona un cue point, **THE SYSTEM SHALL** realizar seek a esa posición.

#### RF-006.3: Límite de Cue Points
**THE SYSTEM SHALL** permitir hasta 8 cue points por pista.

### RF-007: Loops

#### RF-007.1: Creación de Loops
**WHEN** el usuario marca un loop, **THE SYSTEM SHALL** almacenar: posición inicial, posición final, nombre (opcional).

#### RF-007.2: Activación de Loop
**WHEN** el usuario activa un loop durante reproducción, **THE SYSTEM SHALL** reproducir repetidamente entre las posiciones inicial y final.

#### RF-007.3: Edición de Loops
**WHEN** el usuario edita un loop, **THE SYSTEM SHALL** permitir ajustar las posiciones inicial y final con precisión de 10ms.

### RF-008: Playlists

#### RF-008.1: Creación de Playlist
**WHEN** el usuario crea una playlist, **THE SYSTEM SHALL** solicitar nombre y almacenar con timestamp de creación.

#### RF-008.2: Agregar Pistas
**WHEN** el usuario arrastra pistas a una playlist, **THE SYSTEM SHALL** agregarlas manteniendo el orden de inserción.

#### RF-008.3: Reordenar Pistas
**WHILE** edita una playlist, **THE SYSTEM SHALL** permitir reordenar pistas mediante drag & drop.

#### RF-008.4: Eliminar de Playlist
**WHEN** el usuario elimina una pista de una playlist, **THE SYSTEM SHALL** removerla de la lista sin eliminar el archivo original.

### RF-009: Edición de Metadatos

#### RF-009.1: Edición In-App
**WHEN** el usuario edita metadatos de una pista, **THE SYSTEM SHALL** actualizar: título, artista, álbum, año, género, BPM, rating.

#### RF-009.2: Persistencia
**WHEN** el usuario guarda cambios en metadatos, **THE SYSTEM SHALL** actualizar la base de datos sin modificar el archivo de audio original.

#### RF-009.3: Rating de Pistas
**THE SYSTEM SHALL** permitir asignar rating de 0 a 5 estrellas a cada pista.

### RF-010: Integración con Servicios de Metadatos (Futuro)

#### RF-010.1: Búsqueda de Metadatos
**WHEN** el usuario solicita búsqueda de metadatos externos, **THE SYSTEM SHALL** consultar APIs de: Beatport, Traxsource, YouTube Music, Tidal, Deezer, Soundcloud.

**Nota:** Este requisito está planificado para versión 1.1.0+

## Requisitos No Funcionales

### RNF-001: Rendimiento

#### RNF-001.1: Tamaño de Biblioteca
**THE SYSTEM SHALL** soportar bibliotecas de hasta 10,000 pistas con tiempo de carga inicial menor a 5 segundos.

#### RNF-001.2: Importación
**THE SYSTEM SHALL** importar al menos 50 pistas por segundo en hardware de referencia (CPU 4 núcleos, SSD).

#### RNF-001.3: Memoria
**THE SYSTEM SHALL** mantener uso de memoria RAM por debajo de 500MB con 5,000 pistas cargadas.

### RNF-002: Usabilidad

#### RNF-002.1: Modo Oscuro
**THE SYSTEM SHALL** soportar modo oscuro con esquema de colores optimizado para uso prolongado.

#### RNF-002.2: Idioma
**THE SYSTEM SHALL** proporcionar interfaz completamente en español.

#### RNF-002.3: Accesibilidad
**THE SYSTEM SHALL** soportar navegación completa por teclado y lectores de pantalla.

### RNF-003: Compatibilidad

#### RNF-003.1: Plataformas
**THE SYSTEM SHALL** ejecutar en Windows 10+ y Linux (Ubuntu 20.04+, Arch, Fedora).

#### RNF-003.2: Formatos de Audio
**THE SYSTEM SHALL** decodificar correctamente archivos de audio según especificaciones oficiales de cada formato.

### RNF-004: Seguridad

#### RNF-004.1: Validación de Rutas
**WHEN** el sistema procesa rutas de archivo, **THE SYSTEM SHALL** validar contra path traversal y accesos no autorizados.

#### RNF-004.2: Permisos de Base de Datos
**THE SYSTEM SHALL** crear archivos de base de datos con permisos restrictivos (0600 en Unix).

### RNF-005: Calidad de Código

#### RNF-005.1: Cobertura de Tests
**THE SYSTEM SHALL** mantener cobertura de tests unitarios ≥ 80% para código nuevo.

#### RNF-005.2: Convenciones
**THE SYSTEM SHALL** seguir Conventional Commits para control de versiones.

#### RNF-005.3: Documentación
**THE SYSTEM SHALL** documentar todos los comandos Tauri públicos con JSDoc/Doc comments.

## Casos de Uso Principales

### CU-001: Importar Biblioteca Musical
1. Usuario abre aplicación
2. Usuario navega a "Importar Biblioteca"
3. Usuario selecciona carpeta raíz
4. Sistema escanea recursivamente
5. Sistema muestra progreso en tiempo real
6. Sistema completa importación
7. Usuario visualiza biblioteca importada

**Criterio de éxito:** 5,000 pistas importadas en menos de 2 minutos

### CU-002: Reproducir Pista con Análisis
1. Usuario busca pista en biblioteca
2. Usuario hace doble-click en pista
3. Sistema inicia reproducción
4. Sistema muestra waveform y beatgrid
5. Usuario visualiza cue points existentes
6. Usuario puede crear nuevos cue points durante reproducción

**Criterio de éxito:** Reproducción inicia en menos de 500ms

### CU-003: Crear y Gestionar Playlist
1. Usuario crea nueva playlist
2. Usuario busca pistas por artista/título
3. Usuario arrastra pistas a playlist
4. Usuario reordena pistas
5. Usuario guarda playlist
6. Sistema persiste cambios

**Criterio de éxito:** Playlist con 100 pistas creada y guardada sin errores

## Edge Cases y Manejo de Errores

### E-001: Archivos Corruptos
**IF** el sistema encuentra un archivo de audio corrupto durante importación, **THEN THE SYSTEM SHALL** registrar el error, continuar con archivos restantes y reportar al final.

### E-002: Permisos Insuficientes
**IF** el sistema no tiene permisos de lectura en una carpeta, **THEN THE SYSTEM SHALL** mostrar error específico con la ruta y continuar con carpetas accesibles.

### E-003: Espacio en Disco
**IF** no hay espacio suficiente para conversión a MP3, **THEN THE SYSTEM SHALL** pausar conversión y notificar al usuario.

### E-004: Pista No Encontrada
**IF** el usuario intenta reproducir una pista cuyo archivo ya no existe, **THEN THE SYSTEM SHALL** mostrar diálogo de error y ofrecer remover de biblioteca.

### E-005: Base de Datos Bloqueada
**IF** la base de datos está bloqueada por otro proceso, **THEN THE SYSTEM SHALL** reintentar hasta 3 veces con backoff exponencial antes de mostrar error.

## Restricciones y Limitaciones

### Restricción 1: Formatos de Audio
- Soportados: MP3, FLAC, WAV, OGG, M4A, AAC
- No soportados: WMA, ALAC, APE, DSD

### Restricción 2: Arquitectura
- Tauri 2.0 como framework principal
- React 18 para frontend
- Rust para backend
- SQLite para persistencia

### Restricción 3: Versionado
- Seguir Semantic Versioning (semver.org)
- Releases automáticas para tags de versión

## Dependencias

### Dependencias de Requisitos
- RF-004 depende de RF-003 (Waveform requiere reproducción)
- RF-005 depende de RF-001 (Análisis requiere pistas importadas)
- RF-006 y RF-007 dependen de RF-004 (Cue points y loops requieren waveform)
- RF-008 depende de RF-001 (Playlists requieren pistas importadas)

### Dependencias Externas
- APIs de servicios de metadatos (futuro)
- Codecs de audio del sistema operativo

## Matriz de Trazabilidad

| Requisito | Test Case | Design Doc | API Doc |
|-----------|-----------|------------|---------|
| RF-001    | TC-001    | DD-Import  | API-001 |
| RF-003    | TC-003    | DD-Audio   | API-003 |
| RF-004    | TC-004    | DD-Audio   | API-004 |
| RF-005    | TC-005    | DD-Audio   | API-005 |
| RF-008    | TC-008    | DD-Data    | API-008 |

## Confidence Score

**Puntuación de Confianza: 88%**

### Factores Positivos (+)
- Requisitos claros y respondidos (preguntas del plan)
- Stack tecnológico definido y maduro
- Patrones de arquitectura bien establecidos
- Alcance limitado a v1.0.0

### Factores de Riesgo (-)
- Integración con APIs externas (futuro) aún sin diseñar
- Rendimiento con bibliotecas >10k pistas por validar
- Conversión de audio puede requerir ajustes de calidad

### Estrategia de Ejecución
Según confidence score de 88% (High Confidence):
- ✅ Proceder con implementación completa
- ✅ Skip proof-of-concept
- ✅ Implementación incremental por milestones
- ✅ Documentación estándar completa

## Referencias

- [Plan de Implementación](./implementation-plan.md)
- [Documento Base](./base.md)
- [Estándares de Testing](./.github/instructions/testing.instructions.md)
