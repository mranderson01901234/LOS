use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Emitter, State};
use rusqlite::{Connection, Result as SqlResult};

mod secrets;
use secrets::{SecretsManager, LlmMessage, call_llm_api};

#[derive(Debug, Serialize, Deserialize)]
struct SearchResult {
    title: String,
    url: String,
    description: String,
    snippet: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SearchResponse {
    results: Vec<SearchResult>,
    total_results: u32,
    search_time: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ClipData {
    r#type: String, // article, image, url, note
    title: String,
    url: Option<String>,
    content: Option<String>,
    image_url: Option<String>,
    description: Option<String>,
    author: Option<String>,
    timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct SqliteClip {
    id: i32,
    r#type: String,
    title: String,
    url: Option<String>,
    content: Option<String>,
    image_url: Option<String>,
    description: Option<String>,
    author: Option<String>,
    timestamp: i64,
    created_at: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Placeholder implementations for search commands
// These will be implemented when Rust toolchain is updated to 1.80+
#[tauri::command]
async fn search_brave(_query: String, _api_key: String, _num_results: u32) -> Result<SearchResponse, String> {
    // TODO: Implement when Rust 1.80+ is available
    Err("Brave Search requires Rust 1.80+. Please update your Rust toolchain.".to_string())
}

#[tauri::command]
async fn search_google(_query: String, _api_key: String, _num_results: u32) -> Result<SearchResponse, String> {
    // TODO: Implement when Rust 1.80+ is available
    Err("Google Search requires Rust 1.80+. Please update your Rust toolchain.".to_string())
}

#[tauri::command]
async fn fetch_url_content(_url: String) -> Result<String, String> {
    // TODO: Implement when Rust 1.80+ is available
    Err("URL content fetching requires Rust 1.80+. Please update your Rust toolchain.".to_string())
}

// Command to read all clips from SQLite database
#[tauri::command]
async fn get_all_clips() -> Result<Vec<SqliteClip>, String> {
    let db_path = "/home/daniel-parker/Desktop/LOSenviorment/los-app/clips.db";
    
    match Connection::open(db_path) {
        Ok(conn) => {
            let mut stmt = match conn.prepare("SELECT id, type, title, url, content, image_url, description, author, timestamp, created_at FROM clips ORDER BY timestamp DESC") {
                Ok(stmt) => stmt,
                Err(e) => return Err(format!("Failed to prepare statement: {}", e)),
            };
            
            let clip_iter = match stmt.query_map([], |row| {
                Ok(SqliteClip {
                    id: row.get(0)?,
                    r#type: row.get(1)?,
                    title: row.get(2)?,
                    url: row.get(3)?,
                    content: row.get(4)?,
                    image_url: row.get(5)?,
                    description: row.get(6)?,
                    author: row.get(7)?,
                    timestamp: row.get(8)?,
                    created_at: row.get(9)?,
                })
            }) {
                Ok(iter) => iter,
                Err(e) => return Err(format!("Failed to execute query: {}", e)),
            };
            
            let mut clips = Vec::new();
            for clip in clip_iter {
                match clip {
                    Ok(clip) => clips.push(clip),
                    Err(e) => return Err(format!("Failed to read clip: {}", e)),
                }
            }
            
            Ok(clips)
        },
        Err(e) => Err(format!("Failed to open database: {}", e)),
    }
}

// Simple command to process clip data directly
#[tauri::command]
async fn process_clip_data(app_handle: tauri::AppHandle, clip_data: ClipData) -> Result<String, String> {
    println!("Processing clip: {:?}", clip_data);
    
    // Emit event to frontend
    match app_handle.emit("new-clip", clip_data.clone()) {
        Ok(_) => Ok("Clip processed successfully".to_string()),
        Err(e) => Err(format!("Failed to emit clip event: {}", e))
    }
}

// Secure API key management commands
#[tauri::command]
async fn store_secret(
    secrets_manager: State<'_, SecretsManager>,
    name: String,
    value: String,
) -> Result<String, String> {
    secrets_manager.store_secret(name.clone(), value).await?;
    Ok(format!("Secret '{}' stored securely", name))
}

#[tauri::command]
async fn get_secret(
    secrets_manager: State<'_, SecretsManager>,
    name: String,
) -> Result<String, String> {
    secrets_manager.get_secret(&name).await
}

#[tauri::command]
async fn has_secret(
    secrets_manager: State<'_, SecretsManager>,
    name: String,
) -> Result<bool, String> {
    Ok(secrets_manager.has_secret(&name).await)
}

#[tauri::command]
async fn list_secrets(
    secrets_manager: State<'_, SecretsManager>,
) -> Result<Vec<String>, String> {
    Ok(secrets_manager.list_secrets().await)
}

#[tauri::command]
async fn remove_secret(
    secrets_manager: State<'_, SecretsManager>,
    name: String,
) -> Result<String, String> {
    secrets_manager.remove_secret(&name).await?;
    Ok(format!("Secret '{}' removed", name))
}

// Secure LLM API call command
#[tauri::command]
async fn call_llm(
    secrets_manager: State<'_, SecretsManager>,
    model: String,
    messages: Vec<LlmMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
) -> Result<secrets::LlmResponse, String> {
    call_llm_api(&secrets_manager, model, messages, max_tokens, temperature).await
}

pub fn main() {
    tauri::Builder::default()
        .manage(SecretsManager::new())
        .invoke_handler(tauri::generate_handler![
            greet, 
            search_brave, 
            search_google, 
            fetch_url_content,
            process_clip_data,
            get_all_clips,
            store_secret,
            get_secret,
            has_secret,
            list_secrets,
            remove_secret,
            call_llm
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            // Start file watcher in a separate thread
            std::thread::spawn(move || {
                println!("LOS Clipper server starting (file-based communication)");

                let clips_dir = Path::new("/home/daniel-parker/Desktop/LOSenviorment/los-app/clips");
                if !clips_dir.exists() {
                    fs::create_dir_all(clips_dir).unwrap();
                }

                loop {
                    if let Ok(entries) = fs::read_dir(clips_dir) {
                        for entry in entries.flatten() {
                            if let Some(extension) = entry.path().extension() {
                                if extension == "json" {
                                    if let Ok(content) = fs::read_to_string(&entry.path()) {
                                        if let Ok(clip_data) = serde_json::from_str::<ClipData>(&content) {
                                            println!("Received clip from file: {:?}", clip_data);
                                            // Emit event to frontend
                                            app_handle.emit("new-clip", clip_data.clone()).unwrap();
                                            let _ = fs::remove_file(&entry.path());
                                        }
                                    }
                                }
                            }
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(500));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}