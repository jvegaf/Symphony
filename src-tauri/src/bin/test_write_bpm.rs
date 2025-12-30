/// Test binario para escribir y verificar BPM usando id3 (como hace Fix Tags)
/// 
/// Este test escribe un BPM usando id3 crate (como hace el writer.rs de Beatport)
/// y luego verifica si podemos leerlo con id3 y lofty.

use std::env;
use std::path::Path;

use id3::{Content, Frame, Tag as Id3Tag, TagLike};
use lofty::prelude::{Accessor, ItemKey, TaggedFileExt};

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 3 {
        eprintln!("Uso: {} <archivo.mp3> <bpm>", args[0]);
        std::process::exit(1);
    }

    let file_path = Path::new(&args[1]);
    let bpm_value: f64 = args[2].parse().expect("BPM debe ser un número");

    println!("Escribiendo BPM {} a: {:?}", bpm_value, file_path);
    println!();

    // Escribir BPM usando id3 (como hace Fix Tags ahora)
    match write_bpm_mp3(file_path, bpm_value) {
        Ok(()) => println!("✅ BPM escrito con id3"),
        Err(e) => {
            eprintln!("❌ Error escribiendo BPM con id3: {}", e);
            std::process::exit(1);
        }
    }

    println!();

    // Verificar con id3
    println!("=== Verificando con id3 crate ===");
    match read_bpm_id3(file_path) {
        Ok(Some(bpm)) => {
            println!("✅ BPM leído con id3: {}", bpm);
            if (bpm - bpm_value).abs() < 0.1 {
                println!("✅ BPM coincide");
            }
        }
        Ok(None) => println!("⚠️  No se encontró BPM con id3"),
        Err(e) => println!("❌ Error leyendo con id3: {}", e),
    }

    println!();

    // Verificar con lofty
    println!("=== Verificando con lofty ===");
    match read_bpm_lofty(file_path) {
        Ok(Some(bpm)) => {
            println!("✅ BPM leído con lofty: {}", bpm);
            if (bpm - bpm_value).abs() < 0.1 {
                println!("✅ BPM coincide");
            }
        }
        Ok(None) => println!("⚠️  No se encontró BPM con lofty"),
        Err(e) => println!("❌ Error leyendo con lofty: {}", e),
    }
}

/// Escribe BPM a un archivo MP3 usando id3 crate (idéntico al writer.rs de Beatport)
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

fn read_bpm_lofty(file_path: &Path) -> Result<Option<f64>, String> {
    let tagged_file = lofty::read_from_path(file_path)
        .map_err(|e| format!("Error abriendo archivo: {}", e))?;

    if let Some(tag) = tagged_file.primary_tag() {
        if let Some(bpm_item) = tag.get_string(&lofty::prelude::ItemKey::Bpm) {
            if let Ok(bpm) = bpm_item.parse::<f64>() {
                return Ok(Some(bpm));
            }
        }
    }

    Ok(None)
}

fn read_bpm_id3(file_path: &Path) -> Result<Option<f64>, String> {
    let tag = Id3Tag::read_from_path(file_path)
        .map_err(|e| format!("Error leyendo tag: {}", e))?;

    // Buscar TBPM frame
    if let Some(bpm_frame) = tag.get("TBPM") {
        if let Some(bpm_str) = bpm_frame.content().text() {
            if let Ok(bpm) = bpm_str.parse::<f64>() {
                return Ok(Some(bpm));
            }
        }
    }

    Ok(None)
}
