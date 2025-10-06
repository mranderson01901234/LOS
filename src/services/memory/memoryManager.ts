import { 
  getAllFacts, 
  getAllConversations, 
  getConversation,
  updateConversation,
  updateFact
} from '../db';
import { getTopInterests } from '../interestService';
import { GrowthService } from '../growthService';

interface HotMemory {
  userProfile: {
    name?: string;
    stage: string;
    level: number;
    daysActive: number;
  };
  keyFacts: Array<{
    category: string;
    subject: string;
    fact_text: string;
    access_count: number;
  }>;
  recentConversations: Array<{
    id: string;
    date: string;
    summary: string;
  }>;
  topInterests: Array<{
    name: string;
    engagement: number;
  }>;
}

export class MemoryManager {
  
  /**
   * Build hot memory - always included in agent context
   * Size: ~10-20k tokens (15% of context window)
   * Contains: Recent + most important information
   */
  async buildHotMemory(): Promise<string> {
    const growth = await GrowthService.getGrowthState();
    const stage = GrowthService.getStage(growth.level);
    
    // Get most frequently accessed facts
    const facts = await getAllFacts();
    const activeFacts = facts
      .filter(f => f.status === 'active')
      .sort((a, b) => (b.metadata?.access_count || 0) - (a.metadata?.access_count || 0))
      .slice(0, 10);
    
    const interests = await getTopInterests(5);
    const recentConversations = await this.getRecentConversationSummaries(10);
    
    const memory: HotMemory = {
      userProfile: {
        name: 'Daniel Parker', // TODO: Get from user settings
        stage: stage.name,
        level: growth.level,
        daysActive: growth.daysActive
      },
      keyFacts: activeFacts.map(f => ({
        category: f.category,
        subject: f.subject,
        fact_text: f.fact_text,
        access_count: f.metadata?.access_count || 0
      })),
      recentConversations,
      topInterests: interests.map(i => ({
        name: i.name,
        engagement: i.engagement_score
      }))
    };
    
    return this.formatHotMemory(memory);
  }
  
  private formatHotMemory(memory: HotMemory): string {
    return `# USER PROFILE
Name: ${memory.userProfile.name || 'User'}
Stage: ${memory.userProfile.stage} (Level ${memory.userProfile.level})
Days Together: ${memory.userProfile.daysActive}

# TOP INTERESTS
${memory.topInterests.map(i => `- ${i.name} (${Math.round(i.engagement * 100)}% engagement)`).join('\n')}

# KEY FACTS (Most Frequently Referenced)
${memory.keyFacts.map(f => `- ${f.subject}: ${f.fact_text}`).join('\n')}

# RECENT CONVERSATION CONTEXT
${memory.recentConversations.map(c => `[${c.date}] ${c.summary}`).join('\n')}

This is your "hot memory" - core context always available about the user.`;
  }
  
  /**
   * Get summaries of recent conversations
   */
  private async getRecentConversationSummaries(limit: number): Promise<Array<{
    id: string;
    date: string;
    summary: string;
  }>> {
    const conversations = await getAllConversations();
    const recent = conversations.slice(-limit);
    
    return recent.map(c => ({
      id: c.id,
      date: new Date(c.created_at).toLocaleDateString(),
      summary: this.summarizeConversation(c)
    }));
  }
  
  private summarizeConversation(conversation: any): string {
    const firstUserMsg = conversation.messages?.find((m: any) => m.role === 'user');
    if (!firstUserMsg) return 'No summary available';
    
    const preview = firstUserMsg.content.substring(0, 100);
    return preview + (firstUserMsg.content.length > 100 ? '...' : '');
  }
  
  /**
   * Consolidate old memories - compress conversations older than 3 months
   * Run this monthly via scheduled job
   */
  async consolidateOldMemories(apiKey: string): Promise<void> {
    const conversations = await getAllConversations();
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    const oldConversations = conversations.filter(c => 
      new Date(c.created_at).getTime() < threeMonthsAgo &&
      !c.metadata?.compressed
    );
    
    console.log(`Compressing ${oldConversations.length} old conversations...`);
    
    for (const conv of oldConversations) {
      const summary = await this.compressConversationWithAI(conv, apiKey);
      
      // Replace full conversation with compressed summary
      conv.messages = [{
        role: 'system',
        content: `[Archived: ${new Date(conv.created_at).toLocaleDateString()}]\n${summary}`,
        timestamp: Date.now()
      }];
      
      conv.metadata = {
        ...conv.metadata,
        compressed: true,
        original_message_count: conv.messages.length,
        compression_date: new Date().toISOString()
      };
      
      await updateConversation(conv.id, conv);
    }
    
    console.log('Memory consolidation complete');
  }
  
  /**
   * Use Claude Haiku to compress conversation (cheap: ~$0.005 per conversation)
   */
  private async compressConversationWithAI(conversation: any, apiKey: string): Promise<string> {
    const messages = conversation.messages
      .map((m: any) => `${m.role}: ${m.content}`)
      .join('\n');
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Summarize this conversation in 2-3 sentences, preserving key facts, decisions, and outcomes:\n\n${messages.substring(0, 4000)}`
          }]
        })
      });
      
      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Compression failed:', error);
      return this.fallbackCompression(conversation);
    }
  }
  
  private fallbackCompression(conversation: any): string {
    // Simple fallback if API fails
    const topics = this.extractTopics(conversation.messages.map((m: any) => m.content).join(' '));
    return `Discussion about ${topics}. ${conversation.messages.length} messages exchanged.`;
  }
  
  private extractTopics(text: string): string {
    const topics = new Set<string>();
    const words = text.toLowerCase().split(/\s+/);
    
    const topicKeywords = [
      'photography', 'wine', 'cooking', 'camera', 'recipe', 
      'document', 'note', 'learning', 'project'
    ];
    
    for (const keyword of topicKeywords) {
      if (words.includes(keyword)) topics.add(keyword);
    }
    
    return Array.from(topics).join(', ') || 'various topics';
  }
  
  /**
   * Search through all memories (including compressed)
   * Tier 2: Warm Memory - semantic search on demand
   */
  async searchMemories(query: string, timeframe?: 'recent' | 'all'): Promise<any[]> {
    const conversations = await getAllConversations();
    
    let filtered = conversations;
    if (timeframe === 'recent') {
      const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      filtered = conversations.filter(c => 
        new Date(c.created_at).getTime() > oneMonthAgo
      );
    }
    
    const queryLower = query.toLowerCase();
    const matches = filtered.filter(c => {
      if (c.metadata?.compressed) {
        // Search in compressed summary
        return c.messages[0]?.content.toLowerCase().includes(queryLower);
      } else {
        // Search in full messages
        return c.messages.some((m: any) => 
          m.content.toLowerCase().includes(queryLower)
        );
      }
    });
    
    return matches.slice(0, 10); // Limit results
  }
  
  /**
   * Track fact access for hot memory ranking
   */
  async incrementFactAccess(factId: string): Promise<void> {
    const facts = await getAllFacts();
    const fact = facts.find(f => f.id === factId);
    
    if (fact) {
      fact.metadata = {
        ...fact.metadata,
        access_count: (fact.metadata?.access_count || 0) + 1,
        last_accessed: new Date().toISOString()
      };
      
      await updateFact(factId, fact);
    }
  }
}
