import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, Conversation } from '../types/database';
import * as db from '../services/db';

export function useChatHistory() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const initializationRef = useRef(false);
  const isCreatingNewRef = useRef(false);

  // Debug: Log whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      console.log('Messages updated:', messages.length);
    }
  }, [messages]);

  // INITIALIZATION - Call this once on mount from ChatInterface
  const initialize = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    setIsLoading(true);
    try {
      // Get all conversations
      const conversations = await db.getAllConversations();
      if (conversations.length > 0) {
        // Load most recent conversation
        const mostRecent = conversations.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];
        await loadConversation(mostRecent.id);
      } else {
        // Create first conversation
        await createNewConversation();
      }
    } catch (error) {
      console.error('[ERROR] Failed to initialize:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // LOAD CONVERSATION - Direct, explicit loading
  const loadConversation = useCallback(async (convId: string) => {
    // Prevent loading if we're creating a new conversation
    if (isCreatingNewRef.current) {return;
    }setIsLoading(true);
    setConversationId(convId);
    
    try {
      const msgs = await db.getMessagesByConversation(convId);
      setMessages(msgs);} catch (error) {
      console.error('[ERROR] Failed to load conversation:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // CREATE NEW CONVERSATION - Explicit, sequential
  const createNewConversation = useCallback(async () => {// Set flag to prevent loadConversation from interfering
    isCreatingNewRef.current = true;
    setIsLoading(true);
    
    try {
      // 1. IMMEDIATELY clear all messages first
      setMessages([]);// 2. Create conversation in DB
      const newConv = await db.createConversation();// 3. Set conversation ID
      setConversationId(newConv.id);
      
      // 4. Create welcome message
      const welcomeMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: newConv.id,
        role: 'assistant',
        content: "Hello! I'm your LOS (Life Operating System). I'm at the Newborn stage - I don't know much about you yet, but I'm eager to learn. What would you like to talk about?",
        timestamp: new Date().toISOString(),
      };
      
      // 5. Save welcome message to DB
      await db.saveMessage(welcomeMessage);// 6. Update state to show ONLY welcome message
      setMessages([welcomeMessage]);// 7. Update conversation metadata
      await db.updateConversation(newConv.id, {
        updated_at: new Date().toISOString(),
        message_count: 1,
      });} catch (error) {
      console.error('[ERROR] Failed to create conversation:', error);
    } finally {
      setIsLoading(false);
      // Clear the flag after a delay to allow normal operation
      setTimeout(() => {
        isCreatingNewRef.current = false;}, 1000);
    }
  }, [messages.length]);

  // SWITCH CONVERSATION - Direct loading
  const switchConversation = useCallback(async (convId: string) => {
    if (convId === conversationId) {
      return; // Already on this conversation
    }
    await loadConversation(convId);
  }, [conversationId, loadConversation]);

  // SEND MESSAGE - Explicit, sequential
  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) {
      console.error('[ERROR] No active conversation');
      return;
    }
    setIsSending(true);

    try {
      // 1. Create user message
      const userMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: conversationId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      // 2. Update UI immediately (optimistic)
      setMessages(prev => [...prev, userMessage]);

      // 3. Save to database
      await db.saveMessage(userMessage);

      // 4. Update conversation metadata
      await db.updateConversation(conversationId, {
        updated_at: new Date().toISOString(),
        message_count: messages.length + 1,
        title: messages.length === 0 ? content.substring(0, 50) : undefined,
      });
    } catch (error) {
      console.error('[ERROR] Failed to send message:', error);
      // Rollback optimistic update
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  }, [conversationId, messages.length]);

  // ADD ASSISTANT MESSAGE - For AI responses
  const addAssistantMessage = useCallback(async (content: string, sources?: string[]) => {
    if (!conversationId) {
      console.error('[ERROR] No active conversation');
      return;
    }

    try {
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: conversationId,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        sources,
      };

      // Update UI
      setMessages(prev => [...prev, assistantMessage]);

      // Save to DB
      await db.saveMessage(assistantMessage);

      // Update conversation
      await db.updateConversation(conversationId, {
        updated_at: new Date().toISOString(),
        message_count: messages.length + 1,
      });
    } catch (error) {
      console.error('[ERROR] Failed to add assistant message:', error);
    }
  }, [conversationId, messages.length]);

  return {
    conversationId,
    messages,
    isLoading,
    isSending,
    initialize,
    createNewConversation,
    switchConversation,
    sendMessage,
    addAssistantMessage,
  };
}