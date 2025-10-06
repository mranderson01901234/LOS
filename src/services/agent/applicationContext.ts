/**
 * Application Context Service
 * 
 * Provides comprehensive context about the current state of the LOS application
 * to help the agent understand what's available and make informed decisions.
 */

import { getAllConversations } from '../db';
import { getAllDocuments } from '../db';
import { getAllFacts } from '../db';
import { getAllSettings } from '../db';

export interface ApplicationState {
  conversations: {
    total: number;
    recent: Array<{
      id: string;
      title: string;
      lastMessage: string;
      messageCount: number;
      createdAt: string;
    }>;
  };
  library: {
    total_documents: number;
    by_type: Record<string, number>;
    recent_additions: Array<{
      title: string;
      type: string;
      date: string;
    }>;
    top_tags: Array<{
      tag: string;
      count: number;
    }>;
    sample_titles: string[];
  };
  knowledge: {
    total_facts: number;
    by_category: Record<string, number>;
    recent_facts: Array<{
      category: string;
      subject: string;
      fact: string;
    }>;
  };
  settings: {
    configured_services: string[];
    user_preferences: Record<string, any>;
  };
}

export class ApplicationContext {
  private cache: ApplicationState | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  /**
   * Get comprehensive application context
   */
  async getContext(): Promise<ApplicationState> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    try {
      // Fetch all data in parallel
      const [conversations, documents, facts, settings] = await Promise.all([
        this.getConversationContext(),
        this.getLibraryContext(),
        this.getKnowledgeContext(),
        this.getSettingsContext()
      ]);

      this.cache = {
        conversations,
        library: documents,
        knowledge: facts,
        settings
      };

      this.cacheExpiry = now + this.CACHE_DURATION;
      return this.cache;

    } catch (error) {
      console.error('Failed to get application context:', error);
      // Return empty context on error
      return this.getEmptyContext();
    }
  }

  /**
   * Get conversation context
   */
  private async getConversationContext() {
    try {
      const conversations = await getAllConversations();
      
      return {
        total: conversations.length,
        recent: conversations
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(conv => ({
            id: conv.id,
            title: conv.title || 'Untitled',
            lastMessage: conv.lastMessage || 'No messages',
            messageCount: conv.messageCount || 0,
            createdAt: conv.createdAt
          }))
      };
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return {
        total: 0,
        recent: []
      };
    }
  }

  /**
   * Get library/document context
   */
  private async getLibraryContext() {
    try {
      const documents = await getAllDocuments();
      
      // Group by type
      const byType: Record<string, number> = {};
      documents.forEach(doc => {
        byType[doc.type] = (byType[doc.type] || 0) + 1;
      });

      // Get recent additions
      const recentAdditions = documents
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(doc => ({
          title: doc.title,
          type: doc.type,
          date: doc.createdAt
        }));

      // Extract tags and count them
      const tagCounts: Record<string, number> = {};
      documents.forEach(doc => {
        if (doc.tags) {
          doc.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

      // Get sample titles
      const sampleTitles = documents
        .slice(0, 10)
        .map(doc => doc.title);

      return {
        total_documents: documents.length,
        by_type: byType,
        recent_additions: recentAdditions,
        top_tags: topTags,
        sample_titles: sampleTitles
      };
    } catch (error) {
      console.error('Failed to get library context:', error);
      return {
        total_documents: 0,
        by_type: {},
        recent_additions: [],
        top_tags: [],
        sample_titles: []
      };
    }
  }

  /**
   * Get knowledge/facts context
   */
  private async getKnowledgeContext() {
    try {
      const facts = await getAllFacts();
      
      // Group by category
      const byCategory: Record<string, number> = {};
      facts.forEach(fact => {
        byCategory[fact.category] = (byCategory[fact.category] || 0) + 1;
      });

      // Get recent facts
      const recentFacts = facts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(fact => ({
          category: fact.category,
          subject: fact.subject,
          fact: fact.content
        }));

      return {
        total_facts: facts.length,
        by_category: byCategory,
        recent_facts: recentFacts
      };
    } catch (error) {
      console.error('Failed to get knowledge context:', error);
      return {
        total_facts: 0,
        by_category: {},
        recent_facts: []
      };
    }
  }

  /**
   * Get settings context
   */
  private async getSettingsContext() {
    try {
      const settings = await getAllSettings();
      
      const configuredServices: string[] = [];
      const userPreferences: Record<string, any> = {};

      settings.forEach(setting => {
        if (setting.key.includes('_api_key') && setting.value) {
          const service = setting.key.replace('_api_key', '');
          configuredServices.push(service);
        }
        userPreferences[setting.key] = setting.value;
      });

      return {
        configured_services: configuredServices,
        user_preferences: userPreferences
      };
    } catch (error) {
      console.error('Failed to get settings context:', error);
      return {
        configured_services: [],
        user_preferences: {}
      };
    }
  }

  /**
   * Get empty context for error cases
   */
  private getEmptyContext(): ApplicationState {
    return {
      conversations: {
        total: 0,
        recent: []
      },
      library: {
        total_documents: 0,
        by_type: {},
        recent_additions: [],
        top_tags: [],
        sample_titles: []
      },
      knowledge: {
        total_facts: 0,
        by_category: {},
        recent_facts: []
      },
      settings: {
        configured_services: [],
        user_preferences: {}
      }
    };
  }

  /**
   * Generate formatted context string for the agent
   */
  async getFormattedContext(): Promise<string> {
    const state = await this.getContext();
    
    return `# APPLICATION STATE CONTEXT

## CONVERSATIONS
- **Total Conversations:** ${state.conversations.total}
- **Recent Conversations:**
${state.conversations.recent.map(conv => `  - "${conv.title}" (${conv.messageCount} messages, last: ${conv.lastMessage})`).join('\n')}

## LIBRARY (Documents)
- **Total Documents:** ${state.library.total_documents}
- **By Type:** ${Object.entries(state.library.by_type).map(([type, count]) => `${type} (${count})`).join(', ')}

### Recent Additions:
${state.library.recent_additions.map(d => `- "${d.title}" (${d.type}, added ${d.date})`).join('\n')}

### Most Common Tags:
${state.library.top_tags.map(t => `- ${t.tag} (${t.count} documents)`).join('\n')}

### Sample Document Titles (what's actually in the library):
${state.library.sample_titles.map(t => `- "${t}"`).join('\n')}

IMPORTANT: When the user asks about "the library" or "organizing the library", they mean THIS collection of ${state.library.total_documents} documents. DO NOT suggest fiction/non-fiction categories unless you see those tags in the actual content.

## KNOWLEDGE BASE (Facts)
- **Total Facts:** ${state.knowledge.total_facts}
- **By Category:** ${Object.entries(state.knowledge.by_category).map(([cat, count]) => `${cat} (${count})`).join(', ')}

### Recent Facts Learned:
${state.knowledge.recent_facts.map(f => `- [${f.category}] ${f.subject}: ${f.fact}`).join('\n')}

## CONFIGURED SERVICES
- **Available Services:** ${state.settings.configured_services.join(', ') || 'None configured'}

## USER PREFERENCES
${Object.entries(state.settings.user_preferences).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

---
This context shows the EXACT current state of the user's LOS application. Use this information to provide accurate, specific responses about their actual data.`;
  }

  /**
   * Clear cache to force refresh
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}

// Export singleton instance
export const applicationContext = new ApplicationContext();