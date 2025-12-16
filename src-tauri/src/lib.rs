pub mod db;
pub mod audio;
pub mod library;
pub mod commands;

use commands::audio::AudioPlayerState;
use commands::library::LibraryState;
use std::sync::{Arc, Mutex};
use db::Database;
use audio::WaveformState;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Configurar logger y mostrar ruta del archivo de log
    let log_file_path = if let Some(log_dir) = dirs::data_local_dir() {
        let log_path = log_dir.join("symphony").join("symphony.log");
        eprintln!("╔══════════════════════════════════════════════════════════════════╗");
        eprintln!("║ 🔍 LOG FILE: {:?}", log_path);
        eprintln!("║ Para ver logs en tiempo real:");
        eprintln!("║   tail -f {:?}", log_path);
        eprintln!("╚══════════════════════════════════════════════════════════════════╝");
        Some(log_path)
    } else {
        None
    };
    
    log::info!("==================== SYMPHONY STARTING ====================");
    log::info!("Iniciando Symphony...");
    if let Some(ref path) = log_file_path {
        log::info!("📝 Logs guardándose en: {:?}", path);
    }

    // Inicializar base de datos y ejecutar migraciones
    if let Err(e) = db::initialize() {
        log::error!("Error ejecutando migraciones: {}", e);
        panic!("Cannot start without database migrations: {}", e);
    }
    log::info!("Migraciones ejecutadas correctamente");

    // Obtener conexión a base de datos
    let db = match Database::new() {
        Ok(database) => {
            log::info!("Base de datos inicializada correctamente");
            Arc::new(Mutex::new(database))
        }
        Err(e) => {
            log::error!("Error inicializando base de datos: {}", e);
            panic!("Cannot start without database: {}", e);
        }
    };
    
    // Inicializar estados
    let waveform_state = Arc::new(WaveformState::new());
    
    // Connection para waveform (necesita tokio::sync::Mutex para async)
    // AIDEV-NOTE: Usamos una segunda conexión para waveform porque las async operations
    // necesitan tokio::sync::Mutex en lugar de std::sync::Mutex
    let db_path = dirs::data_local_dir()
        .expect("No local data directory")
        .join("symphony")
        .join("symphony.db");
    
    let waveform_db = Arc::new(tokio::sync::Mutex::new(
        rusqlite::Connection::open(&db_path).expect("Failed to open DB for waveform")
    ));

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                // AIDEV-NOTE: Configuración de logging mejorada
                // - LogDir: Guarda en archivo ~/.local/share/symphony/symphony.log
                // - Webview: Muestra en consola del navegador (F12)
                // - Stdout: Muestra en terminal (solo en desarrollo)
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("symphony.log".to_string()),
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                    #[cfg(debug_assertions)]
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                ])
                .level(log::LevelFilter::Info)
                .level_for("symphonia_core", log::LevelFilter::Warn) // Reducir ruido de symphonia
                .level_for("symphonia_bundle_mp3", log::LevelFilter::Warn)
                .build()
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AudioPlayerState::new()) // AudioPlayer se inicializa lazy al primer play
        .manage(LibraryState::new())
        .manage(waveform_state)
        .manage(waveform_db)
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            greet,
            // Audio commands
            commands::audio::play_track,
            commands::audio::pause_playback,
            commands::audio::resume_playback,
            commands::audio::stop_playback,
            commands::audio::get_playback_state,
            commands::audio::get_playback_position,
            commands::audio::set_playback_volume,
            commands::audio::get_audio_devices,
            commands::audio::set_audio_device,
            commands::audio::seek_to_position,
            commands::audio::get_waveform,
            commands::audio::cancel_waveform,
            commands::audio::decode_audio_metadata,
            commands::audio::read_audio_file,
            commands::audio::allow_asset_file,
            commands::audio::allow_asset_directory,
            // Library commands
            commands::library::import_library,
            commands::library::get_all_tracks,
            commands::library::search_tracks,
            commands::library::get_track_by_id,
            commands::library::get_library_stats,
            commands::library::update_track_metadata,
            // Playlist commands
            commands::playlists::create_playlist,
            commands::playlists::get_playlists,
            commands::playlists::get_playlist,
            commands::playlists::update_playlist,
            commands::playlists::delete_playlist,
            commands::playlists::add_track_to_playlist,
            commands::playlists::remove_track_from_playlist,
            commands::playlists::reorder_playlist_tracks,
            commands::playlists::get_playlist_tracks_cmd,
            // Analysis commands
            commands::analysis::analyze_beatgrid,
            commands::analysis::get_beatgrid,
            commands::analysis::update_beatgrid_offset,
            commands::analysis::delete_beatgrid,
            commands::analysis::create_cue_point,
            commands::analysis::get_cue_points,
            commands::analysis::update_cue_point,
            commands::analysis::delete_cue_point,
            commands::analysis::create_loop,
            commands::analysis::get_loops,
            commands::analysis::update_loop,
            commands::analysis::delete_loop,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greet_command() {
        let result = greet("Symphony");
        assert_eq!(result, "Hello, Symphony! You've been greeted from Rust!");
    }

    #[test]
    fn test_greet_empty_name() {
        let result = greet("");
        assert_eq!(result, "Hello, ! You've been greeted from Rust!");
    }

    #[test]
    fn test_greet_special_characters() {
        let result = greet("Música 🎵");
        assert_eq!(result, "Hello, Música 🎵! You've been greeted from Rust!");
    }
}
