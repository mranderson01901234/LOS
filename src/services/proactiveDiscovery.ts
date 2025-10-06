/**
 * Proactive Discovery Service - Finds relevant content based on user patterns
 * 
 * This service analyzes user content patterns and proactively searches for
 * relevant new content to recommend to the user.
 */

import { v4 as uuidv4 } from 'uuid';
import { secureApi } from './secureApi';
import { contentPatternAnalyzer } from './contentPatternAnalyzer';
import { featureFlags } from './foundation/featureFlags';
import {
  Discovery,
  ProactiveSearchQuery,
  UserContext,
  ContentPattern
} from '../types/library';

export class ProactiveDiscoveryService {
  private discoveries: Map<string, Discovery> = new Map();
  private searchHistory: ProactiveSearchQuery[] = [];
  private userContext: UserContext | null = null;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the service
   */
  private async initializeService(): Promise<void> {
    try {
      this.userContext = contentPatternAnalyzer.getUserContext();} catch (error) {
      console.error('Failed to initialize Proactive Discovery Service:', error);
    }
  }

  /**
   * Generate daily discoveries based on user patterns
   */
  async generateDailyDiscoveries(): Promise<Discovery[]> {
    if (!featureFlags.isEnabled('rules_engine')) {return [];
    }

    try {
      // Analyze content patterns
      const patterns = await contentPatternAnalyzer.analyzeContentPatterns('week');
      
      // Extract search queries from patterns
      const searchQueries = await this.generateSearchQueries(patterns);
      
      // Execute searches
      const discoveries: Discovery[] = [];
      
      for (const query of searchQueries.slice(0, 5)) { // Limit to 5 searches per day
        const queryDiscoveries = await this.executeSearch(query);
        discoveries.push(...queryDiscoveries);
      }
      
      // Store discoveries
      discoveries.forEach(discovery => {
        this.discoveries.set(discovery.id, discovery);
      });return discoveries;
      
    } catch (error) {
      console.error('Failed to generate daily discoveries:', error);
      return [];
    }
  }

  /**
   * Generate search queries from content patterns
   */
  private async generateSearchQueries(patterns: ContentPattern[]): Promise<ProactiveSearchQuery[]> {
    const queries: ProactiveSearchQuery[] = [];
    
    // Extract topics from patterns
    const topics = this.extractTopicsFromPatterns(patterns);
    
    // Generate queries for each topic
    topics.forEach(topic => {
      queries.push({
        keywords: [topic, 'latest', '2024'],
        categories: ['article', 'tutorial', 'news'],
        timeRange: 'week',
        maxResults: 3,
        userContext: this.userContext || this.getDefaultUserContext()
      });
    });
    
    // Generate queries for user interests
    if (this.userContext) {
      this.userContext.interests.forEach(interest => {
        queries.push({
          keywords: [interest, 'trends', 'development'],
          categories: ['article', 'research'],
          timeRange: 'month',
          maxResults: 2,
          userContext: this.userContext!
        });
      });
    }
    
    return queries;
  }

  /**
   * Execute a search query
   */
  private async executeSearch(query: ProactiveSearchQuery): Promise<Discovery[]> {
    try {
      // For now, we'll create mock discoveries based on the query
      // In a real implementation, this would search external APIs
      const discoveries: Discovery[] = [];
      
      const searchTerm = query.keywords.join(' ');
      
      // Create mock discoveries based on search terms
      const mockDiscoveries = this.createMockDiscoveries(searchTerm, query);
      
      discoveries.push(...mockDiscoveries);
      
      // Store search history
      this.searchHistory.push(query);
      
      return discoveries;
      
    } catch (error) {
      console.error('Failed to execute search:', error);
      return [];
    }
  }

  /**
   * Create mock discoveries for testing
   */
  private createMockDiscoveries(searchTerm: string, query: ProactiveSearchQuery): Discovery[] {
    const discoveries: Discovery[] = [];
    
    // Create different types of discoveries based on categories
    query.categories.forEach(category => {
      const discovery = this.createMockDiscovery(searchTerm, category, query);
      if (discovery) {
        discoveries.push(discovery);
      }
    });
    
    return discoveries;
  }

  /**
   * Create a single mock discovery
   */
  private createMockDiscovery(searchTerm: string, category: Discovery['category'], query: ProactiveSearchQuery): Discovery | null {
    const mockData = {
      article: {
        title: `Latest ${searchTerm} developments and trends`,
        description: `Comprehensive overview of recent ${searchTerm} developments, including new techniques and best practices.`,
        source: 'TechBlog.com',
        url: `https://example.com/${searchTerm.replace(/\s+/g, '-')}-article`
      },
      tutorial: {
        title: `Complete guide to ${searchTerm}`,
        description: `Step-by-step tutorial covering ${searchTerm} from basics to advanced concepts.`,
        source: 'DevTutorials.com',
        url: `https://example.com/${searchTerm.replace(/\s+/g, '-')}-tutorial`
      },
      news: {
        title: `${searchTerm} news and updates`,
        description: `Breaking news and latest updates in the ${searchTerm} field.`,
        source: 'TechNews.com',
        url: `https://example.com/${searchTerm.replace(/\s+/g, '-')}-news`
      },
      research: {
        title: `Research insights on ${searchTerm}`,
        description: `Academic research and scientific studies related to ${searchTerm}.`,
        source: 'ResearchJournal.com',
        url: `https://example.com/${searchTerm.replace(/\s+/g, '-')}-research`
      },
      product: {
        title: `Best ${searchTerm} tools and products`,
        description: `Curated list of top ${searchTerm} tools and products for developers.`,
        source: 'ProductReviews.com',
        url: `https://example.com/${searchTerm.replace(/\s+/g, '-')}-products`
      }
    };
    
    const data = mockData[category];
    if (!data) return null;
    
    return {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      url: data.url,
      source: data.source,
      relevanceScore: this.calculateRelevanceScore(searchTerm, query),
      category,
      discoveredAt: Date.now(),
      reason: `Based on your interest in ${searchTerm} and recent content patterns`
    };
  }

  /**
   * Calculate relevance score for a discovery
   */
  private calculateRelevanceScore(searchTerm: string, query: ProactiveSearchQuery): number {
    let score = 0.5; // Base score
    
    // Increase score based on user context alignment
    if (this.userContext) {
      const interestMatch = this.userContext.interests.some(interest => 
        searchTerm.toLowerCase().includes(interest.toLowerCase())
      );
      if (interestMatch) score += 0.2;
      
      const projectMatch = this.userContext.currentProjects.some(project => 
        searchTerm.toLowerCase().includes(project.toLowerCase())
      );
      if (projectMatch) score += 0.2;
    }
    
    // Increase score based on recent activity
    const recentActivityMatch = this.userContext?.recentActivity.some(activity => 
      searchTerm.toLowerCase().includes(activity.toLowerCase())
    );
    if (recentActivityMatch) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Extract topics from content patterns
   */
  private extractTopicsFromPatterns(patterns: ContentPattern[]): string[] {
    const topics: string[] = [];
    
    patterns.forEach(pattern => {
      if (pattern.type === 'topic') {
        const topicData = pattern.data as [string, number][];
        topics.push(...topicData.slice(0, 3).map(([topic]) => topic));
      }
      
      if (pattern.type === 'interest') {
        const interestData = pattern.data as any[];
        topics.push(...interestData.slice(0, 2).map((item: any) => item.topic));
      }
    });
    
    return [...new Set(topics)];
  }

  /**
   * Get discoveries by category
   */
  getDiscoveriesByCategory(category: Discovery['category']): Discovery[] {
    return Array.from(this.discoveries.values())
      .filter(discovery => discovery.category === category);
  }

  /**
   * Get recent discoveries
   */
  getRecentDiscoveries(limit: number = 10): Discovery[] {
    return Array.from(this.discoveries.values())
      .sort((a, b) => b.discoveredAt - a.discoveredAt)
      .slice(0, limit);
  }

  /**
   * Update discovery user action
   */
  updateDiscoveryAction(discoveryId: string, action: Discovery['userAction']): void {
    const discovery = this.discoveries.get(discoveryId);
    if (discovery) {
      discovery.userAction = action;}
  }

  /**
   * Get discovery statistics
   */
  getDiscoveryStats(): {
    total: number;
    byCategory: Record<string, number>;
    byAction: Record<string, number>;
    averageRelevance: number;
  } {
    const discoveries = Array.from(this.discoveries.values());
    
    const byCategory: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    let totalRelevance = 0;
    
    discoveries.forEach(discovery => {
      byCategory[discovery.category] = (byCategory[discovery.category] || 0) + 1;
      byAction[discovery.userAction || 'pending'] = (byAction[discovery.userAction || 'pending'] || 0) + 1;
      totalRelevance += discovery.relevanceScore;
    });
    
    return {
      total: discoveries.length,
      byCategory,
      byAction,
      averageRelevance: discoveries.length > 0 ? totalRelevance / discoveries.length : 0
    };
  }

  /**
   * Search for specific content
   */
  async searchContent(query: string, categories: Discovery['category'][] = []): Promise<Discovery[]> {
    const searchQuery: ProactiveSearchQuery = {
      keywords: query.split(' '),
      categories: categories.length > 0 ? categories : ['article', 'tutorial', 'news'],
      timeRange: 'week',
      maxResults: 10,
      userContext: this.userContext || this.getDefaultUserContext()
    };
    
    return await this.executeSearch(searchQuery);
  }

  /**
   * Get default user context
   */
  private getDefaultUserContext(): UserContext {
    return {
      interests: ['technology', 'development', 'ai'],
      recentActivity: [],
      currentProjects: ['LOS Development'],
      learningGoals: ['AI Development'],
      preferences: {
        contentTypes: ['url', 'note'],
        sources: ['medium.com', 'github.com'],
        languages: ['en']
      }
    };
  }

  /**
   * Update user context
   */
  async updateUserContext(): Promise<void> {
    this.userContext = contentPatternAnalyzer.getUserContext();
  }

  /**
   * Clear old discoveries
   */
  clearOldDiscoveries(daysOld: number = 7): void {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    Array.from(this.discoveries.entries()).forEach(([id, discovery]) => {
      if (discovery.discoveredAt < cutoff) {
        this.discoveries.delete(id);
      }
    });}
}

// Global instance
export const proactiveDiscoveryService = new ProactiveDiscoveryService();
