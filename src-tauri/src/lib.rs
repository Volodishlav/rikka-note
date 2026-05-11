mod fuzzy_search;
mod ocr;
mod encryption;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            fuzzy_search::fuzzy_search,
            fuzzy_search::fuzzy_search_parallel,
            ocr::ocr_from_bytes,
            ocr::ocr_from_screen,
            encryption::setup_encryption,
            encryption::unlock_encryption,
            encryption::lock_encryption,
            encryption::is_encryption_unlocked,
            encryption::change_encryption_password,
            encryption::encrypt_file,
            encryption::decrypt_file,
            encryption::check_file_encrypted,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
