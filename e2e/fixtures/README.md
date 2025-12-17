# E2E Test Fixtures

Este directorio contiene archivos de audio de prueba para tests end-to-end.

## Estructura

```
test-music/
├── sample-01.mp3  # MP3 básico para importación
├── sample-02.flac # FLAC para tests de conversión
└── sample-03.wav  # WAV para tests de metadatos
```

## Generar Fixtures

Si no tienes archivos de audio de prueba, puedes generarlos con FFmpeg:

```bash
# Generar MP3 de 10 segundos
ffmpeg -f lavfi -i "sine=frequency=440:duration=10" -codec:a libmp3lame -b:a 128k sample-01.mp3

# Generar FLAC de 10 segundos
ffmpeg -f lavfi -i "sine=frequency=440:duration=10" -codec:a flac sample-02.flac

# Generar WAV de 10 segundos
ffmpeg -f lavfi -i "sine=frequency=440:duration=10" -codec:a pcm_s16le sample-03.wav
```

## Uso en Tests

Los tests E2E utilizan estos archivos para:
- Validar importación de biblioteca
- Probar reproducción de audio
- Verificar extracción de metadatos
- Probar conversión MP3
