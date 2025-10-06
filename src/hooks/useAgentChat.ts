import { useState, useCallback } from 'react';
import { secureClaudeAgent } from '../services/agent/secureAgent';
import { Message } from '../types/database';
import { ExecutionStep } from '../services/agent/types';
import { 
  getConversation, 
  saveMessage, 
  createConversation, 
  updateConversation,
  getMessagesByConversation 
} from '../services/db';
import { v4 as uuidv4 } from 'uuid';
import { PreRouter } from '../services/agent/preRouter';

export function useAgentChat(initialConversationId?: string) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [currentStep, setCurrentStep] = useState<ExecutionStep | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionStep[]>([]);

  const agent = secureClaudeAgent;
  const preRouter = new PreRouter();

  const loadConversation = useCallback(async (id: string) => {
    const conversation = await getConversation(id);
    if (conversation) {
      const msgs = await getMessagesByConversation(id);
      setMessages(msgs);
      setConversationId(id);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    // Create conversation if doesn't exist
    let convId = conversationId;
    if (!convId) {
      const newConv = await createConversation();
      convId = newConv.id;
      setConversationId(convId);
    }

    const userMessage: Message = {
      id: uuidv4(),
      conversation_id: convId,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsThinking(true);
    setExecutionHistory([]);

    // Save user message
    await saveMessage(userMessage);

    try {
      // === PRE-ROUTE CHECK ===
      const preRouteResult = await preRouter.checkTrivial(content);
      
      if (!preRouteResult.shouldRoute) {
        // Handle trivially without any API call
        const quickResponse: Message = {
          id: uuidv4(),
          conversation_id: convId,
          role: 'assistant',
          content: preRouteResult.response!,
          timestamp: new Date().toISOString(),
          metadata: {
            routing: 'pre-routed',
            reason: preRouteResult.reason,
            estimated_cost: 0 // FREE!
          }
        };
        
        const finalMessages = [...newMessages, quickResponse];
        setMessages(finalMessages);
        
        // Save assistant message
        await saveMessage(quickResponse);
        
        // Update conversation
        await updateConversation(convId, {
          message_count: finalMessages.length
        });
        
        return;
      }

      // === ROUTE TO AGENT (existing code) ===
      setExecutionHistory([]);
      
      const execution = await agent.execute(
        content,
        newMessages.map(m => ({ role: m.role, content: m.content })),
        (step) => {
          setCurrentStep(step);
          setExecutionHistory(prev => [...prev, step]);
        }
      );

      const assistantMessage: Message = {
        id: uuidv4(),
        conversation_id: convId,
        role: 'assistant',
        content: execution.result,
        timestamp: new Date().toISOString(),
        metadata: {
          execution_steps: execution.steps.length,
          tools_used: execution.steps
            .filter(s => s.action)
            .map(s => s.action!.tool),
          model_used: execution.metadata?.model_used,
          estimated_cost: execution.metadata?.estimated_cost
        }
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      // Save assistant message
      await saveMessage(assistantMessage);

      // Update conversation
      await updateConversation(convId, {
        message_count: finalMessages.length
      });

    } catch (error: any) {
      console.error('Agent error:', error);
      
      const errorMessage: Message = {
        id: uuidv4(),
        conversation_id: convId,
        role: 'assistant',
        content: `I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      await saveMessage(errorMessage);
    } finally {
      setIsThinking(false);
      setCurrentStep(null);
    }
  }, [messages, conversationId]);

  return {
    messages,
    sendMessage,
    isThinking,
    currentStep,
    executionHistory,
    loadConversation,
    conversationId
  };
}

