/**
 * Content Pattern Analysis Service - Analyzes user content patterns for intelligent insights
 * 
 * This service analyzes user content to identify patterns, interests, and learning opportunities
 * for both the user and the agent.
 */

import { v4 as uuidv4 } from 'uuid';
import { getAllDocuments } from './db';
import { secureApi } from './secureApi';
import { eventBus } from './eventBus';
import { featureFlags } from './foundation/featureFlags';
import {
  ContentPattern,
  InterestPattern,
  UserContext,
  RawContentItem,
  ContentAnalysis,
  DailySnapshot,
  Discovery
} from '../types/library';

export class ContentPatternAnalyzer {
  private patterns: Map<string, ContentPattern> = new Map();
  private userContext: UserContext | null = null;
  private analysisCache: Map<string, ContentAnalysis> = new Map();

  constructor() {
    this.initializeUserContext();
  }

  /**
   * Initialize user context from existing data
   */
  private async initializeUserContext(): Promise<void> {
    try {
      const documents = await getAllDocuments();
      const context = await this.extractUserContext(documents);
      this.userContext = context;} catch (error) {
      console.error('Failed to initialize user context:', error);
    }
  }

  /**
   * Analyze content patterns from recent documents
   */
  async analyzeContentPatterns(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<ContentPattern[]> {
    try {
      const documents = await getAllDocuments();
      const recentDocuments = this.filterByTimeRange(documents, timeRange);
      
      const patterns: ContentPattern[] = [];
      
      // Extract topic patterns
      const topicPattern = await this.extractTopicPatterns(recentDocuments);
      patterns.push(topicPattern);
      
      // Extract interest patterns
      const interestPattern = await this.extractInterestPatterns(recentDocuments);
      patterns.push(interestPattern);
      
      // Extract temporal patterns
      const temporalPattern = await this.extractTemporalPatterns(recentDocuments);
      patterns.push(temporalPattern);
      
      // Extract behavioral patterns
      const behavioralPattern = await this.extractBehavioralPatterns(recentDocuments);
      patterns.push(behavioralPattern);
      
      // Store patterns
      patterns.forEach(pattern => {
        this.patterns.set(pattern.type, pattern);
      });return patterns;
      
    } catch (error) {
      console.error('Failed to analyze content patterns:', error);
      return [];
    }
  }

  /**
   * Extract topic patterns from documents
   */
  private async extractTopicPatterns(documents: any[]): Promise<ContentPattern> {
    const topics = new Map<string, number>();
    
    documents.forEach(doc => {
      // Extract topics from title and content
      const text = `${doc.title} ${doc.content}`.toLowerCase();
      
      // Simple topic extraction (could be enhanced with NLP)
      const commonTopics = [
        'ai', 'artificial intelligence', 'machine learning', 'development', 'programming',
        'technology', 'software', 'web', 'mobile', 'data', 'analytics', 'productivity',
        'design', 'user experience', 'business', 'marketing', 'finance', 'health',
        'education', 'research', 'science', 'engineering', 'music', 'audio', 'video',
        'photography', 'art', 'writing', 'reading', 'learning', 'growth', 'personal',
        'professional', 'career', 'project', 'work', 'home', 'family', 'travel'
      ];
      
      commonTopics.forEach(topic => {
        if (text.includes(topic)) {
          topics.set(topic, (topics.get(topic) || 0) + 1);
        }
      });
    });
    
    const sortedTopics = Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return {
      type: 'topic',
      data: sortedTopics,
      confidence: Math.min(sortedTopics.length / 10, 1),
      lastUpdated: Date.now()
    };
  }

  /**
   * Extract interest patterns with trends
   */
  private async extractInterestPatterns(documents: any[]): Promise<ContentPattern> {
    const interests = new Map<string, InterestPattern>();
    
    // Group documents by time periods
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
    
    const recentDocs = documents.filter(doc => doc.date_added && new Date(doc.date_added).getTime() > weekAgo);
    const olderDocs = documents.filter(doc => doc.date_added && 
      new Date(doc.date_added).getTime() > twoWeeksAgo && 
      new Date(doc.date_added).getTime() <= weekAgo);
    
    // Analyze interest trends
    const recentTopics = this.extractTopicsFromDocs(recentDocs);
    const olderTopics = this.extractTopicsFromDocs(olderDocs);
    
    // Calculate trends
    const allTopics = new Set([...recentTopics.keys(), ...olderTopics.keys()]);
    
    allTopics.forEach(topic => {
      const recentCount = recentTopics.get(topic) || 0;
      const olderCount = olderTopics.get(topic) || 0;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let changePercentage = 0;
      
      if (olderCount > 0) {
        changePercentage = ((recentCount - olderCount) / olderCount) * 100;
        if (changePercentage > 20) trend = 'increasing';
        else if (changePercentage < -20) trend = 'decreasing';
      } else if (recentCount > 0) {
        trend = 'increasing';
        changePercentage = 100;
      }
      
      interests.set(topic, {
        topic,
        trend,
        changePercentage,
        confidence: Math.min((recentCount + olderCount) / 10, 1),
        relatedContent: this.findRelatedContent(topic, documents)
      });
    });
    
    return {
      type: 'interest',
      data: Array.from(interests.values()),
      confidence: 0.8,
      lastUpdated: Date.now()
    };
  }

  /**
   * Extract temporal patterns
   */
  private async extractTemporalPatterns(documents: any[]): Promise<ContentPattern> {
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Array(7).fill(0);
    
    documents.forEach(doc => {
      if (doc.date_added) {
        const date = new Date(doc.date_added);
        const hour = date.getHours();
        const day = date.getDay();
        
        hourlyActivity[hour]++;
        dailyActivity[day]++;
      }
    });
    
    return {
      type: 'temporal',
      data: {
        hourlyActivity,
        dailyActivity,
        peakHours: this.findPeakHours(hourlyActivity),
        peakDays: this.findPeakDays(dailyActivity)
      },
      confidence: 0.7,
      lastUpdated: Date.now()
    };
  }

  /**
   * Extract behavioral patterns
   */
  private async extractBehavioralPatterns(documents: any[]): Promise<ContentPattern> {
    const behaviors = {
      contentTypes: new Map<string, number>(),
      sources: new Map<string, number>(),
      engagement: {
        averageContentLength: 0,
        processingRate: 0,
        retentionRate: 0
      }
    };
    
    documents.forEach(doc => {
      // Content type analysis
      behaviors.contentTypes.set(doc.type, (behaviors.contentTypes.get(doc.type) || 0) + 1);
      
      // Source analysis
      if (doc.url) {
        try {
          const domain = new URL(doc.url).hostname;
          behaviors.sources.set(domain, (behaviors.sources.get(domain) || 0) + 1);
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
    
    // Calculate engagement metrics
    const totalLength = documents.reduce((sum, doc) => sum + (doc.content?.length || 0), 0);
    behaviors.engagement.averageContentLength = totalLength / documents.length;
    
    return {
      type: 'behavioral',
      data: behaviors,
      confidence: 0.6,
      lastUpdated: Date.now()
    };
  }

  /**
   * Generate daily snapshot
   */
  async generateDailySnapshot(): Promise<DailySnapshot> {
    try {
      const documents = await getAllDocuments();
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      
      // Filter today's content
      const todayDocs = documents.filter(doc => {
        const docDate = new Date(doc.date_added).getTime();
        return docDate >= todayStart;
      });
      
      // Count content by type
      const contentAdded = {
        urls: todayDocs.filter(doc => doc.type === 'url').length,
        notes: todayDocs.filter(doc => doc.type === 'note').length,
        audio: todayDocs.filter(doc => doc.type === 'audio').length,
        images: todayDocs.filter(doc => doc.type === 'image').length,
        files: todayDocs.filter(doc => doc.type === 'file').length
      };
      
      // Generate learning insights
      const learningInsights = await this.generateLearningInsights(todayDocs);
      
      // Generate proactive discoveries
      const proactiveDiscoveries = await this.generateProactiveDiscoveries();
      
      // Analyze interest patterns
      const interestPatterns = await this.analyzeInterestPatterns(todayDocs);
      
      // Calculate learning progress
      const learningProgress = await this.calculateLearningProgress();
      
      // Generate summary
      const summary = await this.generateDailySummary(contentAdded, learningInsights);
      
      const snapshot: DailySnapshot = {
        id: uuidv4(),
        date: today.toISOString().split('T')[0],
        contentAdded,
        learningInsights,
        proactiveDiscoveries,
        interestPatterns,
        agentLearningProgress: learningProgress,
        summary
      };return snapshot;
      
    } catch (error) {
      console.error('Failed to generate daily snapshot:', error);
      throw error;
    }
  }

  /**
   * Generate learning insights using AI
   */
  private async generateLearningInsights(documents: any[]): Promise<string[]> {
    if (!featureFlags.isEnabled('rules_engine')) {
      return ['Learning insights require Rules Engine to be enabled'];
    }
    
    try {
      const prompt = `
      Analyze these documents added today and provide 3-5 learning insights about the user's interests and patterns:
      
      Documents: ${documents.map(doc => `${doc.type}: ${doc.title}`).join(', ')}
      
      Provide insights in a conversational, helpful tone that helps the user understand their learning patterns.
      `;
      
      const response = await secureApi.callLlm(prompt);
      return response.split('\n').filter((line: string) => line.trim().length > 0);
      
    } catch (error) {
      console.error('Failed to generate learning insights:', error);
      return ['Unable to generate learning insights at this time'];
    }
  }

  /**
   * Generate proactive discoveries based on patterns
   */
  private async generateProactiveDiscoveries(): Promise<Discovery[]> {
    try {
      const patterns = await this.analyzeContentPatterns('week');
      const discoveries: Discovery[] = [];
      
      // Extract keywords from patterns
      const keywords = this.extractKeywordsFromPatterns(patterns);
      
      // Generate discoveries based on keywords
      for (const keyword of keywords.slice(0, 3)) {
        const discovery = await this.createDiscovery(keyword);
        if (discovery) {
          discoveries.push(discovery);
        }
      }
      
      return discoveries;
      
    } catch (error) {
      console.error('Failed to generate proactive discoveries:', error);
      return [];
    }
  }

  /**
   * Create a discovery based on a keyword
   */
  private async createDiscovery(keyword: string): Promise<Discovery | null> {
    try {
      // This would typically search external APIs or databases
      // For now, we'll create mock discoveries
      const mockDiscoveries = [
        {
          title: `Latest ${keyword} developments`,
          description: `Recent advances and trends in ${keyword}`,
          url: `https://example.com/${keyword}`,
          source: 'Example Source',
          category: 'article' as const,
          reason: `Based on your interest in ${keyword}`
        }
      ];
      
      const discovery = mockDiscoveries[0];
      
      return {
        id: uuidv4(),
        title: discovery.title,
        description: discovery.description,
        url: discovery.url,
        source: discovery.source,
        relevanceScore: 0.8,
        category: discovery.category,
        discoveredAt: Date.now(),
        reason: discovery.reason
      };
      
    } catch (error) {
      console.error('Failed to create discovery:', error);
      return null;
    }
  }

  /**
   * Analyze interest patterns
   */
  private async analyzeInterestPatterns(documents: any[]): Promise<InterestPattern[]> {
    const patterns = await this.extractInterestPatterns(documents);
    return patterns.data as InterestPattern[];
  }

  /**
   * Calculate learning progress
   */
  private async calculateLearningProgress(): Promise<any> {
    return {
      totalContentProcessed: this.patterns.size,
      patternsLearned: this.patterns.size,
      accuracyScore: 0.8,
      recentImprovements: ['Better topic recognition', 'Improved interest tracking'],
      nextLearningGoals: ['Enhanced content analysis', 'Better discovery recommendations']
    };
  }

  /**
   * Generate daily summary
   */
  private async generateDailySummary(contentAdded: any, learningInsights: string[]): Promise<string> {
    const totalContent = Object.values(contentAdded).reduce((sum: number, count: any) => sum + count, 0);
    
    if (totalContent === 0) {
      return "No new content added today. The agent is ready to learn from new information when you add it.";
    }
    
    const contentTypes = Object.entries(contentAdded)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
    
    return `You've added ${totalContent} items today (${contentTypes}). The agent has identified new learning patterns and is ready to help you discover relevant content.`;
  }

  /**
   * Extract user context from documents
   */
  private async extractUserContext(documents: any[]): Promise<UserContext> {
    const topics = await this.extractTopicPatterns(documents);
    const interests = Array.from(topics.data as [string, number][]).map(([topic]) => topic);
    
    return {
      interests,
      recentActivity: documents.slice(0, 10).map(doc => doc.title),
      currentProjects: ['LOS Development', 'Library Autonomy'],
      learningGoals: ['AI Development', 'Productivity Systems'],
      preferences: {
        contentTypes: ['url', 'note', 'file'],
        sources: ['medium.com', 'github.com', 'stackoverflow.com'],
        languages: ['en']
      }
    };
  }

  /**
   * Helper methods
   */
  private filterByTimeRange(documents: any[], timeRange: string): any[] {
    const now = Date.now();
    const timeRanges = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - timeRanges[timeRange as keyof typeof timeRanges];
    
    return documents.filter(doc => {
      const docDate = new Date(doc.date_added).getTime();
      return docDate >= cutoff;
    });
  }

  private extractTopicsFromDocs(documents: any[]): Map<string, number> {
    const topics = new Map<string, number>();
    
    documents.forEach(doc => {
      const text = `${doc.title} ${doc.content}`.toLowerCase();
      const commonTopics = ['ai', 'development', 'technology', 'programming', 'design', 'business'];
      
      commonTopics.forEach(topic => {
        if (text.includes(topic)) {
          topics.set(topic, (topics.get(topic) || 0) + 1);
        }
      });
    });
    
    return topics;
  }

  private findRelatedContent(topic: string, documents: any[]): string[] {
    return documents
      .filter(doc => doc.title.toLowerCase().includes(topic) || doc.content.toLowerCase().includes(topic))
      .slice(0, 3)
      .map(doc => doc.title);
  }

  private findPeakHours(hourlyActivity: number[]): number[] {
    const maxActivity = Math.max(...hourlyActivity);
    return hourlyActivity
      .map((activity, hour) => ({ hour, activity }))
      .filter(item => item.activity >= maxActivity * 0.8)
      .map(item => item.hour);
  }

  private findPeakDays(dailyActivity: number[]): number[] {
    const maxActivity = Math.max(...dailyActivity);
    return dailyActivity
      .map((activity, day) => ({ day, activity }))
      .filter(item => item.activity >= maxActivity * 0.8)
      .map(item => item.day);
  }

  private extractKeywordsFromPatterns(patterns: ContentPattern[]): string[] {
    const keywords: string[] = [];
    
    patterns.forEach(pattern => {
      if (pattern.type === 'topic') {
        const topics = pattern.data as [string, number][];
        keywords.push(...topics.slice(0, 3).map(([topic]) => topic));
      }
    });
    
    return [...new Set(keywords)];
  }

  /**
   * Get current user context
   */
  getUserContext(): UserContext | null {
    return this.userContext;
  }

  /**
   * Update user context
   */
  async updateUserContext(): Promise<void> {
    await this.initializeUserContext();
  }
}

// Global instance
export const contentPatternAnalyzer = new ContentPatternAnalyzer();
