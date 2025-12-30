use std::env;
use std::path::Path;
use id3::TagLike;
use lofty::tag::Accessor;
use lofty::file::TaggedFileExt;

fn main() {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Uso: {} <ruta-archivo-mp3>", args[0]);
        std::process::exit(1);
    }
    
    let file_path = &args[1];
    println!("Probando extracción de BPM de: {}", file_path);
    
    // Test 1: Con lofty
    println!("\n=== Test 1: Usando lofty ===");
    match lofty::probe::Probe::open(file_path) {
        Ok(probe) => {
            match probe.read() {
                Ok(tagged_file) => {
                    if let Some(tag) = tagged_file.primary_tag() {
                        println!("Tag encontrado");
                        if let Some(bpm_str) = tag.get_string(&lofty::tag::ItemKey::Bpm) {
                            println!("BPM string: {}", bpm_str);
                            if let Ok(bpm) = bpm_str.parse::<f64>() {
                                println!("BPM parseado: {}", bpm);
                            }
                        } else {
                            println!("No se encontró BPM en tag lofty");
                        }
                    } else {
                        println!("No hay tag primario");
                    }
                }
                Err(e) => println!("Error leyendo archivo: {}", e),
            }
        }
        Err(e) => println!("Error abriendo archivo: {}", e),
    }
    
    // Test 2: Con id3 crate
    println!("\n=== Test 2: Usando id3 crate ===");
    match id3::Tag::read_from_path(file_path) {
        Ok(tag) => {
            println!("Tag ID3 leído correctamente");
            
            // Buscar frame TBPM
            if let Some(frame) = tag.get("TBPM") {
                println!("Frame TBPM encontrado: {:?}", frame);
                if let Some(text) = frame.content().text() {
                    println!("Texto del frame: {}", text);
                    if let Ok(bpm) = text.parse::<f64>() {
                        println!("BPM parseado: {}", bpm);
                    }
                }
            } else {
                println!("No se encontró frame TBPM en tag ID3");
            }
            
            // Listar todos los frames
            println!("\n=== Frames disponibles ===");
            for frame in tag.frames() {
                println!("Frame ID: {}", frame.id());
            }
        }
        Err(e) => println!("Error leyendo tag ID3: {}", e),
    }
    
    // Test 3: Con MetadataExtractor
    println!("\n=== Test 3: Usando MetadataExtractor de Symphony ===");
    use symphony_lib::library::metadata::extractor::MetadataExtractor;
    
    let extractor = MetadataExtractor::new();
    match extractor.extract_metadata(Path::new(file_path)) {
        Ok(metadata) => {
            println!("Metadata extraída correctamente");
            println!("Título: {:?}", metadata.title);
            println!("Artista: {:?}", metadata.artist);
            println!("BPM: {:?}", metadata.bpm);
            println!("Duración: {}", metadata.duration);
        }
        Err(e) => println!("Error extrayendo metadata: {}", e),
    }
}
