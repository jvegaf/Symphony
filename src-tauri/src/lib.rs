mod db;
mod audio;
mod library;
mod commands;

use commands::audio::AudioPlayerState;
use commands::library::LibraryState;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Inicializar base de datos
    if let Err(e) = db::initialize() {
        eprintln!("Error inicializando base de datos: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AudioPlayerState::new())
        .manage(LibraryState::new())
        .invoke_handler(tauri::generate_handler![
            greet,
            // Audio commands
            commands::audio::play_track,
            commands::audio::pause_playback,
            commands::audio::resume_playback,
            commands::audio::stop_playback,
            commands::audio::get_playback_state,
            commands::audio::decode_audio_metadata,
            // Library commands
            commands::library::import_library,
            commands::library::get_all_tracks,
            commands::library::search_tracks,
            commands::library::get_track_by_id,
            commands::library::get_library_stats,
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
