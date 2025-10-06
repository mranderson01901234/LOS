import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Re-export types for other services
export type {
  Conversation,
  Message,
  Document,
  DocumentChunk,
  Fact,
  Interest,
  GrowthMetrics,
  Settings,
  Milestone,
} from '../types/database';

import type {
  Conversation,
  Message,
  Document,
  DocumentChunk,
  Fact,
  Interest,
  GrowthMetrics,
  Settings,
  Milestone,
} from '../types/database';

// Database schema interface
interface LOSDatabase extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: {
      'created_at': string;
      'updated_at': string;
    };
  };
  messages: {
    key: string;
    value: Message;
    indexes: {
      'conversation_id': string;
      'timestamp': string;
      'role': string;
    };
  };
  documents: {
    key: string;
    value: Document;
    indexes: {
      'type': string;
      'date_added': string;
      'interest_category': string;
      'isProcessed': boolean;
    };
  };
  documentChunks: {
    key: string;
    value: DocumentChunk;
    indexes: {
      'documentId': string;
      'chunkIndex': number;
    };
  };
  facts: {
    key: string;
    value: Fact;
    indexes: {
      'category': string;
      'subject': string;
      'date_created': string;
      'status': string;
    };
  };
  interests: {
    key: string;
    value: Interest;
    indexes: {
      'engagement_score': number;
      'last_activity': string;
    };
  };
  growth_metrics: {
    key: string;
    value: GrowthMetrics;
  };
  milestones: {
    key: string;
    value: Milestone;
    indexes: {
      'category': string;
      'achievedAt': number;
    };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let dbInstance: IDBPDatabase<LOSDatabase> | null = null;

// Initialize predefined milestones
async function initializeMilestones(db: IDBPDatabase<LOSDatabase>): Promise<void> {
  const milestones: Milestone[] = [
    // Conversation milestones
    { id: 'first_message', category: 'conversation', title: 'First Words', description: 'Sent your first message', xpReward: 100, requirement: { type: 'messages', value: 1 } },
    { id: 'messages_10', category: 'conversation', title: 'Chatty', description: 'Sent 10 messages', xpReward: 50, requirement: { type: 'messages', value: 10 } },
    { id: 'messages_100', category: 'conversation', title: 'Conversationalist', description: 'Sent 100 messages', xpReward: 200, requirement: { type: 'messages', value: 100 } },
    { id: 'messages_1000', category: 'conversation', title: 'Deep Thinker', description: 'Sent 1,000 messages', xpReward: 500, requirement: { type: 'messages', value: 1000 } },
    
    // Knowledge milestones
    { id: 'first_document', category: 'knowledge', title: 'First Lesson', description: 'Saved your first document', xpReward: 100, requirement: { type: 'documents', value: 1 } },
    { id: 'documents_10', category: 'knowledge', title: 'Knowledge Seeker', description: 'Saved 10 documents', xpReward: 100, requirement: { type: 'documents', value: 10 } },
    { id: 'documents_50', category: 'knowledge', title: 'Library Builder', description: 'Saved 50 documents', xpReward: 250, requirement: { type: 'documents', value: 50 } },
    { id: 'documents_100', category: 'knowledge', title: 'Scholar', description: 'Saved 100 documents', xpReward: 500, requirement: { type: 'documents', value: 100 } },
    
    // Relationship milestones
    { id: 'day_1', category: 'relationship', title: 'New Beginning', description: 'Your first day together', xpReward: 50, requirement: { type: 'days', value: 1 } },
    { id: 'streak_7', category: 'relationship', title: 'Week Together', description: '7 day streak', xpReward: 150, requirement: { type: 'streak', value: 7 } },
    { id: 'streak_30', category: 'relationship', title: 'Month Together', description: '30 day streak', xpReward: 300, requirement: { type: 'streak', value: 30 } },
    { id: 'days_100', category: 'relationship', title: 'Centennial', description: '100 days active', xpReward: 500, requirement: { type: 'days', value: 100 } },
  ];
  
  for (const milestone of milestones) {
    const existing = await db.get('milestones', milestone.id);
    if (!existing) {
      await db.add('milestones', milestone);
    }
  }
}

// Initialize database
export async function initDB(): Promise<IDBPDatabase<LOSDatabase>> {
  try {
    if (dbInstance) {
      return dbInstance;
    }

    dbInstance = await openDB<LOSDatabase>('los-db', 3, {
      upgrade(db) {
        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', {
            keyPath: 'id',
          });
          conversationStore.createIndex('created_at', 'created_at');
          conversationStore.createIndex('updated_at', 'updated_at');
        }

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', {
            keyPath: 'id',
          });
          messageStore.createIndex('conversation_id', 'conversation_id');
          messageStore.createIndex('timestamp', 'timestamp');
          messageStore.createIndex('role', 'role');
        }

        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
          const documentStore = db.createObjectStore('documents', {
            keyPath: 'id',
          });
          documentStore.createIndex('type', 'type');
          documentStore.createIndex('date_added', 'date_added');
          documentStore.createIndex('interest_category', 'interest_category');
          documentStore.createIndex('isProcessed', 'isProcessed');
        }

        // DocumentChunks store (NEW for RAG)
        if (!db.objectStoreNames.contains('documentChunks')) {
          const chunkStore = db.createObjectStore('documentChunks', {
            keyPath: 'id',
          });
          chunkStore.createIndex('documentId', 'documentId');
          chunkStore.createIndex('chunkIndex', 'chunkIndex');
        }

        // Facts store
        if (!db.objectStoreNames.contains('facts')) {
          const factStore = db.createObjectStore('facts', { keyPath: 'id' });
          factStore.createIndex('category', 'category');
          factStore.createIndex('subject', 'subject');
          factStore.createIndex('date_created', 'date_created');
          factStore.createIndex('status', 'status');
        }

        // Interests store
        if (!db.objectStoreNames.contains('interests')) {
          const interestStore = db.createObjectStore('interests', {
            keyPath: 'id',
          });
          interestStore.createIndex('engagement_score', 'engagement_score');
          interestStore.createIndex('last_activity', 'last_activity');
        }

        // Growth metrics store
        if (!db.objectStoreNames.contains('growth_metrics')) {
          db.createObjectStore('growth_metrics', { keyPath: 'id' });
        }

        // Milestones store
        if (!db.objectStoreNames.contains('milestones')) {
          const milestoneStore = db.createObjectStore('milestones', { keyPath: 'id' });
          milestoneStore.createIndex('category', 'category');
          milestoneStore.createIndex('achievedAt', 'achievedAt');
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });

    // Initialize default growth metrics if doesn't exist
    const existingMetrics = await dbInstance.get('growth_metrics', 'current');
    if (!existingMetrics) {
      const today = new Date().toISOString().split('T')[0];
      const defaultMetrics: GrowthMetrics = {
        id: 'current',
        currentLevel: 1,
        currentXP: 0,
        totalXP: 0,
        totalMessages: 0,
        totalDocuments: 0,
        totalConversations: 0,
        totalFacts: 0,
        interestsIdentified: 0,
        daysActive: 1,
        currentStreak: 1,
        longestStreak: 1,
        createdAt: Date.now(),
        lastActiveDate: today,
        lastLevelUp: Date.now(),
        milestones: [],
      };
      await dbInstance.put('growth_metrics', defaultMetrics);
    }

    // Initialize predefined milestones if they don't exist
      await initializeMilestones(dbInstance);
      return dbInstance;
  } catch (error) {
    console.error('[ERROR] Database initialization error:', error);
    throw error;
  }
}

// Conversations
export async function createConversation(): Promise<Conversation> {
  try {
    const db = await initDB();
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: now,
      updated_at: now,
      message_count: 0,
    };
    await db.put('conversations', conversation);
    
    // Update growth metrics
    const metrics = await getGrowthMetrics();
    await updateGrowthMetrics({
      totalConversations: metrics.totalConversations + 1,
      lastActiveDate: now.split('T')[0], // Convert to YYYY-MM-DD format
    });// Emit event for UI updates
    window.dispatchEvent(new CustomEvent('conversationsChanged'));
    
    return conversation;
  } catch (error) {
    console.error('[ERROR] Error creating conversation:', error);
    throw error;
  }
}

export async function getConversation(
  id: string
): Promise<Conversation | undefined> {
  try {
    const db = await initDB();
    return await db.get('conversations', id);
  } catch (error) {
    console.error('[ERROR] Error getting conversation:', error);
    return undefined;
  }
}

export async function getAllConversations(): Promise<Conversation[]> {
  try {
    const db = await initDB();
    const conversations = await db.getAllFromIndex(
      'conversations',
      'updated_at'
    );
    return conversations.reverse(); // Most recent first
  } catch (error) {
    console.error('[ERROR] Error getting all conversations:', error);
    return [];
  }
}

export async function updateConversation(
  id: string,
  updates: Partial<Conversation>
): Promise<void> {
  try {
    const db = await initDB();
    const conversation = await db.get('conversations', id);
    if (conversation) {
      const updated = { ...conversation, ...updates, updated_at: new Date().toISOString() };
      await db.put('conversations', updated);// Emit event for UI updates
      window.dispatchEvent(new CustomEvent('conversationsChanged'));
    }
  } catch (error) {
    console.error('[ERROR] Error updating conversation:', error);
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete('conversations', id);
    
    // Delete all messages in this conversation
    const messages = await getMessagesByConversation(id);
    for (const message of messages) {
      await db.delete('messages', message.id);
    }// Emit event for UI updates
    window.dispatchEvent(new CustomEvent('conversationsChanged'));
  } catch (error) {
    console.error('[ERROR] Error deleting conversation:', error);
  }
}

// Messages
export async function saveMessage(message: Message): Promise<void> {
  try {
    const db = await initDB();
    await db.put('messages', message);
    
    // Update conversation
    const conversation = await getConversation(message.conversation_id);
    if (conversation) {
      await updateConversation(message.conversation_id, {
        message_count: conversation.message_count + 1,
        title: conversation.title || (message.role === 'user' ? generateTitle(message.content) : conversation.title),
      });
    }
    
    // Update growth metrics
    const metrics = await getGrowthMetrics();
    await updateGrowthMetrics({
      totalMessages: metrics.totalMessages + 1,
      lastActiveDate: new Date().toISOString().split('T')[0], // Convert to YYYY-MM-DD format
    });
  } catch (error) {
    console.error('[ERROR] Error saving message:', error);
  }
}

export async function getMessagesByConversation(
  conversationId: string
): Promise<Message[]> {
  try {
    const db = await initDB();
    const messages = await db.getAllFromIndex(
      'messages',
      'conversation_id',
      conversationId
    );
    
    return messages.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  } catch (error) {
    console.error('[ERROR] Error getting messages by conversation:', error);
    return [];
  }
}

export async function getAllMessages(): Promise<Message[]> {
  try {
    const db = await initDB();
    return await db.getAll('messages');
  } catch (error) {
    console.error('[ERROR] Error getting all messages:', error);
    return [];
  }
}

export async function getLastNMessages(
  conversationId: string,
  n: number
): Promise<Message[]> {
  try {
    const messages = await getMessagesByConversation(conversationId);
    return messages.slice(-n);
  } catch (error) {
    console.error('[ERROR] Error getting last N messages:', error);
    return [];
  }
}

export async function deleteMessage(id: string): Promise<void> {
  try {
    const db = await initDB();
    const message = await db.get('messages', id);
    if (message) {
      await db.delete('messages', id);
      
      // Update conversation message count
      const conversation = await getConversation(message.conversation_id);
      if (conversation) {
        await updateConversation(message.conversation_id, {
          message_count: Math.max(0, conversation.message_count - 1),
        });
      }
    }
  } catch (error) {
    console.error('[ERROR] Error deleting message:', error);
  }
}

// Documents
export async function saveDocument(doc: Document): Promise<void> {
  try {
    const db = await initDB();
    await db.put('documents', doc);
    
    // Update growth metrics
    const metrics = await getGrowthMetrics();
    await updateGrowthMetrics({
      totalDocuments: metrics.totalDocuments + 1,
    });
    
    // Emit library item created event for Library autonomy system
    try {
      const { eventBus } = await import('./eventBus');
      const { queueManager } = await import('./queueManager');
      
      // Create library payload based on document type
      let payload: any;
      switch (doc.type) {
        case 'url':
          payload = {
            type: 'url',
            url: doc.url || '',
            title: doc.title,
            html: doc.content
          };
          break;
        case 'file':
          payload = {
            type: 'pdf', // Assuming PDF for now, could be enhanced
            id: doc.id,
            path: doc.url || '',
            filename: doc.title
          };
          break;
        case 'note':
          payload = {
            type: 'text',
            id: doc.id,
            content: doc.content,
            source: 'manual'
          };
          break;
        default:
          payload = {
            type: 'text',
            id: doc.id,
            content: doc.content,
            source: doc.type
          };
      }
      
      // Emit the event
      eventBus.emitLibraryItemCreated(doc.id, payload);
      
      // Queue enrichment task if auto-enrichment is enabled
      if (eventBus.getStats().activeSubscriptions > 0) {
        queueManager.enqueue('enrich_document', {
          itemId: doc.id,
          payload,
          document: doc
        }, {
          priority: 1,
          metadata: { source: 'document_save' }
        });
      }
      
    } catch (eventError) {
      console.warn('[WARNING] Failed to emit library item event:', eventError);
    }
  } catch (error) {
    console.error('[ERROR] Error saving document:', error);
  }
}

export async function getDocument(id: string): Promise<Document | undefined> {
  try {
    const db = await initDB();
    return await db.get('documents', id);
  } catch (error) {
    console.error('[ERROR] Error getting document:', error);
    return undefined;
  }
}

export async function getAllDocuments(): Promise<Document[]> {
  try {
    const db = await initDB();
    return await db.getAll('documents');
  } catch (error) {
    console.error('[ERROR] Error getting all documents:', error);
    return [];
  }
}

export async function updateDocument(
  id: string,
  updates: Partial<Document>
): Promise<void> {
  try {
    const db = await initDB();
    const document = await db.get('documents', id);
    if (document) {
      const updated = { ...document, ...updates };
      await db.put('documents', updated);}
  } catch (error) {
    console.error('[ERROR] Error updating document:', error);
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete('documents', id);
    
    // Also delete all chunks for this document
    const chunks = await getChunksByDocument(id);
    for (const chunk of chunks) {
      await db.delete('documentChunks', chunk.id!);
    }
  } catch (error) {
    console.error('[ERROR] Error deleting document:', error);
  }
}

export async function deleteAllUrlDocuments(): Promise<number> {
  try {
    const db = await initDB();
    const allDocs = await db.getAll('documents');
    const urlDocs = allDocs.filter(doc => doc.type === 'url');
    
    let deletedCount = 0;
    for (const doc of urlDocs) {
      try {
        // Delete document
        await db.delete('documents', doc.id);
        
        // Delete all chunks for this document
        const chunks = await getChunksByDocument(doc.id);
        for (const chunk of chunks) {
          await db.delete('documentChunks', chunk.id!);
        }
        
        deletedCount++;
      } catch (error) {
        console.error(`[ERROR] Failed to delete document ${doc.id}:`, error);
      }
    }
    return deletedCount;
  } catch (error) {
    console.error('[ERROR] Error deleting URL documents:', error);
    throw error;
  }
}

// DocumentChunks functions
export async function saveDocumentChunk(chunk: DocumentChunk): Promise<void> {
  try {
    const db = await initDB();
    if (!chunk.id) {
      chunk.id = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    await db.put('documentChunks', chunk);
  } catch (error) {
    console.error('[ERROR] Error saving document chunk:', error);
  }
}

export async function saveDocumentChunks(chunks: DocumentChunk[]): Promise<void> {
  try {
    const db = await initDB();
    
    // Save each chunk individually
    for (const chunk of chunks) {
      const chunkWithId = {
        ...chunk,
        id: chunk.id || `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      await db.put('documentChunks', chunkWithId);
    }
  } catch (error) {
    console.error('[ERROR] Error saving document chunks:', error);
  }
}

export async function getChunksByDocument(documentId: string): Promise<DocumentChunk[]> {
  try {
    const db = await initDB();
    const chunks = await db.getAllFromIndex('documentChunks', 'documentId', documentId);
    return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  } catch (error) {
    console.error('[ERROR] Error getting chunks by document:', error);
    return [];
  }
}

export async function getAllDocumentChunks(): Promise<DocumentChunk[]> {
  try {
    const db = await initDB();
    return await db.getAll('documentChunks');
  } catch (error) {
    console.error('[ERROR] Error getting all document chunks:', error);
    return [];
  }
}

export async function deleteDocumentChunk(id: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete('documentChunks', id);
  } catch (error) {
    console.error('[ERROR] Error deleting document chunk:', error);
  }
}

// Facts
export async function saveFact(fact: Fact): Promise<void> {
  try {
    const db = await initDB();
    await db.put('facts', fact);
    
    // Update growth metrics
    const metrics = await getGrowthMetrics();
    await updateGrowthMetrics({
      totalFacts: metrics.totalFacts + 1,
    });
  } catch (error) {
    console.error('[ERROR] Error saving fact:', error);
  }
}

export async function getFact(id: string): Promise<Fact | undefined> {
  try {
    const db = await initDB();
    return await db.get('facts', id);
  } catch (error) {
    console.error('[ERROR] Error getting fact:', error);
    return undefined;
  }
}

export async function getAllFacts(): Promise<Fact[]> {
  try {
    const db = await initDB();
    return await db.getAll('facts');
  } catch (error) {
    console.error('[ERROR] Error getting all facts:', error);
    return [];
  }
}

export async function getFactsByCategory(category: string): Promise<Fact[]> {
  try {
    const db = await initDB();
    return await db.getAllFromIndex('facts', 'category', category);
  } catch (error) {
    console.error('[ERROR] Error getting facts by category:', error);
    return [];
  }
}

export async function updateFact(
  id: string,
  updates: Partial<Fact>
): Promise<void> {
  try {
    const db = await initDB();
    const fact = await db.get('facts', id);
    if (fact) {
      const updated = { ...fact, ...updates, date_updated: new Date().toISOString() };
      await db.put('facts', updated);
    }
  } catch (error) {
    console.error('[ERROR] Error updating fact:', error);
  }
}

export async function deleteFact(id: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete('facts', id);
  } catch (error) {
    console.error('[ERROR] Error deleting fact:', error);
  }
}

// Interests
export async function saveInterest(interest: Interest): Promise<void> {
  try {
    const db = await initDB();
    await db.put('interests', interest);
  } catch (error) {
    console.error('[ERROR] Error saving interest:', error);
  }
}

export async function getAllInterests(): Promise<Interest[]> {
  try {
    const db = await initDB();
    return await db.getAll('interests');
  } catch (error) {
    console.error('[ERROR] Error getting all interests:', error);
    return [];
  }
}

export async function updateInterest(
  id: string,
  updates: Partial<Interest>
): Promise<void> {
  try {
    const db = await initDB();
    const interest = await db.get('interests', id);
    if (interest) {
      const updated = { ...interest, ...updates };
      await db.put('interests', updated);
    }
  } catch (error) {
    console.error('[ERROR] Error updating interest:', error);
  }
}

// Growth
export async function getGrowthMetrics(): Promise<GrowthMetrics> {
  try {
    const db = await initDB();
    const metrics = await db.get('growth_metrics', 'current');
    if (!metrics) {
      // Return default if not found
      const today = new Date().toISOString().split('T')[0];
      const defaultMetrics: GrowthMetrics = {
        id: 'current',
        currentLevel: 1,
        currentXP: 0,
        totalXP: 0,
        totalMessages: 0,
        totalDocuments: 0,
        totalConversations: 0,
        totalFacts: 0,
        interestsIdentified: 0,
        daysActive: 1,
        currentStreak: 1,
        longestStreak: 1,
        createdAt: Date.now(),
        lastActiveDate: today,
        lastLevelUp: Date.now(),
        milestones: [],
      };
      await db.put('growth_metrics', defaultMetrics);
      return defaultMetrics;
    }
    return metrics;
  } catch (error) {
    console.error('[ERROR] Error getting growth metrics:', error);
    throw error;
  }
}

export async function getAllMilestones(): Promise<Milestone[]> {
  try {
    const db = await initDB();
    return await db.getAll('milestones');
  } catch (error) {
    console.error('[ERROR] Error getting all milestones:', error);
    return [];
  }
}

export async function updateGrowthMetrics(
  updates: Partial<GrowthMetrics>
): Promise<void> {
  try {
    const db = await initDB();
    const metrics = await getGrowthMetrics();
    const updated = { ...metrics, ...updates };
    await db.put('growth_metrics', updated);
  } catch (error) {
    console.error('[ERROR] Error updating growth metrics:', error);
  }
}

// Settings
export async function getSetting(key: string): Promise<any> {
  try {
    const db = await initDB();
    const setting = await db.get('settings', key);
    return setting?.value;
  } catch (error) {
    console.error('[ERROR] Error getting setting:', error);
    return undefined;
  }
}

export async function setSetting(key: string, value: any): Promise<void> {
  try {
    const db = await initDB();
    await db.put('settings', { key, value });
  } catch (error) {
    console.error('[ERROR] Error setting:', error);
  }
}

export async function getAllSettings(): Promise<Record<string, any>> {
  try {
    const db = await initDB();
    const settings = await db.getAll('settings');
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
  } catch (error) {
    console.error('[ERROR] Error getting all settings:', error);
    return {};
  }
}

// Utility
export async function clearAllData(): Promise<void> {
  try {
    const db = await initDB();
    await db.clear('conversations');
    await db.clear('messages');
    await db.clear('documents');
    await db.clear('documentChunks');
    await db.clear('facts');
    await db.clear('interests');
    await db.clear('settings');
    
    // Reset growth metrics
    const defaultMetrics: GrowthMetrics = {
      id: 'current',
      currentLevel: 1,
      currentXP: 0,
      totalXP: 0,
      totalMessages: 0,
      totalDocuments: 0,
      totalConversations: 0,
      totalFacts: 0,
      interestsIdentified: 0,
      daysActive: 1,
      currentStreak: 1,
      longestStreak: 1,
      createdAt: Date.now(),
      lastActiveDate: new Date().toISOString().split('T')[0],
      lastLevelUp: Date.now(),
      milestones: [],
    };
    await db.put('growth_metrics', defaultMetrics);
  } catch (error) {
    console.error('[ERROR] Error clearing data:', error);
  }
}

export async function exportData(): Promise<string> {
  try {
    const db = await initDB();
    const data = {
      conversations: await db.getAll('conversations'),
      messages: await db.getAll('messages'),
      documents: await db.getAll('documents'),
      documentChunks: await db.getAll('documentChunks'),
      facts: await db.getAll('facts'),
      interests: await db.getAll('interests'),
      growth_metrics: await db.get('growth_metrics', 'current'),
      settings: await db.getAll('settings'),
      exportDate: new Date().toISOString(),
    };return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('[ERROR] Error exporting data:', error);
    throw error;
  }
}

export async function importData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData);
    const db = await initDB();

    // Import all data
    if (data.conversations) {
      for (const conv of data.conversations) {
        await db.put('conversations', conv);
      }
    }
    if (data.messages) {
      for (const msg of data.messages) {
        await db.put('messages', msg);
      }
    }
    if (data.documents) {
      for (const doc of data.documents) {
        await db.put('documents', doc);
      }
    }
    if (data.documentChunks) {
      for (const chunk of data.documentChunks) {
        await db.put('documentChunks', chunk);
      }
    }
    if (data.facts) {
      for (const fact of data.facts) {
        await db.put('facts', fact);
      }
    }
    if (data.interests) {
      for (const interest of data.interests) {
        await db.put('interests', interest);
      }
    }
    if (data.growth_metrics) {
      await db.put('growth_metrics', data.growth_metrics);
    }
    if (data.settings) {
      for (const setting of data.settings) {
        await db.put('settings', setting);
      }
    }
  } catch (error) {
    console.error('[ERROR] Error importing data:', error);
    throw error;
  }
}

// Helper function to generate conversation title from first message
function generateTitle(content: string): string {
  const maxLength = 50;
  const cleaned = content.trim().replace(/\n/g, ' ');
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.substring(0, maxLength).trim() + '...';
}

