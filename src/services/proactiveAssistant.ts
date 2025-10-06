import { getAllDocuments, getAllFacts, getAllInterests, getGrowthMetrics } from './db';
import { GrowthService } from './growthService';

export interface ProactiveSuggestion {
  id: string;
  type: 'organize' | 'learn' | 'cleanup' | 'optimize' | 'discover';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: string;
  actionRequired: boolean;
  data?: any;
}

export class ProactiveAssistant {
  
  /**
   * Generate proactive suggestions based on current application state
   */
  static async generateSuggestions(): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];
    
    try {
      // Get current state
      const [documents, facts, interests, growth] = await Promise.all([
        getAllDocuments(),
        getAllFacts(),
        getAllInterests(),
        getGrowthMetrics()
      ]);
      
      // Generate suggestions based on patterns
      suggestions.push(...await this.generateOrganizationSuggestions(documents));
      suggestions.push(...await this.generateLearningSuggestions(documents, facts, interests));
      suggestions.push(...await this.generateCleanupSuggestions(documents));
      suggestions.push(...await this.generateOptimizationSuggestions(documents, growth));
      suggestions.push(...await this.generateDiscoverySuggestions(interests, documents));
      
      // Sort by priority and return top 5
      return suggestions
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .slice(0, 5);
        
    } catch (error) {
      console.error('Error generating proactive suggestions:', error);
      return [];
    }
  }
  
  /**
   * Organization suggestions based on document patterns
   */
  private static async generateOrganizationSuggestions(documents: any[]): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];
    
    // Check for untagged documents
    const untaggedDocs = documents.filter(doc => !doc.tags || doc.tags.length === 0);
    if (untaggedDocs.length > 3) {
      suggestions.push({
        id: 'organize-untagged',
        type: 'organize',
        title: 'Organize Untagged Documents',
        description: `You have ${untaggedDocs.length} documents without tags. Adding tags will make them easier to find and organize.`,
        priority: 'medium',
        estimatedTime: '5-10 minutes',
        actionRequired: true,
        data: { untaggedCount: untaggedDocs.length, documents: untaggedDocs.slice(0, 5) }
      });
    }
    
    // Check for duplicate titles
    const titleCounts: Record<string, number> = {};
    documents.forEach(doc => {
      titleCounts[doc.title] = (titleCounts[doc.title] || 0) + 1;
    });
    
    const duplicates = Object.entries(titleCounts).filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      suggestions.push({
        id: 'organize-duplicates',
        type: 'organize',
        title: 'Review Duplicate Documents',
        description: `Found ${duplicates.length} document titles that appear multiple times. You might want to merge or rename them.`,
        priority: 'high',
        estimatedTime: '10-15 minutes',
        actionRequired: true,
        data: { duplicates }
      });
    }
    
    // Check for large documents that could be split
    const largeDocs = documents.filter(doc => doc.content && doc.content.length > 5000);
    if (largeDocs.length > 0) {
      suggestions.push({
        id: 'organize-large-docs',
        type: 'organize',
        title: 'Split Large Documents',
        description: `You have ${largeDocs.length} documents with over 5000 characters. Consider splitting them into smaller, focused notes.`,
        priority: 'low',
        estimatedTime: '15-20 minutes',
        actionRequired: true,
        data: { largeDocs: largeDocs.slice(0, 3) }
      });
    }
    
    return suggestions;
  }
  
  /**
   * Learning suggestions based on content and interests
   */
  private static async generateLearningSuggestions(documents: any[], facts: any[], interests: any[]): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];
    
    // Check for learning gaps
    const topInterests = interests
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 3);
    
    for (const interest of topInterests) {
      const relatedDocs = documents.filter(doc => 
        doc.title.toLowerCase().includes(interest.name.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(interest.name.toLowerCase()))
      );
      
      if (relatedDocs.length < 3 && interest.engagement_score > 0.6) {
        suggestions.push({
          id: `learn-${interest.name}`,
          type: 'learn',
          title: `Deepen Your Knowledge of ${interest.name}`,
          description: `You're highly interested in ${interest.name} but only have ${relatedDocs.length} related documents. Consider adding more resources to build expertise.`,
          priority: 'medium',
          estimatedTime: '20-30 minutes',
          actionRequired: false,
          data: { interest: interest.name, currentDocs: relatedDocs.length }
        });
      }
    }
    
    // Check for recent learning patterns
    const recentDocs = documents
      .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())
      .slice(0, 10);
    
    const recentTopics = new Set<string>();
    recentDocs.forEach(doc => {
      doc.tags?.forEach(tag => recentTopics.add(tag));
    });
    
    if (recentTopics.size > 0) {
      suggestions.push({
        id: 'learn-recent-topics',
        type: 'learn',
        title: 'Create Study Plan for Recent Topics',
        description: `You've been learning about: ${Array.from(recentTopics).slice(0, 3).join(', ')}. I can create a structured study plan to help you master these topics.`,
        priority: 'medium',
        estimatedTime: '5 minutes',
        actionRequired: false,
        data: { topics: Array.from(recentTopics) }
      });
    }
    
    return suggestions;
  }
  
  /**
   * Cleanup suggestions based on old or unused content
   */
  private static async generateCleanupSuggestions(documents: any[]): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];
    
    // Check for old documents
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldDocs = documents.filter(doc => 
      new Date(doc.date_added) < thirtyDaysAgo
    );
    
    if (oldDocs.length > 10) {
      suggestions.push({
        id: 'cleanup-old-docs',
        type: 'cleanup',
        title: 'Review Old Documents',
        description: `You have ${oldDocs.length} documents older than 30 days. Consider archiving or deleting outdated content.`,
        priority: 'low',
        estimatedTime: '15-20 minutes',
        actionRequired: true,
        data: { oldDocs: oldDocs.slice(0, 5) }
      });
    }
    
    // Check for empty or very short documents
    const shortDocs = documents.filter(doc => 
      !doc.content || doc.content.trim().length < 50
    );
    
    if (shortDocs.length > 0) {
      suggestions.push({
        id: 'cleanup-short-docs',
        type: 'cleanup',
        title: 'Review Short Documents',
        description: `You have ${shortDocs.length} documents with very little content. Consider expanding them or removing incomplete notes.`,
        priority: 'medium',
        estimatedTime: '10-15 minutes',
        actionRequired: true,
        data: { shortDocs: shortDocs.slice(0, 5) }
      });
    }
    
    return suggestions;
  }
  
  /**
   * Optimization suggestions based on usage patterns
   */
  private static async generateOptimizationSuggestions(documents: any[], growth: any): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];
    
    // Check for growth opportunities
    if (growth.currentLevel < 10) {
      suggestions.push({
        id: 'optimize-growth',
        type: 'optimize',
        title: 'Accelerate Your Growth',
        description: `You're at level ${growth.currentLevel}. Here are some ways to level up faster and unlock new capabilities.`,
        priority: 'medium',
        estimatedTime: '5 minutes',
        actionRequired: false,
        data: { currentLevel: growth.currentLevel }
      });
    }
    
    // Check for tag optimization
    const allTags = new Set<string>();
    documents.forEach(doc => {
      doc.tags?.forEach(tag => allTags.add(tag));
    });
    
    if (allTags.size > 20) {
      suggestions.push({
        id: 'optimize-tags',
        type: 'optimize',
        title: 'Optimize Your Tag System',
        description: `You have ${allTags.size} different tags. Consider consolidating similar tags to improve organization.`,
        priority: 'low',
        estimatedTime: '10-15 minutes',
        actionRequired: true,
        data: { tagCount: allTags.size, tags: Array.from(allTags).slice(0, 10) }
      });
    }
    
    return suggestions;
  }
  
  /**
   * Discovery suggestions based on interests and content gaps
   */
  private static async generateDiscoverySuggestions(interests: any[], documents: any[]): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];
    
    // Check for interest expansion
    const topInterests = interests
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 2);
    
    for (const interest of topInterests) {
      if (interest.engagement_score > 0.7) {
        suggestions.push({
          id: `discover-${interest.name}`,
          type: 'discover',
          title: `Explore Related Topics to ${interest.name}`,
          description: `Since you're highly engaged with ${interest.name}, you might also enjoy exploring related topics and expanding your knowledge base.`,
          priority: 'low',
          estimatedTime: '15-30 minutes',
          actionRequired: false,
          data: { interest: interest.name }
        });
      }
    }
    
    // Check for content diversity
    const docTypes = new Set(documents.map(doc => doc.type));
    if (docTypes.size === 1) {
      suggestions.push({
        id: 'discover-content-types',
        type: 'discover',
        title: 'Diversify Your Content Types',
        description: `You only have ${docTypes.values().next().value} documents. Consider adding URLs, files, or different types of content to enrich your knowledge base.`,
        priority: 'medium',
        estimatedTime: '10-20 minutes',
        actionRequired: false,
        data: { currentType: docTypes.values().next().value }
      });
    }
    
    return suggestions;
  }
  
  /**
   * Execute a suggestion (if it has an action)
   */
  static async executeSuggestion(suggestion: ProactiveSuggestion): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      switch (suggestion.id) {
        case 'organize-untagged':
          return {
            success: true,
            message: `Found ${suggestion.data.untaggedCount} untagged documents. You can add tags to them in the Library.`,
            data: suggestion.data
          };
          
        case 'organize-duplicates':
          return {
            success: true,
            message: `Found ${suggestion.data.duplicates.length} duplicate titles. Review them in the Library to merge or rename.`,
            data: suggestion.data
          };
          
        case 'learn-recent-topics':
          return {
            success: true,
            message: `I can create a study plan for: ${suggestion.data.topics.slice(0, 3).join(', ')}. Would you like me to generate one?`,
            data: suggestion.data
          };
          
        default:
          return {
            success: true,
            message: `Suggestion "${suggestion.title}" is ready for your review.`,
            data: suggestion.data
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error executing suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
