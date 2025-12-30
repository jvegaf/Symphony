//! Tests para extracción de metadatos de archivos de audio

use super::extractor::MetadataExtractor;
use std::path::Path;
use std::fs;
use id3::TagLike;

/// Crea un archivo MP3 de prueba con BPM tag usando id3 crate
fn create_test_mp3_with_bpm(bpm: f64) -> String {
    let test_dir = std::env::temp_dir().join("symphony_test_metadata");
    fs::create_dir_all(&test_dir).unwrap();

    let test_file = test_dir.join(format!("test_bpm_{}.mp3", bpm));

    // Copiar archivo de prueba existente
    let source = Path::new("../test-data/bang.mp3");
    if !source.exists() {
        panic!("Test file not found: {:?}", source);
    }

    fs::copy(source, &test_file).unwrap();

    // Agregar tag BPM usando id3 crate directamente
    let mut tag = id3::Tag::read_from_path(&test_file)
        .unwrap_or_else(|_| id3::Tag::new());

    // Agregar frame TBPM (ID3v2.4)
    tag.set_text("TBPM", bpm.to_string());

    // Guardar con ID3v2.3 (más compatible con lofty)
    tag.write_to_path(&test_file, id3::Version::Id3v23).unwrap();

    test_file.to_string_lossy().to_string()
}

#[test]
fn test_extract_bpm_integer() {
    // Crear archivo con BPM entero
    let test_file = create_test_mp3_with_bpm(128.0);

    let extractor = MetadataExtractor::new();
    let metadata = extractor.extract_metadata(Path::new(&test_file)).unwrap();

    assert!(metadata.bpm.is_some(), "BPM should be extracted");
    assert_eq!(metadata.bpm.unwrap(), 128.0, "BPM should be 128");

    // Limpiar
    fs::remove_file(&test_file).ok();
}

#[test]
fn test_extract_bpm_decimal() {
    // Crear archivo con BPM decimal
    let test_file = create_test_mp3_with_bpm(128.5);
    let extractor = MetadataExtractor::new();

    let metadata = extractor.extract_metadata(Path::new(&test_file)).unwrap();

    assert!(metadata.bpm.is_some(), "BPM should be extracted");
    assert_eq!(metadata.bpm.unwrap(), 128.5, "BPM should be 128.5");

    // Limpiar
    fs::remove_file(&test_file).ok();
}

#[test]
fn test_extract_bpm_high_precision() {
    // Crear archivo con BPM de alta precisión
    let test_file = create_test_mp3_with_bpm(174.23);
    let extractor = MetadataExtractor::new();

    let metadata = extractor.extract_metadata(Path::new(&test_file)).unwrap();

    assert!(metadata.bpm.is_some(), "BPM should be extracted");
    assert_eq!(metadata.bpm.unwrap(), 174.23, "BPM should be 174.23");

    // Limpiar
    fs::remove_file(&test_file).ok();
}

#[test]
fn test_extract_no_bpm() {
    // Archivo sin BPM
    let extractor = MetadataExtractor::new();
    let test_file = Path::new("../test-data/bang.mp3");

    let metadata = extractor.extract_metadata(test_file).unwrap();

    // El archivo original no debería tener BPM
    assert!(metadata.bpm.is_none(), "Original test file should not have BPM");
}

#[test]
fn test_extract_metadata_complete() {
    // Test de extracción completa de metadatos
    let test_file = create_test_mp3_with_bpm(140.0);
    let extractor = MetadataExtractor::new();

    let metadata = extractor.extract_metadata(Path::new(&test_file)).unwrap();

    // Verificar campos básicos
    assert!(metadata.title.is_some(), "Title should be extracted");
    assert!(metadata.duration > 0.0, "Duration should be positive");
    assert!(metadata.bitrate > 0, "Bitrate should be positive");
    assert!(metadata.sample_rate > 0, "Sample rate should be positive");
    assert_eq!(metadata.format, "mp3", "Format should be mp3");

    // Verificar BPM
    assert!(metadata.bpm.is_some(), "BPM should be extracted");
    assert_eq!(metadata.bpm.unwrap(), 140.0, "BPM should be 140");

    // Limpiar
    fs::remove_file(&test_file).ok();
}

#[test]
fn test_get_bpm_helper() {
    // Test directo de la función get_bpm_from_mp3_file
    use super::helpers::get_bpm_from_mp3_file;

    let test_file = create_test_mp3_with_bpm(150.0);

    let bpm = get_bpm_from_mp3_file(Path::new(&test_file));

    assert!(bpm.is_some(), "get_bpm_from_mp3_file should extract BPM");
    assert_eq!(bpm.unwrap(), 150.0, "BPM should be 150");

    // Limpiar
    fs::remove_file(&test_file).ok();
}

#[test]
fn test_bpm_zero_is_none() {
    // BPM de 0 debería ser tratado como None
    use super::helpers::get_bpm_from_mp3_file;

    let test_file = create_test_mp3_with_bpm(0.0);

    let bpm = get_bpm_from_mp3_file(Path::new(&test_file));

    assert!(bpm.is_none(), "BPM of 0 should be None");

    // Limpiar
    fs::remove_file(&test_file).ok();
}
