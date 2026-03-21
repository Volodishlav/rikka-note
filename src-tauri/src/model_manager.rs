use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;
use reqwest::Client;
use futures_util::StreamExt;

// Global state to store the llama-server child process
pub struct LlamaServerState {
    pub process: Mutex<Option<Child>>,
}

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    filename: String,
    downloaded: u64,
    total: Option<u64>,
}

pub fn get_app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app_data_dir: {}", e))
}

#[tauri::command]
pub async fn download_local_model(
    app: AppHandle,
    url: String,
    filename: String,
) -> Result<String, String> {
    println!("=== [DEBUG] Start downloading local model ===");
    println!("URL: {}", url);
    println!("Filename: {}", filename);

    let app_dir = get_app_data_dir(&app)?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    let file_path = app_dir.join(&filename);
    println!("Target path: {:?}", file_path);

    if file_path.exists() {
        println!("File already exists: {:?}", file_path);
        return Ok(file_path.to_string_lossy().to_string());
    }

    let client = Client::new();
    let res = client.get(&url).send().await.map_err(|e| format!("Request failed: {}", e))?;
    
    if !res.status().is_success() {
        return Err(format!("Download failed with HTTP status: {}", res.status()));
    }
    
    let total_size = res.content_length();

    let mut file = tokio::fs::File::create(&file_path)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();

    let mut last_emit = std::time::Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Error downloading chunk: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Error writing chunk: {}", e))?;
        downloaded += chunk.len() as u64;

        // Throttle events to avoid overloading the frontend, e.g. every 100ms
        if last_emit.elapsed().as_millis() > 200 || downloaded == total_size.unwrap_or(0) {
            let _ = app.emit(
                "model-download-progress",
                DownloadProgress {
                    filename: filename.clone(),
                    downloaded,
                    total: total_size,
                },
            );
            last_emit = std::time::Instant::now();
        }
    }

    println!("=== [DEBUG] Download local model finished! ===");
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn check_model_exists(app: AppHandle, filename: String) -> Result<bool, String> {
    let app_dir = get_app_data_dir(&app)?;
    let file_path = app_dir.join(&filename);
    Ok(file_path.exists())
}

#[tauri::command]
pub async fn start_llama_server(
    app: AppHandle,
    state: tauri::State<'_, LlamaServerState>,
    model_filename: String,
    port: u16,
) -> Result<String, String> {
    println!("=== [DEBUG] Starting llama-server ===");
    
    // Ensure we stop if it was already running
    let _ = stop_llama_server(state.clone()).await;

    let app_dir = get_app_data_dir(&app)?;
    let server_exe = app_dir.join("llama-server.exe");
    let model_path = app_dir.join(&model_filename);

    if !server_exe.exists() {
        return Err(format!("llama-server.exe not found at {:?}", server_exe));
    }
    if !model_path.exists() {
        return Err(format!("Model file not found at {:?}", model_path));
    }

    println!("Executing: {:?} -m {:?} --embedding --pooling last --port {}", server_exe, model_path, port);

    let mut child = Command::new(&server_exe)
        .arg("-m")
        .arg(&model_path)
        .arg("--embedding")
        .arg("--pooling")
        .arg("last")
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(port.to_string())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        // In a real application we'd use creation_flags to hide console window on windows
        .spawn()
        .map_err(|e| format!("Failed to start llama-server.exe: {}", e))?;

    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(l) = line {
                    println!("[llama-server stdout] {}", l);
                }
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(l) = line {
                    println!("[llama-server stderr] {}", l);
                }
            }
        });
    }

    let mut process_state = state.process.lock().unwrap();
    *process_state = Some(child);

    println!("=== [DEBUG] llama-server started on port {} ===", port);
    Ok(format!("Server started on port {}", port))
}

#[tauri::command]
pub async fn stop_llama_server(
    state: tauri::State<'_, LlamaServerState>,
) -> Result<String, String> {
    println!("=== [DEBUG] Stopping llama-server ===");
    let mut process_state = state.process.lock().unwrap();
    if let Some(mut child) = process_state.take() {
        println!("Killing llama-server process (PID: {})", child.id());
        let _ = child.kill();
        let _ = child.wait();
        println!("=== [DEBUG] llama-server stopped ===");
        Ok("Stopped".to_string())
    } else {
        println!("No llama-server process running.");
        Ok("Not running".to_string())
    }
}
