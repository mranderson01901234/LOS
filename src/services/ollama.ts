interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: {
    temperature?: number;
  };
}

// Check if Ollama is running
export async function checkOllama(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

// Get available models
export async function getModels(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch {
    return [];
  }
}

// Check if preferred conversational model is available
export async function checkPreferredModel(): Promise<{ available: boolean; model: string; suggestion?: string }> {
  try {
    const models = await getModels();
    const preferredModel = 'llama3.1:8b-instruct-q8_0';
    
    if (models.includes(preferredModel)) {
      return { available: true, model: preferredModel };
    }
    
    // Look for any instruct model as fallback
    const instructModel = models.find(m => m.includes('instruct'));
    if (instructModel) {
      return { available: true, model: instructModel };
    }
    
    // Use first available model as last resort
    if (models.length > 0) {
      return { 
        available: true, 
        model: models[0],
        suggestion: `Consider installing an instruct model for better conversations: ollama pull ${preferredModel}`
      };
    }
    
    return { 
      available: false, 
      model: preferredModel,
      suggestion: `Install Ollama and pull a model: ollama pull ${preferredModel}`
    };
  } catch {
    return { 
      available: false, 
      model: 'llama3.1:8b-instruct-q8_0',
      suggestion: 'Install Ollama and pull a model: ollama pull llama3.1:8b-instruct-q8_0'
    };
  }
}

// Pre-load model on app start for faster first response
export async function preloadModel(model: string = 'llama3.1:8b-instruct-q8_0'): Promise<void> {
  try {
    await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: 'Hello', // Dummy prompt to load model
        stream: false,
      }),
    });} catch (error) {
    console.error(`Failed to preload model ${model}:`, error);
  }
}

// Chat completion (streaming) - OPTIMIZED FOR PERFORMANCE
export async function chatCompletion(
  messages: OllamaMessage[],
  model: string,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {// Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {controller.abort();
    }, 60000); // 60 second timeout for better models

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages,
        stream: true,
        options: { 
          temperature: 0.8,           // Better for conversational responses
          top_p: 0.9,
          repeat_penalty: 1.2,        // Better for conversation flow
          num_predict: 1000,          // Longer responses for better conversation
          num_ctx: 4096,              // Larger context window for better memory
          stop: ['User:', 'Assistant:', '\n\n'], // Stop on role markers
        },
      } as OllamaChatRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);if (!response.ok) {
      throw new Error('Ollama request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              chunkCount++;onChunk(json.message.content);
            }
            if (json.done) {onComplete();
              return;
            }
          } catch (e) {
            console.error('Failed to parse chunk:', e, 'Line:', line);
          }
        }
      }
    }onComplete();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      onError(new Error('Request timed out after 5 seconds'));
    } else {
      onError(error as Error);
    }
  }
}

