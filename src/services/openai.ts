import { getSetting } from './db';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Check if OpenAI API key is configured
export async function isOpenAIConfigured(): Promise<boolean> {
  const apiKey = await getSetting('openai_api_key');
  return !!apiKey;
}

// Get OpenAI API key from settings
export async function getOpenAIKey(): Promise<string | null> {
  return await getSetting('openai_api_key');
}

// Chat completion using OpenAI API with function calling support
export async function openAIChatCompletion(
  messages: OpenAIMessage[],
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  tools?: any[],
  onToolCall?: (toolCalls: any[]) => Promise<any[]>
): Promise<void> {
  try {
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }// Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {controller.abort();
    }, 60000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using the more cost-effective model
        messages,
        tools: tools || undefined,
        tool_choice: tools ? "auto" : undefined,
        stream: true,
        temperature: 0.8,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let toolCalls: any[] = [];
    let assistantMessage = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {// Handle tool calls if any
            if (toolCalls.length > 0 && onToolCall) {try {
                const toolResults = await onToolCall(toolCalls);
                
                // Send tool results back to AI for final response
                const followUpMessages = [
                  ...messages,
                  {
                    role: 'assistant' as const,
                    content: assistantMessage,
                    tool_calls: toolCalls
                  },
                  ...toolResults
                ];
                
                // Make follow-up request for final response
                const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: followUpMessages,
                    tools: tools || undefined,
                    tool_choice: tools ? "auto" : undefined,
                    stream: true,
                    temperature: 0.8,
                    max_tokens: 1000,
                  }),
                });
                
                if (followUpResponse.ok) {
                  const followUpReader = followUpResponse.body?.getReader();
                  if (followUpReader) {
                    let followUpBuffer = '';
                    const followUpDecoder = new TextDecoder();
                    
                    while (true) {
                      const { done, value } = await followUpReader.read();
                      if (done) break;
                      
                      followUpBuffer += followUpDecoder.decode(value, { stream: true });
                      const followUpLines = followUpBuffer.split('\n');
                      followUpBuffer = followUpLines.pop() || '';
                      
                      for (const followUpLine of followUpLines) {
                        if (followUpLine.trim() && followUpLine.startsWith('data: ')) {
                          const followUpData = followUpLine.slice(6);
                          if (followUpData === '[DONE]') {
                            onComplete();
                            return;
                          }
                          
                          try {
                            const followUpJson = JSON.parse(followUpData);
                            const followUpContent = followUpJson.choices?.[0]?.delta?.content;
                            if (followUpContent) {
                              onChunk(followUpContent);
                            }
                          } catch (e) {
                            console.error('Failed to parse follow-up chunk:', e);
                          }
                        }
                      }
                    }
                  }
                } else {
                  console.error('[ERROR] Follow-up request failed:', followUpResponse.status);
                  const errorData = await followUpResponse.json().catch(() => ({}));
                  console.error('Error details:', errorData);
                  onError(new Error(`Follow-up request failed: ${followUpResponse.status}`));
                  return;
                }
              } catch (toolError) {
                console.error('Tool execution error:', toolError);
                onError(toolError as Error);
                return;
              }
            } else {
              onComplete();
            }
            return;
          }

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            
            // Handle content
            if (delta?.content) {
              chunkCount++;
              assistantMessage += delta.content;
onChunk(delta.content);
            }
            
            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const existingIndex = toolCalls.findIndex(tc => tc.id === toolCall.id);
                if (existingIndex >= 0) {
                  // Update existing tool call
                  const existing = toolCalls[existingIndex];
                  toolCalls[existingIndex] = {
                    id: toolCall.id || existing.id,
                    type: toolCall.type || existing.type || 'function',
                    function: {
                      name: toolCall.function?.name || existing.function?.name || '',
                      arguments: (existing.function?.arguments || '') + (toolCall.function?.arguments || '')
                    }
                  };
                } else {
                  // Add new tool call
                  toolCalls.push({
                    id: toolCall.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: toolCall.type || 'function',
                    function: {
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || ''
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.error('Failed to parse OpenAI chunk:', e, 'Line:', line);
          }
        }
      }
    }onComplete();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      onError(new Error('OpenAI request timed out after 60 seconds'));
    } else {
      onError(error as Error);
    }
  }
}

// Convert Ollama messages to OpenAI format
export function convertToOpenAIMessages(ollamaMessages: Array<{role: string, content: string, tool_calls?: any, tool_call_id?: string}>): OpenAIMessage[] {
  return ollamaMessages.map(msg => ({
    role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
    content: msg.content,
    tool_calls: msg.tool_calls,
    tool_call_id: msg.tool_call_id
  }));
}
