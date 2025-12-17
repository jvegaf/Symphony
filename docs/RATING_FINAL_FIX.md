# Rating System - Fix Final

## El Verdadero Problema ❌

Había **DOS problemas** que impedían que los ratings se guardaran en la base de datos:

### Problema 1: Extracción (RESUELTO ✅)
La crate `lofty` no expone frames POPM de ID3v2, por lo que `extract_metadata()` siempre retornaba `rating: None`.

**Solución:** Usar la crate `id3` directamente para leer frames POPM.

### Problema 2: Importación (CRÍTICO ❌ → ✅)
**ESTE ERA EL PROBLEMA REAL:** Aunque arreglamos la extracción, el `LibraryImporter` **ignoraba completamente** el rating al convertir metadatos a Track.

**Código antes (línea 195 de `importer.rs`):**
```rust
Ok(Track {
    // ... otros campos
    key: None,        // ❌ Ignorando metadata.key
    rating: None,     // ❌ Ignorando metadata.rating (HARDCODEADO!)
    // ...
})
```

**Código después:**
```rust
Ok(Track {
    // ... otros campos
    key: metadata.key.clone(),     // ✅ Usar key de metadatos
    rating: metadata.rating,       // ✅ Usar rating de metadatos
    // ...
})
```

## Flujo del Bug

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuario importa data/test.mp3 (tiene POPM rating = 255 / 5★) │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. extract_metadata() lee archivo con id3 crate                 │
│    ✅ Extrae correctamente: metadata.rating = Some(5)           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. metadata_to_track() convierte metadatos a Track              │
│    ❌ HARDCODEA: track.rating = None (IGNORA metadata.rating)   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. insert_track() guarda en DB                                  │
│    ❌ Resultado: rating column = NULL                           │
└─────────────────────────────────────────────────────────────────┘
```

## Evidencia del Bug

### Test que fallaba antes del fix:
```rust
#[test]
fn test_metadata_to_track() {
    let metadata = TrackMetadata {
        // ...
        rating: Some(5),  // ✅ Metadatos tienen rating
        // ...
    };
    
    let track = importer.metadata_to_track(&metadata, &path).unwrap();
    
    assert_eq!(track.rating, Some(5)); // ❌ FALLABA: era None
}
```

### Después del fix:
```
test library::importer::tests::test_metadata_to_track ... ok ✅
```

## Cambios Realizados

### 1. Dependencias (`src-tauri/Cargo.toml`)
```toml
id3 = "1.16.3"  # Para leer/escribir frames POPM
```

### 2. Extracción de Rating (`src-tauri/src/library/metadata.rs`)

**Nuevas funciones:**
- `get_rating_from_mp3_file(path)` - Lee POPM con id3 crate
- `write_rating_to_mp3_file(path, rating)` - Escribe POPM con id3 crate

**Actualización en `extract_metadata()`:**
```rust
// Antes:
let rating = Self::get_rating_from_id3v2(&tagged_file); // Retornaba None

// Después:
let rating = Self::get_rating_from_mp3_file(path); // ✅ Usa id3 crate
```

### 3. Importación de Rating (`src-tauri/src/library/importer.rs`)

**Línea 195 - Fix crítico:**
```rust
// Antes:
rating: None,  // ❌

// Después:
rating: metadata.rating,  // ✅
```

**También arreglado:**
```rust
// Antes:
key: None,  // ❌

// Después:
key: metadata.key.clone(),  // ✅
```

### 4. Tests Agregados/Mejorados

#### metadata.rs:
- ✅ `test_extract_rating_from_real_mp3()` - Extrae 5★ de data/test.mp3
- ✅ `test_write_and_read_rating_roundtrip()` - Escribe y lee todos los valores 0-5
- ✅ `test_update_metadata_with_rating()` - Actualiza rating vía write_metadata()

#### importer.rs:
- ✅ `test_metadata_to_track()` - **Ahora verifica que rating se preserve**

## Test Results

### Backend (127 tests totales)
```
✅ 125/127 tests passing
   - 6/6 rating tests
   - 7/7 importer tests
   - 2 pre-existing failures (audio player/resampler, no relacionados)
```

### Frontend
```
✅ 30/30 TrackList tests (filter, sort, display)
```

## Verificación Manual

### 1. Test directo de extracción:
```bash
cd src-tauri
cargo test test_extract_rating_from_real_mp3 -- --nocapture
```

**Output esperado:**
```
📊 Metadatos extraídos de test.mp3:
   - Título: Some("HBFS")
   - Artista: Some("Luke Alessi & Jordan Brando")
   - Rating: Some(5) ✅
   - Duración: 324.96s
   - Bitrate: 320 kbps
```

### 2. Test de conversión:
```bash
cd src-tauri
cargo test test_metadata_to_track -- --nocapture
```

**Verifica que:**
```rust
assert_eq!(track.rating, Some(5)); // ✅ Ahora pasa
assert_eq!(track.key, Some("Am".to_string())); // ✅ Ahora pasa
```

### 3. Test de importación completa:
```bash
make dev  # Iniciar app
# 1. Borrar DB: rm ~/.config/symphony/symphony.db
# 2. Importar data/test.mp3 desde UI
# 3. Verificar en UI que muestra 5★
# 4. Verificar en DB:
sqlite3 ~/.config/symphony/symphony.db "SELECT title, rating, key FROM tracks WHERE title='HBFS';"
# Esperado: HBFS|5|<key_value>
```

## Archivos Modificados

1. ✅ `src-tauri/Cargo.toml` - Añadida dependencia `id3`
2. ✅ `src-tauri/src/library/metadata.rs` - Funciones de lectura/escritura POPM
3. ✅ `src-tauri/src/library/importer.rs` - **FIX CRÍTICO**: usar `metadata.rating` y `metadata.key`
4. ✅ Tests mejorados en ambos archivos

## Por Qué Funcionaban los Tests Unitarios

Los tests unitarios de `extract_metadata()` pasaban porque:
1. ✅ `extract_metadata()` SÍ extraía correctamente el rating
2. ✅ Los tests verificaban directamente el `TrackMetadata` retornado

**Pero fallaba en producción porque:**
- ❌ El `LibraryImporter` ignoraba el rating al convertir a `Track`
- ❌ No había test que verificara el flujo completo: extract → convert → insert

## Lección Aprendida

**AIDEV-NOTE:** Siempre verificar el **flujo completo** de datos, no solo componentes individuales:

```
File → extract_metadata() → TrackMetadata → metadata_to_track() → Track → insert_track() → DB
  ✅              ✅              ✅                 ❌              ❌          ❌         ❌
```

El bug estaba en el **paso 4 de 6**, pero los tests solo cubrían el paso 1-2.

## Próximos Pasos

1. ✅ Rating extraction working
2. ✅ Rating write working  
3. ✅ Import preserves rating
4. 🔲 **Integration test:** Import data/test.mp3 y verificar 5★ en UI y DB
5. 🔲 Test rating update via UI
6. 🔲 Add FLAC/M4A rating support (future)

## Referencias

- **Root Cause:** `importer.rs` línea 195 hardcodeaba `rating: None`
- **Fix:** Usar `metadata.rating` directamente
- **Test File:** `data/test.mp3` (5★)
- **Algorithm:** `round((stars / 5) * 255)` para conversión
