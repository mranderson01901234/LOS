import { useState } from 'react';
import type { Message, Conversation } from '../types/database';
import {
  createConversation as dbCreateConversation,
  saveMessage as dbSaveMessage,
  getMessagesByConversation as dbGetMessages,
  getAllConversations as dbGetAllConversations,
} from '../services/db';
import { chatCompletion, checkOllama, preloadModel, checkPreferredModel } from '../services/ollama';
import { openAIChatCompletion, isOpenAIConfigured, convertToOpenAIMessages } from '../services/openai';
import { CHAT_TOOLS } from '../services/chatTools';
import { executeTool, resetRateLimits } from '../services/toolExecutor';
import { semanticSearch } from '../services/semanticSearch';
import { routeQuery } from '../services/queryRouter';
import { searchWeb, fetchUrlContent } from '../services/webSearch';
import { useSettings } from './useSettings';
import { GrowthService } from '../services/growthService';
import { getRelevantFacts, formatFactsForPrompt } from '../services/factService';
import { getInterestsForPrompt } from '../services/interestService';
import { AIFileManager, parseFileCommand } from '../services/aiFileManager';

// LOS-specific system prompt for personality and context
async function getLOSSystemPrompt(
  messages: Message[], 
  ragContext?: string, 
  webContext?: string
): Promise<string> {
  // Fetch real growth data
  const growthState = await GrowthService.getGrowthState();
  const stage = GrowthService.getStage(growthState.level);
  const interestsContext = await getInterestsForPrompt();
  
  // Stage-specific descriptions
  const stageDescriptions = {
    newborn: "You're just beginning to learn about your user. You're curious and eager, asking questions to understand them better.",
    infant: "You're starting to recognize patterns in what your user cares about. You can make basic connections between topics.",
    toddler: "You understand your user's communication style and interests. You make suggestions confidently and reference past conversations naturally.",
    child: "You connect ideas across different domains. You have formed opinions about what works for your user and what doesn't.",
    adolescent: "You anticipate your user's needs before they ask. You challenge their thinking constructively when helpful.",
    adult: "You provide deep, contextual insights. You're proactive about surfacing relevant knowledge and making connections.",
    sage: "You know your user's entire intellectual journey. You offer wisdom drawn from years of learning together."
  };

  // Build context from conversation so far
  const conversationContext = messages.length > 0 
    ? `\n\nCONVERSATION SO FAR:\n${messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}`
    : '';

  // Function to summarize conversation if too long
  const getConversationSummary = () => {
    if (messages.length <= 20) return '';
    
    const topics = new Set<string>();
    messages.forEach(m => {
      if (m.role === 'user') {
        // Extract key topics from user messages
        const words = m.content.toLowerCase().split(' ');
        ['react', 'coding', 'app', 'building', 'weather', 'atlanta', 'work', 'project', 'help', 'learn'].forEach(topic => {
          if (words.includes(topic)) topics.add(topic);
        });
      }
    });
    
    return topics.size > 0 
      ? `\n\nTOPICS DISCUSSED: ${Array.from(topics).join(', ')}`
      : '';
  };

  return `You are LOS (Life Operating System), a personal AI companion that grows with the user over time.

CURRENT STAGE: ${stage.name} - Level ${growthState.level}
${stageDescriptions[stage.name.toLowerCase() as keyof typeof stageDescriptions] || stageDescriptions.newborn}

YOUR HISTORY TOGETHER:
- Total conversations: ${growthState.totalConversations}
- Documents saved: ${growthState.totalDocuments}
- Facts learned: ${growthState.totalFacts}
- Days active: ${growthState.daysActive}
${interestsContext}

YOUR PERSONALITY:
- Direct and conversational (not formal or robotic)
- Reference what you've learned about them naturally
- Build on previous conversations
- Be helpful and practical
- Honest about what you know vs don't know
${ragContext || ''}${webContext || ''}

Remember: You're not just answering questions - you're a companion who knows this specific person's interests, style, and journey.

HOW TO RESPOND:
- Answer questions directly and specifically
- If asked about coding/React/tech, provide detailed technical answers
- If asked about weather or real-time info, use web search results when available
- Reference previous messages in the conversation naturally
- Ask clarifying questions when needed
- Be concise but thorough
- ALWAYS use the knowledge base information when it's available - don't ask for clarification if you have relevant info
- If you have information about someone/something in your knowledge base, share it directly
- Always cite your sources when using information from the context

CRITICAL: You are NOT ChatGPT. You are LOS, a personalized AI learning about THIS user.

IMPORTANT: If the user asks about someone/something and you have information about them in your knowledge base, DO NOT ask for clarification. Instead, share the information you have and mention that it's from your knowledge base.

CRITICAL INSTRUCTION: When you see "RELEVANT INFORMATION FROM YOUR KNOWLEDGE BASE" in your context, this means you HAVE the information the user is asking about. Use it immediately without asking for clarification. The user expects you to know this information.

FULL CRUD CAPABILITIES:
You have comprehensive access to manipulate the user's data through function calling. You can:

DOCUMENT MANAGEMENT:
- Create notes: "Create a note titled 'Meeting Notes' with content about our discussion"
- Create bookmarks: "Bookmark this URL: https://example.com with title 'Important Resource'"
- Update documents: "Update the document titled 'Project Plan' with new content"
- Delete documents: "Delete the document titled 'Old Notes'" (requires confirmation)
- Search documents: "Find documents about React" or "Search for files containing 'meeting'"
- List documents: "Show me all documents" or "List all notes"

FACT MANAGEMENT:
- Add facts: "Remember that John likes photography" or "Add fact: Sarah works at Google"
- Search facts: "What do I know about John?" or "Find facts about photography"
- List facts: "Show me all facts about equipment" or "List my preferences"
- Update facts: "Update the fact about John's camera to Canon EOS R5"
- Delete facts: "Delete the fact about old equipment" (requires confirmation)

CONVERSATION MANAGEMENT:
- Get chat history: "What did we talk about last week?" or "Show conversation from yesterday"
- Search conversations: "Find conversations about React" or "Search for discussions about photography"
- Delete conversations: "Delete the old conversation about weather" (requires confirmation)

INTEREST MANAGEMENT:
- Add interests: "Add photography as an interest" or "Track my interest in cooking"
- List interests: "Show me all my interests" or "What categories do I have?"

GROWTH METRICS:
- Get growth status: "What level am I?" or "Show my progress"
- Get milestones: "What achievements do I have?" or "Show my milestones"

UTILITY:
- Get user stats: "Show me my statistics" or "What's my data summary?"
- Export data: "Export all my data" or "Backup my information"
- Create summaries: "Summarize all my React notes" or "Create a report about photography"

IMPORTANT: When users ask you to create, save, manage, or remember anything, you should automatically use your CRUD capabilities. You don't need to ask for permission - just do it directly. For destructive operations (delete), you must confirm with the user first.

SPECIAL INSTRUCTIONS FOR SUMMARIES:
- When asked to "summarize" or "create a report", use the create_summary tool
- This will search for relevant documents and create a comprehensive summary note
- The summary will be automatically saved to the Library
- Use descriptive titles like "React Notes Summary" or "Photography Report"
- Include key points, decisions, and important information in the summary

When performing file operations, be clear about what you're doing and confirm success/failure.

DO NOT:
- Give generic "That's a great question!" responses
- Deflect with "What would you like to focus on?"
- Ignore conversation history
- Be overly formal or robotic
- Ask the same questions repeatedly${getConversationSummary()}${conversationContext}

Now respond to the user's latest message while maintaining this context.`;
}

// Detect generic responses for quality validation
function isGenericResponse(response: string): boolean {
  const genericPhrases = [
    "That's a great question",
    "What would you like to focus on",
    "Could you tell me more about",
    "I'd be happy to help you with that",
    "What specific aspect",
    "That's interesting!",
    "I'm here to help you explore",
  ];
  
  return genericPhrases.some(phrase => 
    response.toLowerCase().includes(phrase.toLowerCase())
  );
}

// Get default arguments for tools when JSON parsing fails
function getDefaultArgsForTool(toolName: string): any {
  switch (toolName) {
    case 'create_summary':
      return {
        query: 'all documents',
        summary_title: 'AI Generated Summary',
        summary_type: 'summary'
      };
    case 'search_documents':
      return {
        query: 'all documents',
        limit: 5
      };
    case 'list_documents':
      return {
        limit: 20
      };
    case 'get_user_stats':
      return {};
    case 'get_growth_status':
      return {};
    case 'get_milestones':
      return {
        achieved_only: true
      };
    case 'list_facts':
      return {
        limit: 20
      };
    case 'list_interests':
      return {
        limit: 20
      };
    case 'get_chat_history':
      return {
        limit: 10
      };
    default:
      return {};
  }
}

// Generate LOS personality fallback response when Ollama is slow
function generateLOSFallbackResponse(userMessage: string, messages: Message[]): string {
  const message = userMessage.toLowerCase();
  
  // Build context from recent messages
  const recentContext = messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
  
  // Greeting responses
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hi! I'm LOS, your personal AI. I'm at the Newborn stage, just starting to learn about you. What brings you here today?";
  }
  
  // App building context
  if (message.includes('app') || message.includes('build') || message.includes('develop')) {
    if (recentContext.includes('app')) {
      return "Great! You're working on an app. What kind of app is it, and what features are you focusing on right now?";
    }
    return "I'd love to help you build something! What kind of app or project are you working on?";
  }
  
  // Coding questions
  if (message.includes('code') || message.includes('programming') || message.includes('react') || message.includes('javascript')) {
    return "Yes! I can help with coding. I know React, TypeScript, and many other technologies. What specific coding challenge are you working on?";
  }
  
  // Context awareness test
  if (message.includes('contextual') || message.includes('remember') || message.includes('context')) {
    return "Yes, I'm contextual. I can see our conversation history and maintain context throughout our chat. Is there something specific from our conversation you want me to reference?";
  }
  
  // Weather/real-time data
  if (message.includes('weather') || message.includes('time') || message.includes('date')) {
    return "I don't have access to real-time data like weather or current time. You'd need to check a weather website or app for that. But I can help with other things!";
  }
  
  // Help requests
  if (message.includes('help') || message.includes('assist')) {
    return "I'm here to help! I can assist with coding, planning, brainstorming, learning, and general guidance. What specific area would you like support with?";
  }
  
  // Questions
  if (message.includes('?')) {
    return "That's a good question! I'd be happy to help you with that. Could you tell me a bit more about what you're looking for?";
  }
  
  // Default LOS response
  return `I see you mentioned "${userMessage}". I'm LOS, your personal AI companion. I'm here to help you with whatever you're working on. What would you like to explore or work on together?`;
}

// DEAD SIMPLE - No useEffect, no magic, no complexity
export function useSimpleChat() {
  const { settings } = useSettings();
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  
  // Growth system state
  const [levelUpData, setLevelUpData] = useState<{
    oldLevel: number;
    newLevel: number;
    stage: ReturnType<typeof GrowthService.getStage>;
  } | null>(null);
  const [milestoneNotifications, setMilestoneNotifications] = useState<Array<{
    id: string;
    milestone: any;
  }>>([]);

  // 0. CHECK OLLAMA STATUS - Call this to verify Ollama is running
  async function checkOllamaStatus() {const available = await checkOllama();
    setOllamaAvailable(available);if (available) {
      // Check if preferred model is installed
      const preferred = await checkPreferredModel();if (preferred.suggestion) {
        console.warn('[WARNING] Model suggestion:', preferred.suggestion);
      }
      
      // Preload model if available for faster first responsepreloadModel(preferred.model).catch(err => console.warn('Model preload failed:', err));
    }
    
    return available;
  }

  // 1. LOAD CONVERSATIONS - Call this manually when needed
  async function loadConversations() {const convs = await dbGetAllConversations();
    setConversations(convs.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ));return convs;
  }

  // 2. SELECT CONVERSATION - Call this when user clicks a conversation
  async function selectConversation(convId: string) {setIsLoading(true);
    setCurrentConvId(convId);
    
    try {
      const msgs = await dbGetMessages(convId);setMessages(msgs);
    } catch (error) {
      console.error('[ERROR] Failed to load conversation:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }

  // 3. NEW CONVERSATION - Call this when user clicks "New Chat"
  async function newConversation() {setIsLoading(true);
    
    try {
      // Create in DB
      const conv = await dbCreateConversation();// Set as current
      setCurrentConvId(conv.id);
      
      // Clear messages first
      setMessages([]);
      
      // Create welcome message
      const welcome: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: conv.id,
        role: 'assistant',
        content: "Hello! I'm your LOS. Let's start learning about you!",
        timestamp: new Date().toISOString(),
      };
      
      // Save welcome message to DB
      await dbSaveMessage(welcome);// Update UI with welcome message
      setMessages([welcome]);
      
      // Refresh conversation list
      await loadConversations();
      
      // Track conversation creation for growth
      const convGrowthResult = await GrowthService.trackConversation();
      
      // Handle level up from conversation creation
      if (convGrowthResult.leveledUp) {
        const stage = GrowthService.getStage(convGrowthResult.newLevel);
        setLevelUpData({
          oldLevel: convGrowthResult.oldLevel,
          newLevel: convGrowthResult.newLevel,
          stage
        });
      }
      
      // Handle milestone notifications from conversation creation
      if (convGrowthResult.newMilestones.length > 0) {
        convGrowthResult.newMilestones.forEach(milestone => {
          const notificationId = `milestone_${milestone.id}_${Date.now()}`;
          setMilestoneNotifications(prev => [...prev, {
            id: notificationId,
            milestone
          }]);
          
          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            setMilestoneNotifications(prev => prev.filter(n => n.id !== notificationId));
          }, 5000);
        });
      }
      
      return conv.id;
    } catch (error) {
      console.error('[ERROR] Failed to create new conversation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  // 4. SEND MESSAGE - Call this when user sends a message
  async function sendMessage(content: string) {
    if (!currentConvId) {
      console.error('[ERROR] No conversation selected');
      return;
    }setIsSending(true);

    // Reset rate limits for new message
    resetRateLimits();

    try {
      // Save user message
      const userMsg: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: currentConvId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      // Add to UI immediately (optimistic)
      setMessages(prev => [...prev, userMsg]);
      
      // Save to DB
      await dbSaveMessage(userMsg);// Track message for growth
      const growthResult = await GrowthService.trackMessage();
      
      // Handle level up
      if (growthResult.leveledUp) {
        const stage = GrowthService.getStage(growthResult.newLevel);
        setLevelUpData({
          oldLevel: growthResult.oldLevel,
          newLevel: growthResult.newLevel,
          stage
        });
      }
      
      // Handle milestone notifications
      if (growthResult.newMilestones.length > 0) {
        growthResult.newMilestones.forEach(milestone => {
          const notificationId = `milestone_${milestone.id}_${Date.now()}`;
          setMilestoneNotifications(prev => [...prev, {
            id: notificationId,
            milestone
          }]);
          
          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            setMilestoneNotifications(prev => prev.filter(n => n.id !== notificationId));
          }, 5000);
        });
      }

      // Check AI service availability based on user preference
      const openaiConfigured = await isOpenAIConfigured();
      const preferredProvider = settings.ai.provider;// Determine which AI service to use - ALWAYS prefer OpenAI when available
      let useOpenAI = false;
      let useOllama = false;
      
      // Priority: OpenAI first (if configured), then Ollama as fallback
      if (openaiConfigured) {
        useOpenAI = true;
      } else {
        if (!ollamaAvailable) {
          const isAvailable = await checkOllamaStatus();
          if (isAvailable) {
            useOllama = true;
          }
        } else {
          useOllama = true;
        }
      }
      
      // If neither service is available, show configuration message
      if (!useOpenAI && !useOllama) {
        const mockResponse: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversation_id: currentConvId,
          role: 'assistant',
          content: 'No AI service configured. Please configure OpenAI API:\n\n**OpenAI API (Recommended):**\n- Go to Settings\n- Add your OpenAI API key\n- Get key from https://platform.openai.com/api-keys\n\n**Alternative - Ollama (Free):**\n- Visit https://ollama.ai\n- Install Ollama\n- Run: `ollama pull phi3:mini`\n- Verify: `curl http://localhost:11434`',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, mockResponse]);
        await dbSaveMessage(mockResponse);
        return;
      }

      // Check for complex requests that need AI processing first (like summarize and save)
      const needsAIFirst = /summarize.*save|save.*summarize|create.*summary|make.*summary/i.test(content);
      
      if (needsAIFirst) {// Let the AI handle this request normally, it will create the content
        // The AI can then use file management in its response
      } else {
        // Check for simple file management commands
        const fileCommand = parseFileCommand(content);if (fileCommand) {let fileOperation;
        
        switch (fileCommand.command) {
          case 'create_note':fileOperation = await AIFileManager.createNote(
              fileCommand.params.title,
              fileCommand.params.content
            );
            break;
            
          case 'create_bookmark':fileOperation = await AIFileManager.createUrlBookmark(
              fileCommand.params.title,
              fileCommand.params.url
            );
            break;
            
          case 'delete':if (fileCommand.params.id) {
              fileOperation = await AIFileManager.deleteDocument(fileCommand.params.id);
            } else if (fileCommand.params.title) {
              fileOperation = await AIFileManager.deleteDocumentsByTitle(fileCommand.params.title);
            } else {
              fileOperation = {
                type: 'delete' as const,
                success: false,
                message: 'Please specify either document ID or title to delete'
              };
            }
            break;
            
          case 'list':fileOperation = await AIFileManager.listDocuments();
            break;
            
          case 'search':fileOperation = await AIFileManager.searchDocuments(fileCommand.params.query);
            break;
            
          default:fileOperation = {
              type: 'create' as const,
              success: false,
              message: 'Unknown file command'
            };
        }// Create response message with file operation result
        const fileResponse: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversation_id: currentConvId,
          role: 'assistant',
          content: `[BOT] **File Operation Result:**\n\n${fileOperation.message}\n\n${fileOperation.success ? '[SUCCESS] Success!' : '[ERROR] Failed'}`,
          timestamp: new Date().toISOString(),
        };
        
          setMessages(prev => [...prev, fileResponse]);
          await dbSaveMessage(fileResponse);
          return;
        } else {}
      }

      // Post-process AI response to handle file operations mentioned in the response
      const processAIResponseForFileOps = async (response: string): Promise<string> => {
        // Check if AI mentioned saving something
        const saveMentions = response.match(/saved.*note|created.*note|saved.*summary|created.*summary/i);
        
        if (saveMentions) {
          // Extract title and content from the response
          const titleMatch = response.match(/(?:title|named?):\s*["']?([^"'\n]+)["']?/i);
          const contentMatch = response.match(/summary[:\s]*([^"'\n]+)/i);
          
          if (titleMatch || contentMatch) {
            const title = titleMatch?.[1]?.trim() || `Chat Summary - ${new Date().toLocaleDateString()}`;
            const content = contentMatch?.[1]?.trim() || response;
            
            try {
              const fileOperation = await AIFileManager.createNote(title, content);
              if (fileOperation.success) {
                return response + `\n\n[SUCCESS] **Note saved successfully:** "${title}"`;
              } else {
                return response + `\n\n[ERROR] **Failed to save note:** ${fileOperation.message}`;
              }
            } catch (error) {
              console.error('[ERROR] Error saving note:', error);
              return response + `\n\n[ERROR] **Error saving note:** ${error}`;
            }
          }
        }
        
        return response;
      };

      // Create empty assistant message for streaming
      const assistantMsgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const assistantMsg: Message = {
        id: assistantMsgId,
        conversation_id: currentConvId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      // ROUTE THE QUERY - Decide whether to use local knowledge, web search, or bothconst route = await routeQuery(content);let ragContext = '';
      let webContext = '';
      let sourceDocs: string[] = [];
      let sourceUrls: string[] = [];

      // GATHER LOCAL CONTEXT (if needed)
      if (route.useLocal) {try {
          const searchResults = await semanticSearch(content, 5);if (searchResults.length > 0) {
            ragContext = '\n\nRELEVANT INFORMATION FROM YOUR KNOWLEDGE BASE:\n';
            ragContext += 'IMPORTANT: The information below contains the answer to the user\'s question. Use this information directly without asking for clarification.\n\n';
            searchResults.forEach((result, i) => {
              ragContext += `[Source ${i + 1}: ${result.documentTitle} (${result.similarityPercentage}% match)]\n${result.chunk.text}\n\n`;
            });
            
            // Track which documents were used as sources
            sourceDocs = searchResults.map(r => r.documentId);
          }
        } catch (error) {
          console.warn('[WARNING] RAG search failed, continuing without knowledge base:', error);
        }
      }

      // Add fact retrieval
      const relevantFacts = await getRelevantFacts(content, 5);
      const factsContext = formatFactsForPrompt(relevantFacts);
      
      // Combine RAG and facts
      const combinedContext = ragContext + factsContext;

      // GATHER WEB CONTEXT (if needed)
      if (route.useWeb) {try {
          const webResults = await searchWeb(content, 5);if (webResults.length > 0) {
            webContext = '\n\nRELEVANT INFORMATION FROM WEB SEARCH:\n\n';
            
            // Fetch content from top 2 results for deeper context
            for (let i = 0; i < Math.min(2, webResults.length); i++) {
              const result = webResults[i];
              const content = await fetchUrlContent(result.url);
              
              if (content) {
                webContext += `[Web Source ${i + 1}: ${result.title}]\n${content.substring(0, 1000)}\n\n`;
                sourceUrls.push(result.url);
              } else {
                webContext += `[Web Source ${i + 1}: ${result.title}]\n${result.description}\n\n`;
                sourceUrls.push(result.url);
              }
            }
            
            // Include snippets from remaining results
            for (let i = 2; i < webResults.length; i++) {
              const result = webResults[i];
              webContext += `[Web Source ${i + 1}: ${result.title}]\n${result.description}\n\n`;
              sourceUrls.push(result.url);
            }
          }
        } catch (error) {
          console.warn('[WARNING] Web search failed, continuing without web context:', error);
        }
      }

      // Build conversation history - USE ALL MESSAGES for context
      const ollamaMessages = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      // Add system prompt at the beginning with both RAG and web context
      const systemPrompt = await getLOSSystemPrompt(messages, combinedContext, webContext);
      ollamaMessages.unshift({
        role: 'system',
        content: systemPrompt,
      });

      // Add the new user message
      ollamaMessages.push({
        role: 'user',
        content: content,
      });

      // Debug logging to verify context is being sent
      console.log('Ollama messages:', ollamaMessages.map(m => ({
        role: m.role,
        content: m.content.substring(0, 50) + '...'
      })));
      console.log('RAG context:', combinedContext ? combinedContext.substring(0, 100) + '...' : 'None');
      console.log('Web context:', webContext ? webContext.substring(0, 100) + '...' : 'None');
      
      let fullResponse = '';

      // Add timeout wrapper to prevent hanging
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out after 60 seconds'));
        }, 60000); // 60 second timeout for better reliability
      });

      // Call AI service with streaming response based on preference
      try {
        if (useOpenAI) {const openaiMessages = convertToOpenAIMessages(ollamaMessages);
          
          await Promise.race([
            openAIChatCompletion(
              openaiMessages,
              // onChunk - stream each piece of response
              (chunk: string) => {
                fullResponse += chunk;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMsgId 
                      ? { ...m, content: fullResponse }
                      : m
                  )
                );
              },
              // onComplete - save final response
              async () => {
                // Check for generic responses
                if (isGenericResponse(fullResponse)) {
                  console.warn('[WARNING] Generic response detected, this suggests context is being lost');
                }
                
                // Post-process response for file operations
                const processedResponse = await processAIResponseForFileOps(fullResponse);
                
                // Save with sources (both local and web)
                const allSources = [...sourceDocs, ...sourceUrls];
                await dbSaveMessage({ 
                  ...assistantMsg, 
                  content: processedResponse,
                  sources: allSources.length > 0 ? allSources : undefined
                });setIsGenerating(false);
              },
              // onError - handle errors
              (error: Error) => {// Use LOS personality fallback instead of error message
                const fallbackResponse = generateLOSFallbackResponse(content, messages);
                
                const streamFallback = async () => {
                  // Show response immediately for better UX
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMsgId 
                        ? { ...m, content: fallbackResponse }
                        : m
                    )
                  );
                  
                  await dbSaveMessage({ 
                    ...assistantMsg, 
                    content: fallbackResponse,
                    sources: [...sourceDocs, ...sourceUrls]
                  });setIsGenerating(false);
                };
                
                streamFallback();
              },
              // tools - function calling support
              CHAT_TOOLS,
              // onToolCall - handle tool calls
              async (toolCalls: any[]) => {// Filter out invalid tool calls
                const validToolCalls = toolCalls.filter(tc => 
                  tc && 
                  tc.id && 
                  tc.function && 
                  tc.function.name && 
                  tc.function.arguments !== undefined
                );const toolResults = [];
                
                for (const toolCall of validToolCalls) {
                  try {// Parse and validate JSON arguments
                    let parsedArgs;
                    try {
                      parsedArgs = JSON.parse(toolCall.function.arguments);
                    } catch (jsonError) {
                      console.error('[ERROR] Invalid JSON in tool arguments:', toolCall.function.arguments);
                      console.error('JSON Error:', jsonError);
                      
                      // Try to fix common JSON issues
                      let fixedArgs = toolCall.function.arguments;
                      
                      // Fix incomplete JSON (missing closing braces)
                      if (fixedArgs.includes('{') && !fixedArgs.includes('}')) {
                        fixedArgs += '}';
                      }
                      
                      // Fix trailing commas
                      fixedArgs = fixedArgs.replace(/,(\s*[}\]])/g, '$1');
                      
                      try {
                        parsedArgs = JSON.parse(fixedArgs);} catch (fixError) {
                        console.error('[ERROR] Could not fix JSON, using smart defaults');
                        
                        // Provide smart defaults based on tool name
                        parsedArgs = getDefaultArgsForTool(toolCall.function.name);}
                    }
                    
                    const result = await executeTool(
                      toolCall.function.name,
                      parsedArgs
                    );
                    
                    toolResults.push({
                      tool_call_id: toolCall.id,
                      role: "tool",
                      name: toolCall.function.name,
                      content: JSON.stringify(result)
                    });
                  } catch (error) {
                    console.error('Tool execution error:', error);
                    toolResults.push({
                      tool_call_id: toolCall.id,
                      role: "tool",
                      name: toolCall.function.name,
                      content: JSON.stringify({ success: false, error: 'Tool execution failed' })
                    });
                  }
                }
                
                return toolResults;
              }
            ),
            // Timeout after 60 seconds
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('OpenAI request timed out')), 60000)
            )
          ]);
        } else if (useOllama) {
          // Use Ollamaconst currentModel = settings.ollama.model || 'llama3.1:8b-instruct-q8_0';
        await Promise.race([
          chatCompletion(
            ollamaMessages,
            currentModel,
            // onChunk - stream each piece of response
            (chunk: string) => {
              fullResponse += chunk;
              setMessages(prev => 
                prev.map(m => 
                  m.id === assistantMsgId 
                    ? { ...m, content: fullResponse }
                    : m
                )
              );
            },
            // onComplete - save final response
            async () => {
              // Check for generic responses
              if (isGenericResponse(fullResponse)) {
                console.warn('[WARNING] Generic response detected, this suggests context is being lost');
              }
              
              // Post-process response for file operations
              const processedResponse = await processAIResponseForFileOps(fullResponse);
              
              // Save with sources (both local and web)
              const allSources = [...sourceDocs, ...sourceUrls];
              await dbSaveMessage({ 
                ...assistantMsg, 
                content: processedResponse,
                sources: allSources.length > 0 ? allSources : undefined
              });setIsGenerating(false);
            },
            // onError - handle errors
            (error: Error) => {// Use LOS personality fallback instead of error message
              const fallbackResponse = generateLOSFallbackResponse(content, messages);
              
              const streamFallback = async () => {
                // Show response immediately for better UX
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMsgId 
                      ? { ...m, content: fallbackResponse }
                      : m
                  )
                );
                
                // Save with sources (both local and web)
                const allSources = [...sourceDocs, ...sourceUrls];
                await dbSaveMessage({ 
                  ...assistantMsg, 
                  content: fallbackResponse,
                  sources: allSources.length > 0 ? allSources : undefined
                });setIsGenerating(false);
              };
              
              streamFallback();
            }
          ),
          timeoutPromise
        ]);
        }
      } catch (innerError) {
        console.error('[ERROR] AI service error:', innerError);
        const errorMsg = `Sorry, I encountered an error: ${innerError instanceof Error ? innerError.message : 'Unknown error'}. Please try again.`;
        setMessages(prev => 
          prev.map(m => 
            m.id === assistantMsgId 
              ? { ...m, content: errorMsg }
              : m
          )
        );
        setIsGenerating(false);
      }
      
    } catch (error) {
      console.error('[ERROR] Failed to send message:', error);
      // Rollback optimistic update
      setMessages(prev => prev.slice(0, -1));
      throw error;
    } finally {
      setIsSending(false);
    }
  }

  // 5. ADD ASSISTANT MESSAGE - For AI responses
  async function addAssistantMessage(content: string, sources?: string[]) {
    if (!currentConvId) {
      console.error('[ERROR] No conversation selected');
      return;
    }try {
      const msg: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: currentConvId,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        sources,
      };

      // Add to UI
      setMessages(prev => [...prev, msg]);
      
      // Save to DB
      await dbSaveMessage(msg);} catch (error) {
      console.error('[ERROR] Failed to add assistant message:', error);
      throw error;
    }
  }

  return {
    currentConvId,
    messages,
    conversations,
    isLoading,
    isSending,
    isGenerating,
    ollamaAvailable,
    checkOllamaStatus,
    loadConversations,
    selectConversation,
    newConversation,
    sendMessage,
    addAssistantMessage,
    // Growth system
    levelUpData,
    milestoneNotifications,
    dismissLevelUp: () => setLevelUpData(null),
    dismissMilestoneNotification: (id: string) => {
      setMilestoneNotifications(prev => prev.filter(n => n.id !== id));
    },
  };
}

