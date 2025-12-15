pub mod db;
pub mod audio;
pub mod library;
pub mod commands;

use commands::audio::AudioPlayerState;
use commands::library::LibraryState;
use std::sync::{Arc, Mutex};
use db::Database;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Configurar logger y mostrar ruta del archivo de log
    if let Some(log_dir) = dirs::data_local_dir() {
        let log_path = log_dir.join("symphony").join("symphony.log");
        eprintln!("🔍 LOG FILE: {:?}", log_path);
        eprintln!("Para ver los logs en tiempo real: tail -f {:?}", log_path);
    }
    
    log::info!("==================== SYMPHONY STARTING ====================");
    log::info!("Iniciando Symphony...");

    // Inicializar base de datos
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

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::LogDir {
                    file_name: Some("symphony.log".to_string()),
                },
            ))
            .build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AudioPlayerState::new()) // AudioPlayer se inicializa lazy al primer play
        .manage(LibraryState::new())
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
            commands::audio::generate_waveform_data,
            commands::audio::get_cached_waveform,
            commands::audio::generate_and_cache_waveform,
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
