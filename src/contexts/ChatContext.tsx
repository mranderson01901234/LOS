import React, { createContext, useContext, ReactNode } from 'react';
import { useSimpleChat } from '../hooks/useSimpleChat';
import type { Message, Conversation } from '../types/database';

// Define the context type
interface ChatContextType {
  currentConvId: string | null;
  messages: Message[];
  conversations: Conversation[];
  isLoading: boolean;
  isSending: boolean;
  isGenerating: boolean;
  ollamaAvailable: boolean;
  checkOllamaStatus: () => Promise<boolean>;
  loadConversations: () => Promise<Conversation[]>;
  selectConversation: (convId: string) => Promise<void>;
  newConversation: () => Promise<string | undefined>;
  sendMessage: (content: string) => Promise<void>;
  addAssistantMessage: (content: string, sources?: string[]) => Promise<void>;
  // Growth system
  levelUpData: {
    oldLevel: number;
    newLevel: number;
    stage: any;
  } | null;
  milestoneNotifications: Array<{
    id: string;
    milestone: any;
  }>;
  dismissLevelUp: () => void;
  dismissMilestoneNotification: (id: string) => void;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const chatState = useSimpleChat();
  
  return (
    <ChatContext.Provider value={chatState}>
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use the chat context
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

