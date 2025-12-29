pub mod audio;
pub mod commands;
pub mod db;
pub mod library;
pub mod utils;

use audio::WaveformState;
use commands::audio::AudioPlayerState;
use commands::library::LibraryState;
use db::Database;
use std::sync::{Arc, Mutex};
use utils::paths::{ensure_app_dirs, get_db_path, get_log_path};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // AIDEV-NOTE: Asegurar que existan todos los directorios de configuración
    // antes de iniciar la aplicación (~/.config/symphony/)
    let config_dir = match ensure_app_dirs() {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("❌ Error creando directorios de configuración: {}", e);
            panic!("Cannot create configuration directories: {}", e);
        }
    };

    let log_file_path = get_log_path();
    let db_path = get_db_path();

    eprintln!("╔══════════════════════════════════════════════════════════════════╗");
    eprintln!("║ 📁 CONFIG DIR: {:?}", config_dir);
    eprintln!("║ 🔍 LOG FILE:   {:?}", log_file_path);
    eprintln!("║ 💾 DATABASE:   {:?}", db_path);
    eprintln!("║ ");
    eprintln!("║ Para ver logs en tiempo real:");
    eprintln!("║   tail -f {:?}", log_file_path);
    eprintln!("╚══════════════════════════════════════════════════════════════════╝");

    log::info!("==================== SYMPHONY STARTING ====================");
    log::info!("Iniciando Symphony...");
    log::info!("📁 Directorio de configuración: {:?}", config_dir);
    log::info!("📝 Logs guardándose en: {:?}", log_file_path);
    log::info!("💾 Base de datos en: {:?}", db_path);

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
    let waveform_db = Arc::new(tokio::sync::Mutex::new(
        rusqlite::Connection::open(&db_path).expect("Failed to open DB for waveform"),
    ));

    // AIDEV-NOTE: Conexión sync para comandos de análisis y playlists
    // Estos comandos usan std::sync::Mutex<Connection> directamente
    let sync_db = std::sync::Mutex::new(
        rusqlite::Connection::open(&db_path).expect("Failed to open DB for sync commands"),
    );

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                // AIDEV-NOTE: Configuración de logging centralizada
                // - LogDir: Guarda en archivo ~/.config/symphony/symphony.log (XDG Base Directory)
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
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AudioPlayerState::new()) // AudioPlayer se inicializa lazy al primer play
        .manage(LibraryState::new())
        .manage(waveform_state)
        .manage(waveform_db)
        .manage(sync_db) // AIDEV-NOTE: Para comandos de análisis y playlists
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
            commands::audio::clear_waveform_cache,
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
            commands::library::delete_track,
            commands::library::reset_library,
            commands::library::consolidate_library,
            commands::library::get_track_artwork,
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
            // Settings commands
            commands::settings::get_setting,
            commands::settings::get_all_settings,
            commands::settings::update_setting,
            commands::settings::reset_settings,
            // Conversion commands
            commands::conversion::convert_track_to_mp3,
            commands::conversion::batch_convert_to_mp3,
            commands::conversion::check_ffmpeg_installed,
            // Beatport commands
            commands::beatport::fix_tags,
            commands::beatport::find_artwork,
            commands::beatport::search_beatport_candidates,
            commands::beatport::apply_selected_tags,
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
