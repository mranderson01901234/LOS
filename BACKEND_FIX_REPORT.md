# Backend Fix Report - Tauri Web Search Implementation

## Executive Summary

The current LOS web search implementation is failing due to CORS restrictions when attempting to call search APIs directly from the browser. The most robust solution is to implement a proper backend proxy using Tauri's Rust backend to handle API calls without CORS limitations.

## Current Problem Analysis

### Issues Identified
1. **CORS Restrictions**: Browser blocks direct API calls to search services
2. **Rust Version Incompatibility**: Current Rust 1.75.0 too old for modern HTTP libraries
3. **Dependency Conflicts**: Modern crates require newer Rust versions
4. **Proxy Reliability**: Public CORS proxies are unreliable and limited

### Failed Attempts
- **CORS Proxy Services**: Limited header support, unreliable
- **Alternative APIs**: DuckDuckGo/Wikipedia have limited coverage
- **Direct Browser Calls**: Blocked by CORS policy

## Recommended Solution: Tauri Backend Proxy

### Architecture Overview
```
Frontend (React) → Tauri Command → Rust Backend → Search API → Response
```

### Benefits
- ✅ **No CORS Issues**: Backend makes API calls
- ✅ **Full API Support**: Can use any search API with headers
- ✅ **Better Performance**: Direct API calls, no proxy overhead
- ✅ **Security**: API keys stored securely in backend
- ✅ **Reliability**: No dependency on external proxy services
- ✅ **Cost Control**: Use free tiers of premium APIs

## Implementation Plan

### Phase 1: Environment Setup

#### 1.1 Update Rust Toolchain
```bash
# Install latest Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update stable
rustup default stable

# Verify version (should be 1.80+)
rustc --version
```

#### 1.2 Update Cargo.toml Dependencies
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
urlencoding = "2.1"
```

### Phase 2: Backend Implementation

#### 2.1 Search API Commands
```rust
// src-tauri/src/lib.rs

use serde::{Deserialize, Serialize};
use reqwest;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub description: String,
    pub snippet: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub total_results: u32,
    pub search_time: f64,
}

// Brave Search API command
#[tauri::command]
async fn search_brave(
    query: String,
    api_key: String,
    num_results: u32,
) -> Result<SearchResponse, String> {
    let client = reqwest::Client::new();
    
    let url = format!(
        "https://api.search.brave.com/res/v1/web/search?q={}&count={}",
        urlencoding::encode(&query),
        num_results
    );
    
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .header("X-Subscription-Token", api_key)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Search failed: {}", response.status()));
    }
    
    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let results = data["web"]["results"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|item| SearchResult {
            title: item["title"].as_str().unwrap_or("").to_string(),
            url: item["url"].as_str().unwrap_or("").to_string(),
            description: item["description"].as_str().unwrap_or("").to_string(),
            snippet: item["snippet"].as_str().map(|s| s.to_string()),
        })
        .collect();
    
    Ok(SearchResponse {
        results,
        total_results: data["web"]["total_results"].as_u64().unwrap_or(0) as u32,
        search_time: data["web"]["search_time"].as_f64().unwrap_or(0.0),
    })
}

// Google Search API command (via Serper.dev)
#[tauri::command]
async fn search_google(
    query: String,
    api_key: String,
    num_results: u32,
) -> Result<SearchResponse, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .post("https://google.serper.dev/search")
        .header("X-API-KEY", api_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "q": query,
            "num": num_results
        }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Search failed: {}", response.status()));
    }
    
    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let results = data["organic"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|item| SearchResult {
            title: item["title"].as_str().unwrap_or("").to_string(),
            url: item["link"].as_str().unwrap_or("").to_string(),
            description: item["snippet"].as_str().unwrap_or("").to_string(),
            snippet: item["snippet"].as_str().map(|s| s.to_string()),
        })
        .collect();
    
    Ok(SearchResponse {
        results,
        total_results: data["searchInformation"]["totalResults"].as_str().unwrap_or("0").parse().unwrap_or(0),
        search_time: data["searchInformation"]["searchTime"].as_f64().unwrap_or(0.0),
    })
}

// URL content fetching command
#[tauri::command]
async fn fetch_url_content(url: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (compatible; LOS-Bot/1.0)")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to fetch URL: {}", response.status()));
    }
    
    let content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read content: {}", e))?;
    
    // Extract text content (basic implementation)
    let text_content = extract_text_from_html(&content);
    Ok(text_content.chars().take(5000).collect())
}

fn extract_text_from_html(html: &str) -> String {
    // Basic HTML tag removal (could use a proper HTML parser)
    html.replace("<script>", "")
        .replace("</script>", "")
        .replace("<style>", "")
        .replace("</style>", "")
        .replace("<[^>]*>", "")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            search_brave,
            search_google,
            fetch_url_content
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 2.2 Frontend Integration
```typescript
// src/services/webSearch.ts

import { invoke } from '@tauri-apps/api/core';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  snippet?: string;
}

interface SearchResponse {
  results: SearchResult[];
  total_results: number;
  search_time: number;
}

export async function searchWeb(query: string, numResults: number = 5): Promise<SearchResult[]> {
  const cacheKey = `${query}-${numResults}`;
  const cached = searchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  try {
    // Try Brave Search first (if API key available)
    const braveApiKey = await getSearchApiKey('brave_api_key');
    if (braveApiKey) {
      try {
        const response = await invoke<SearchResponse>('search_brave', {
          query,
          apiKey: braveApiKey,
          numResults: numResults,
        });
        
        if (response.results.length > 0) {
          searchCache.set(cacheKey, { results: response.results, timestamp: Date.now() });
          await updateSearchUsage();
          return response.results;
        }
      } catch (error) {
        console.warn('Brave search failed, trying Google:', error);
      }
    }

    // Fallback to Google Search (via Serper.dev)
    const googleApiKey = await getSearchApiKey('google_api_key');
    if (googleApiKey) {
      try {
        const response = await invoke<SearchResponse>('search_google', {
          query,
          apiKey: googleApiKey,
          numResults: numResults,
        });
        
        if (response.results.length > 0) {
          searchCache.set(cacheKey, { results: response.results, timestamp: Date.now() });
          await updateSearchUsage();
          return response.results;
        }
      } catch (error) {
        console.warn('Google search failed:', error);
      }
    }

    return [];
  } catch (error) {
    console.error('Web search failed:', error);
    return [];
  }
}

export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const content = await invoke<string>('fetch_url_content', { url });
    return content.substring(0, 5000);
  } catch (error) {
    console.error('Failed to fetch URL:', error);
    return '';
  }
}
```

### Phase 3: Settings Integration

#### 3.1 Multiple API Key Support
```typescript
// src/components/Settings/Settings.tsx

const [braveApiKey, setBraveApiKey] = useState('');
const [googleApiKey, setGoogleApiKey] = useState('');
const [preferredProvider, setPreferredProvider] = useState('brave');

// API Key Configuration
<div className="space-y-4">
  <div>
    <label>Preferred Search Provider</label>
    <select value={preferredProvider} onChange={(e) => setPreferredProvider(e.target.value)}>
      <option value="brave">Brave Search (Free: 2000/month)</option>
      <option value="google">Google via Serper.dev (Free: $50 credit)</option>
    </select>
  </div>
  
  {preferredProvider === 'brave' && (
    <div>
      <label>Brave Search API Key</label>
      <input
        type="password"
        value={braveApiKey}
        onChange={(e) => setBraveApiKey(e.target.value)}
        placeholder="Get free key at brave.com/search/api"
      />
    </div>
  )}
  
  {preferredProvider === 'google' && (
    <div>
      <label>Serper.dev API Key</label>
      <input
        type="password"
        value={googleApiKey}
        onChange={(e) => setGoogleApiKey(e.target.value)}
        placeholder="Get key at serper.dev"
      />
    </div>
  )}
</div>
```

## Implementation Timeline

### Week 1: Environment Setup
- [ ] Update Rust toolchain
- [ ] Update dependencies
- [ ] Test basic Tauri commands

### Week 2: Backend Implementation
- [ ] Implement Brave Search command
- [ ] Implement Google Search command
- [ ] Implement URL content fetching
- [ ] Add error handling and logging

### Week 3: Frontend Integration
- [ ] Update webSearch service
- [ ] Update Settings UI
- [ ] Test end-to-end functionality

### Week 4: Testing & Optimization
- [ ] Performance testing
- [ ] Error handling improvements
- [ ] Documentation updates

## Cost Analysis

### API Costs
- **Brave Search**: Free (2000 queries/month)
- **Google via Serper.dev**: $50 free credit, then $5/1000 queries
- **Total Monthly Cost**: $0-50 depending on usage

### Development Costs
- **Time Investment**: ~2-3 weeks
- **Maintenance**: Minimal (standard Tauri updates)

## Risk Assessment

### Low Risk
- ✅ **Proven Technology**: Tauri + Rust is stable
- ✅ **Standard Patterns**: Common backend proxy pattern
- ✅ **Fallback Options**: Multiple API providers

### Medium Risk
- ⚠️ **Rust Learning Curve**: May need Rust knowledge
- ⚠️ **API Rate Limits**: Need to monitor usage
- ⚠️ **Dependency Updates**: Keep Rust toolchain current

### Mitigation Strategies
- **Documentation**: Comprehensive setup guides
- **Monitoring**: Usage tracking and alerts
- **Fallbacks**: Multiple API providers
- **Testing**: Comprehensive test suite

## Success Metrics

### Technical Metrics
- [ ] Search success rate > 95%
- [ ] Average response time < 2 seconds
- [ ] Zero CORS errors
- [ ] API usage within limits

### User Experience Metrics
- [ ] Web search works for all query types
- [ ] Results are relevant and comprehensive
- [ ] Settings are easy to configure
- [ ] No user-facing errors

## Alternative Solutions

### Option 1: Serper.dev (Immediate Solution)
- **What it provides**: Full Google search results
- **CORS Issue**: Designed to work with browsers
- **Cost**: $50 free credit, then $5/1000 searches
- **Quality**: Excellent (uses Google)
- **Implementation**: Direct fetch calls from frontend

### Option 2: SearchAPI.io
- **What it provides**: Google search results via proxy
- **CORS Issue**: Designed to work with browsers
- **Cost**: Free tier (1000 queries/month)
- **Quality**: Good (uses Google)

### Option 3: Custom Node.js Proxy
- **What it provides**: Any search API via your own proxy
- **CORS Issue**: Solved by running proxy on your server
- **Cost**: Server hosting costs
- **Quality**: Depends on underlying API

## Quick Start Guide

### For Immediate Implementation (Serper.dev)

1. **Get API Key**: Sign up at serper.dev
2. **Update webSearch.ts**:
```typescript
export async function searchWeb(query: string, numResults: number = 5): Promise<SearchResult[]> {
  const apiKey = await getSearchApiKey('serper_api_key');
  
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: query,
      num: numResults
    })
  });
  
  const data = await response.json();
  return data.organic.map((item: any) => ({
    title: item.title,
    url: item.link,
    description: item.snippet
  }));
}
```

3. **Update Settings**: Add Serper.dev API key configuration
4. **Test**: Try web search queries

### For Long-term Solution (Tauri Backend)

1. **Update Rust**: Follow Phase 1 setup instructions
2. **Implement Backend**: Follow Phase 2 code examples
3. **Update Frontend**: Follow Phase 2.2 integration
4. **Configure Settings**: Follow Phase 3 instructions

## Conclusion

Implementing a Tauri backend proxy is the most robust solution for LOS web search. While it requires updating the Rust toolchain and implementing backend commands, it provides:

- **Complete CORS freedom**
- **Full API support**
- **Better performance**
- **Enhanced security**
- **Cost control**

The investment in backend implementation will pay dividends in reliability, performance, and user experience. The solution is future-proof and can easily accommodate additional search providers or features.

**Recommendation**: 
1. **Immediate**: Implement Serper.dev for quick web search functionality
2. **Long-term**: Proceed with Tauri backend implementation for full control and performance

Both solutions will provide comprehensive web search capabilities that work seamlessly with LOS's hybrid approach of combining personal knowledge with real-time web information.
