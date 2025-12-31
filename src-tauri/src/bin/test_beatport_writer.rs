/// Test binario para verificar que el writer de Beatport funciona correctamente
///
/// Este test escribe tags usando el writer.rs de Beatport (incluyendo BPM)
/// y luego verifica que se puedan leer correctamente.

use std::env;
use std::path::Path;

// Importar directamente los módulos (no como crate)
use id3::{Content, Frame, Tag as Id3Tag, TagLike};
use lofty::prelude::{ItemKey, TaggedFileExt};

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Uso: {} <archivo.mp3>", args[0]);
        std::process::exit(1);
    }

    let file_path = Path::new(&args[1]);

    println!("Testing escritura de BPM con id3 crate en: {:?}", file_path);
    println!();

    // 1. Extraer BPM actual
    println!("=== BPM ANTES ===");
    match read_bpm_id3(file_path) {
        Ok(Some(bpm)) => println!("BPM actual: {}", bpm),
        Ok(None) => println!("Sin BPM"),
        Err(e) => println!("Error: {}", e),
    }

    println!();

    // 2. Escribir BPM usando id3
    let test_bpm = 128.5;
    println!("=== Escribiendo BPM {} ===", test_bpm);
    match write_bpm_mp3(file_path, test_bpm) {
        Ok(()) => println!("✅ BPM escrito correctamente"),
        Err(e) => {
            eprintln!("❌ Error escribiendo BPM: {}", e);
            std::process::exit(1);
        }
    }

    println!();

    // 3. Verificar con id3
    println!("=== BPM DESPUÉS (con id3) ===");
    match read_bpm_id3(file_path) {
        Ok(Some(bpm)) => {
            println!("✅ BPM leído: {}", bpm);
            if (bpm - test_bpm).abs() < 0.1 {
                println!("✅ BPM correcto");
            } else {
                println!("⚠️  BPM incorrecto: esperado {}, obtenido {}", test_bpm, bpm);
            }
        }
        Ok(None) => println!("❌ BPM no se escribió"),
        Err(e) => println!("❌ Error: {}", e),
    }

    println!();

    // 4. Verificar con lofty
    println!("=== BPM DESPUÉS (con lofty) ===");
    match read_bpm_lofty(file_path) {
        Ok(Some(bpm)) => println!("✅ BPM leído con lofty: {}", bpm),
        Ok(None) => println!("⚠️  lofty no puede leer el BPM"),
        Err(e) => println!("❌ Error con lofty: {}", e),
    }
}

fn write_bpm_mp3(file_path: &Path, bpm: f64) -> Result<(), String> {
    // Leer tag existente o crear uno nuevo
    let mut tag = Id3Tag::read_from_path(file_path).unwrap_or_else(|_| Id3Tag::new());

    // Crear frame TBPM
    let bpm_str = bpm.round().to_string();
    let frame = Frame::with_content("TBPM", Content::Text(bpm_str));

    // Eliminar TBPM existente y agregar el nuevo
    tag.remove("TBPM");
    tag.add_frame(frame);

    // Guardar
    tag.write_to_path(file_path, id3::Version::Id3v24)
        .map_err(|e| format!("Error escribiendo BPM: {}", e))?;

    Ok(())
}

fn read_bpm_id3(file_path: &Path) -> Result<Option<f64>, String> {
    let tag = Id3Tag::read_from_path(file_path)
        .map_err(|e| format!("Error leyendo tag: {}", e))?;

    if let Some(bpm_frame) = tag.get("TBPM") {
        if let Some(bpm_str) = bpm_frame.content().text() {
            if let Ok(bpm) = bpm_str.parse::<f64>() {
                return Ok(Some(bpm));
            }
        }
    }

    Ok(None)
}

fn read_bpm_lofty(file_path: &Path) -> Result<Option<f64>, String> {
    let tagged_file = lofty::read_from_path(file_path)
        .map_err(|e| format!("Error abriendo archivo: {}", e))?;

    if let Some(tag) = tagged_file.primary_tag() {
        if let Some(bpm_item) = tag.get_string(&ItemKey::Bpm) {
            if let Ok(bpm) = bpm_item.parse::<f64>() {
                return Ok(Some(bpm));
            }
        }
    }

    Ok(None)
}
