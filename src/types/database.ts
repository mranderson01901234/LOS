export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO string
  sources?: string[]; // document IDs used for this response
}

export interface Conversation {
  id: string;
  title?: string; // Generated from first message
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Document {
  id: string;
  type: 'url' | 'file' | 'note' | 'conversation';
  title: string;
  content: string;
  url?: string;
  date_added: string;
  interest_category?: string;
  tags?: string[];
  chunks?: DocumentChunk[];
  
  // RAG Processing metadata
  isProcessed?: boolean;
  processedAt?: number;
  chunkCount?: number;
  processingError?: string;
}

export interface DocumentChunk {
  id?: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  text: string;
  embedding: number[]; // vector embedding
  createdAt: number;
}

export interface Fact {
  id: string;
  category: 'equipment' | 'preference' | 'goal' | 'event' | 'skill';
  subject: string;
  fact_text: string;
  context?: string;
  confidence: number; // 0-1
  source_id: string; // conversation or document ID
  date_created: string;
  date_updated: string;
  status: 'active' | 'archived';
  relationships?: FactRelationship[];
}

export interface FactRelationship {
  related_fact_id: string;
  type: 'replaces' | 'relates_to' | 'contradicts';
}

export interface Interest {
  id: string;
  name: string;
  keywords: string[];
  engagement_score: number; // 0-1
  content_count: number;
  first_detected: string;
  last_activity: string;
  expertise_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface GrowthMetrics {
  id: 'current';
  
  // Core progression
  currentLevel: number;
  currentXP: number;
  totalXP: number;
  
  // Activity tracking
  totalMessages: number;
  totalDocuments: number;
  totalConversations: number;
  totalFacts: number;
  interestsIdentified: number;
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
  
  // Timestamps
  createdAt: number;
  lastActiveDate: string; // YYYY-MM-DD format
  lastLevelUp: number;
  
  // Milestones achieved
  milestones: string[]; // Array of milestone IDs
}

export interface Milestone {
  id: string;
  category: 'conversation' | 'knowledge' | 'relationship' | 'learning';
  title: string;
  description: string;
  xpReward: number;
  achievedAt?: number;
  requirement: {
    type: 'messages' | 'documents' | 'days' | 'streak' | 'custom';
    value: number;
  };
}

export interface Settings {
  key: string;
  value: any;
}

