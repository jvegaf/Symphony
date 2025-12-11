# Symphony

## Features

    Creación de Biblioteca musical: Importa tu música desde tu almacenamiento local.

    Sincronización: Sincroniza automáticamente todos los metadatos de las pistas, incluyendo formas de onda, beatgrids, cue points, loops, artwork y listas de reproducción.

    Estructura de Carpetas: La carga conserva la estructura original de archivos y carpetas locales.

    Debe de existir una pantalla de settings en el cual se puedan configurar las opciones de la aplicacion.

## Edición y Organización de la Biblioteca

    Gestión de Listas de Reproducción: Crea, edita y elimina listas de reproducción.

    Edición de Metadatos: Edita la información de las pistas y las calificaciones.

    Edición de Puntos de Referencia (Cue Points): Añade, edita y elimina Cue Points.

    Definición de Loops: Define y edita secciones de loop dentro de las pistas.

    Análisis Visual: Visualiza formas de onda y edita las cuadrículas de tiempo (beatgrids).

## Reproducción y Formatos

    Reproducción de Música: Permite la reproducción de las pistas dentro de la aplicación.

    Formatos Compatibles: Soporta una amplia gama de formatos de audio, incluyendo MP3, AAC/M4A, WAV, OGG, FLAC,  con la posibilidad de convertir a MP3 las pistas durante la importacion.

## Tecnologias

    Tauri 2.0: Framework principal
    React 18 + TypeScript: UI moderna y type-safe
    Tailwind CSS: Estilado rápido con modo oscuro built-in
    Zustand/Jotai: State management ligero
    Tanstack Query: Manejo de datos y cache
    WaveSurfer.js o Peaks.js: Visualización de waveforms
    Rust crates:
        symphonia: Decodificación de audio (MP3, FLAC, etc.)
        rodio: Reproducción de audio
        diesel o rusqlite: Base de datos
        serde: Serialización JSON


## UI 

    Tenemos los siguientes prototipos en los cuales nos tenemos que basar para generar la interfaz grafica.

    [main-window-light](./ui/main-window-light.html)

    [main-window-dark](./ui/main-window-dark.html)

## Extra

    Se debe de desarrollar con metodologia TDD con un code coverage del 80% para garantizar que se cumplen los requerimientos.

    Se debe versionar usando semantic versioning.

    Debe de existir un workflow de Github actions que genere los releases para windows y linux, tanto en instalable como en portable, segun se van creando los tags de las versiones.

    Todo debe estar debidamente documentado en castellano.

    Es necesario hacer commits cumpliendo las buenas practicas de conventional commits