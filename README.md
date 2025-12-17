# Symphony 🎵

Aplicación de escritorio profesional para gestionar bibliotecas musicales con importación, reproducción, análisis de audio y herramientas de organización avanzadas.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Version](https://img.shields.io/badge/version-0.5.1-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## ✨ Características

- 📁 **Importación de Bibliotecas:** Escaneo recursivo con preservación de estructura
- 🎵 **Reproducción Integrada:** Player completo con waveform interactivo (canvas propio, streaming progresivo, seek visual, feedback instantáneo). Ver [docs/waveform-implementation.md](./docs/waveform-implementation.md) para detalles.
- 📊 **Análisis de Audio:** Beatgrids automáticos, cue points y loops personalizados
- 📋 **Playlists:** Gestión completa con drag & drop
- ✏️ **Edición de Metadatos:** Editor integrado con rating de pistas (nuevo sistema visual de estrellas, mejoras UX v0.4.0)
- 🔄 **Conversión de Audio:** Opcional a MP3 durante importación
- 🌙 **Modo Oscuro:** Interfaz optimizada para uso prolongado

## 🐛 Últimas correcciones críticas (v0.5.1)

- Tres bugs críticos de interacción con waveform RESUELTOS ([commit eb3ea9a](https://github.com/jvegaf/Symphony/commit/eb3ea9a)):
  - Seek en waveform ahora funciona correctamente (evento 'click')
  - Waveform solo se genera al reproducir (doble click), no al seleccionar
  - Overlay de CuePointEditor ya no bloquea clicks (patrón pointer-events)
- Documentación técnica: [`docs/WAVEFORM_FIXES_COMPLETE.md`](./docs/WAVEFORM_FIXES_COMPLETE.md), [`docs/WAVEFORM_FIXES_QUICKREF.md`](./docs/WAVEFORM_FIXES_QUICKREF.md)
- Script de verificación: [`scripts/verify-waveform-fixes.sh`](./scripts/verify-waveform-fixes.sh)

## 🧪 Testing

- **Tests Totales:** 567 (420 frontend + 147 backend) — 100% passing ✅
- **Cobertura:** 80%+ en todos los módulos
- **Build:** Exitosa (331.31 kB)
- No hay bugs críticos abiertos en el sistema de waveform

[...resto del README sin cambios...]
