use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use tokio::sync::Mutex;

/// Secure storage for API keys and sensitive data
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecretData {
    pub value: String,
    pub created_at: u64,
    pub last_accessed: Option<u64>,
}

/// Secure secrets manager
pub struct SecretsManager {
    secrets: Mutex<HashMap<String, SecretData>>,
}

impl SecretsManager {
    pub fn new() -> Self {
        Self {
            secrets: Mutex::new(HashMap::new()),
        }
    }

    /// Store a secret securely
    pub async fn store_secret(&self, name: String, value: String) -> Result<(), String> {
        let mut secrets = self.secrets.lock().await;
        let secret_data = SecretData {
            value,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            last_accessed: None,
        };
        secrets.insert(name, secret_data);
        Ok(())
    }

    /// Retrieve a secret securely
    pub async fn get_secret(&self, name: &str) -> Result<String, String> {
        let mut secrets = self.secrets.lock().await;
        if let Some(secret_data) = secrets.get_mut(name) {
            secret_data.last_accessed = Some(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
            );
            Ok(secret_data.value.clone())
        } else {
            Err(format!("Secret '{}' not found", name))
        }
    }

    /// Check if a secret exists
    pub async fn has_secret(&self, name: &str) -> bool {
        let secrets = self.secrets.lock().await;
        secrets.contains_key(name)
    }

    /// List all secret names (without values)
    pub async fn list_secrets(&self) -> Vec<String> {
        let secrets = self.secrets.lock().await;
        secrets.keys().cloned().collect()
    }

    /// Remove a secret
    pub async fn remove_secret(&self, name: &str) -> Result<(), String> {
        let mut secrets = self.secrets.lock().await;
        if secrets.remove(name).is_some() {
            Ok(())
        } else {
            Err(format!("Secret '{}' not found", name))
        }
    }
}

/// LLM API request structure
#[derive(Debug, Serialize, Deserialize)]
pub struct LlmRequest {
    pub model: String,
    pub messages: Vec<LlmMessage>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmResponse {
    pub content: String,
    pub usage: Option<LlmUsage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmUsage {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub total_tokens: u32,
}

/// Call LLM API securely from backend
pub async fn call_llm_api(
    secrets_manager: &SecretsManager,
    model: String,
    messages: Vec<LlmMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
) -> Result<LlmResponse, String> {
    // Determine which API key to use based on model
    let api_key_name = if model.contains("claude") || model.contains("anthropic") {
        "anthropic_api_key"
    } else if model.contains("gpt") || model.contains("openai") {
        "openai_api_key"
    } else {
        return Err("Unsupported model type".to_string());
    };

    // Get API key securely
    let api_key = secrets_manager.get_secret(api_key_name).await?;

    // Prepare request
    let request = LlmRequest {
        model: model.clone(),
        messages,
        max_tokens,
        temperature,
    };

    // Make API call based on model type
    if model.contains("claude") || model.contains("anthropic") {
        call_anthropic_api(&api_key, request).await
    } else if model.contains("gpt") || model.contains("openai") {
        call_openai_api(&api_key, request).await
    } else {
        Err("Unsupported model type".to_string())
    }
}

/// Call Anthropic Claude API
async fn call_anthropic_api(api_key: &str, request: LlmRequest) -> Result<LlmResponse, String> {
    let client = reqwest::Client::new();
    
    let anthropic_request = serde_json::json!({
        "model": request.model,
        "max_tokens": request.max_tokens.unwrap_or(1000),
        "messages": request.messages
    });

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&anthropic_request)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("API error: {}", error_text));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = response_json["content"][0]["text"]
        .as_str()
        .ok_or("No content in response")?
        .to_string();

    let usage = if let Some(usage_obj) = response_json.get("usage") {
        Some(LlmUsage {
            input_tokens: usage_obj["input_tokens"].as_u64().unwrap_or(0) as u32,
            output_tokens: usage_obj["output_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: usage_obj["total_tokens"].as_u64().unwrap_or(0) as u32,
        })
    } else {
        None
    };

    Ok(LlmResponse { content, usage })
}

/// Call OpenAI API
async fn call_openai_api(api_key: &str, request: LlmRequest) -> Result<LlmResponse, String> {
    let client = reqwest::Client::new();
    
    let openai_request = serde_json::json!({
        "model": request.model,
        "messages": request.messages,
        "max_tokens": request.max_tokens,
        "temperature": request.temperature
    });

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&openai_request)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("API error: {}", error_text));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = response_json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("No content in response")?
        .to_string();

    let usage = if let Some(usage_obj) = response_json.get("usage") {
        Some(LlmUsage {
            input_tokens: usage_obj["prompt_tokens"].as_u64().unwrap_or(0) as u32,
            output_tokens: usage_obj["completion_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: usage_obj["total_tokens"].as_u64().unwrap_or(0) as u32,
        })
    } else {
        None
    };

    Ok(LlmResponse { content, usage })
}
