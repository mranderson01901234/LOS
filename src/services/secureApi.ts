/**
 * Secure API Service - Frontend interface for secure backend API calls
 * 
 * This service replaces direct API calls with secure backend invocations
 * to prevent API key exposure in the client bundle.
 */

import { invoke } from '@tauri-apps/api/core';

export interface LlmMessage {
  role: string;
  content: string;
}

export interface LlmResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface LlmRequest {
  model: string;
  messages: LlmMessage[];
  max_tokens?: number;
  temperature?: number;
}

/**
 * Secure API Service Class
 */
export class SecureApiService {
  /**
   * Store a secret securely in the backend
   */
  static async storeSecret(name: string, value: string): Promise<string> {
    try {
      return await invoke('store_secret', { name, value });
    } catch (error) {
      console.error('Failed to store secret:', error);
      throw new Error(`Failed to store secret: ${error}`);
    }
  }

  /**
   * Retrieve a secret securely from the backend
   */
  static async getSecret(name: string): Promise<string> {
    try {
      return await invoke('get_secret', { name });
    } catch (error) {
      console.error('Failed to get secret:', error);
      throw new Error(`Failed to get secret: ${error}`);
    }
  }

  /**
   * Check if a secret exists
   */
  static async hasSecret(name: string): Promise<boolean> {
    try {
      return await invoke('has_secret', { name });
    } catch (error) {
      console.error('Failed to check secret:', error);
      return false;
    }
  }

  /**
   * List all secret names (without values)
   */
  static async listSecrets(): Promise<string[]> {
    try {
      return await invoke('list_secrets');
    } catch (error) {
      console.error('Failed to list secrets:', error);
      return [];
    }
  }

  /**
   * Remove a secret
   */
  static async removeSecret(name: string): Promise<string> {
    try {
      return await invoke('remove_secret', { name });
    } catch (error) {
      console.error('Failed to remove secret:', error);
      throw new Error(`Failed to remove secret: ${error}`);
    }
  }

  /**
   * Call LLM API securely through backend
   */
  static async callLlm(request: LlmRequest): Promise<LlmResponse> {
    try {
      const response = await invoke('call_llm', {
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
      });
      return response as LlmResponse;
    } catch (error) {
      console.error('Failed to call LLM:', error);
      throw new Error(`Failed to call LLM: ${error}`);
    }
  }

  /**
   * Initialize API keys from environment variables (for development)
   * This should only be called during development setup
   */
  static async initializeApiKeys(): Promise<void> {
    try {
      // Check if we're in development mode
      if (import.meta.env.DEV) {
        // Store Anthropic API key if available
        const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
        if (anthropicKey && !(await this.hasSecret('anthropic_api_key'))) {
          await this.storeSecret('anthropic_api_key', anthropicKey);}

        // Store OpenAI API key if available
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (openaiKey && !(await this.hasSecret('openai_api_key'))) {
          await this.storeSecret('openai_api_key', openaiKey);}
      }
    } catch (error) {
      console.warn('[WARNING] Failed to initialize API keys:', error);
    }
  }

  /**
   * Test API connectivity
   */
  static async testApiConnectivity(): Promise<{ anthropic: boolean; openai: boolean }> {
    const results = { anthropic: false, openai: false };

    try {
      // Test Anthropic API
      if (await this.hasSecret('anthropic_api_key')) {
        try {
          await this.callLlm({
            model: 'claude-3-5-haiku-20241022',
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 10,
          });
          results.anthropic = true;
        } catch (error) {
          console.warn('Anthropic API test failed:', error);
        }
      }

      // Test OpenAI API
      if (await this.hasSecret('openai_api_key')) {
        try {
          await this.callLlm({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 10,
          });
          results.openai = true;
        } catch (error) {
          console.warn('OpenAI API test failed:', error);
        }
      }
    } catch (error) {
      console.error('API connectivity test failed:', error);
    }

    return results;
  }
}

// Export default instance for convenience
export const secureApi = SecureApiService;
