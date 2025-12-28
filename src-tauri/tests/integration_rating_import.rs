/// Test de integración para verificar que el rating se importa correctamente
///
/// Este test verifica el flujo completo:
/// 1. Extraer metadatos de archivo MP3 con rating
/// 2. Convertir metadatos a Track
/// 3. Insertar Track en base de datos
/// 4. Leer de la base de datos y verificar que el rating se preservó
use std::path::Path;

#[test]
fn test_full_rating_import_flow() {
    // Usar el archivo de prueba real
    let test_file = Path::new("../data/test.mp3");

    if !test_file.exists() {
        println!("⚠️  Archivo test.mp3 no encontrado, skipping integration test");
        return;
    }

    println!("\n🧪 Test de Integración: Importación de Rating");
    println!("═══════════════════════════════════════════════\n");

    // PASO 1: Extraer metadatos
    println!("📖 PASO 1: Extrayendo metadatos del archivo...");
    let extractor = symphony_lib::library::MetadataExtractor::new();
    let metadata = extractor
        .extract_metadata(test_file)
        .expect("Failed to extract metadata");

    println!("   ✅ Archivo: {}", test_file.display());
    println!("   ✅ Título: {:?}", metadata.title);
    println!("   ✅ Artista: {:?}", metadata.artist);
    println!("   ✅ Rating extraído: {:?}", metadata.rating);

    assert_eq!(
        metadata.rating,
        Some(5),
        "El archivo test.mp3 debe tener rating de 5 estrellas"
    );

    // PASO 2: Convertir a Track (simulando lo que hace LibraryImporter)
    println!("\n🔄 PASO 2: Convirtiendo metadatos a Track...");

    let file_size = std::fs::metadata(test_file)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    let now = chrono::Local::now().to_rfc3339();

    let track = symphony_lib::db::models::Track {
        id: None,
        path: metadata.path.clone(),
        title: metadata
            .title
            .clone()
            .unwrap_or_else(|| "Unknown".to_string()),
        artist: metadata
            .artist
            .clone()
            .unwrap_or_else(|| "Unknown".to_string()),
        album: metadata.album.clone(),
        genre: metadata.genre.clone(),
        year: metadata.year,
        duration: metadata.duration,
        bitrate: metadata.bitrate,
        sample_rate: 44100,
        file_size,
        bpm: metadata.bpm.map(|b| b as f64),
        key: metadata.key.clone(),
        rating: metadata.rating, // ✅ CRÍTICO: Debe preservar el rating
        play_count: 0,
        last_played: None,
        date_added: now.clone(),
        date_modified: now,
        label: None,
        isrc: None,
        beatport_id: None,
    };

    println!("   ✅ Track creado:");
    println!("      - Título: {}", track.title);
    println!("      - Rating: {:?}", track.rating);
    println!("      - Key: {:?}", track.key);

    assert_eq!(
        track.rating,
        Some(5),
        "El Track debe preservar el rating de los metadatos"
    );

    // PASO 3: Insertar en base de datos
    println!("\n💾 PASO 3: Insertando en base de datos temporal...");

    // Crear base de datos temporal EN MEMORIA para el test
    use rusqlite::Connection;
    let conn = Connection::open_in_memory().expect("Failed to create in-memory database");

    // Inicializar esquema de la base de datos
    symphony_lib::db::migrations::run_migrations(&conn).expect("Failed to run migrations");

    let track_id =
        symphony_lib::db::queries::insert_track(&conn, &track).expect("Failed to insert track");

    println!("   ✅ Track insertado con ID: {}", track_id);

    // PASO 4: Leer de la base de datos y verificar
    println!("\n🔍 PASO 4: Leyendo desde base de datos...");

    let saved_track = symphony_lib::db::queries::get_track(&conn, &track_id)
        .expect("Failed to read track from database");

    println!("   ✅ Track leído:");
    println!("      - ID: {:?}", saved_track.id);
    println!("      - Título: {}", saved_track.title);
    println!("      - Artista: {}", saved_track.artist);
    println!("      - Rating: {:?}", saved_track.rating);
    println!("      - Key: {:?}", saved_track.key);

    // VERIFICACIONES FINALES
    println!("\n✅ VERIFICACIONES FINALES:");

    assert_eq!(
        saved_track.rating,
        Some(5),
        "❌ FALLO: El rating en la base de datos debería ser Some(5), pero es {:?}",
        saved_track.rating
    );
    println!("   ✅ Rating preservado: 5 estrellas");

    assert_eq!(saved_track.title, "HBFS");
    println!("   ✅ Título correcto");

    assert_eq!(saved_track.artist, "Luke Alessi & Jordan Brando");
    println!("   ✅ Artista correcto");

    // Key puede o no estar presente dependiendo del archivo
    println!("   ℹ️  Key en archivo: {:?}", saved_track.key);

    println!("\n🎉 TEST DE INTEGRACIÓN COMPLETADO EXITOSAMENTE!");
    println!("═══════════════════════════════════════════════\n");
}
