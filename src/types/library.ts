/**
 * Intelligent Library Types - Type definitions for teaching and discovery modes
 * 
 * This file contains all the type definitions for the intelligent Library system,
 * including daily snapshots, teaching feedback, and proactive discoveries.
 */

export interface DailySnapshot {
  id: string;
  date: string;
  contentAdded: {
    urls: number;
    notes: number;
    audio: number;
    images: number;
    files: number;
  };
  learningInsights: string[];
  proactiveDiscoveries: Discovery[];
  interestPatterns: InterestPattern[];
  agentLearningProgress: LearningProgress;
  summary: string;
}

export interface Discovery {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  relevanceScore: number;
  category: 'article' | 'tutorial' | 'product' | 'news' | 'research';
  thumbnail?: string;
  userAction?: 'saved' | 'read_later' | 'not_relevant' | 'pending';
  discoveredAt: number;
  reason: string; // Why this was discovered
}

export interface InterestPattern {
  topic: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  confidence: number;
  relatedContent: string[];
}

export interface LearningProgress {
  totalContentProcessed: number;
  patternsLearned: number;
  accuracyScore: number;
  recentImprovements: string[];
  nextLearningGoals: string[];
}

export interface TeachingFeedback {
  contentId: string;
  userRating: 'important' | 'neutral' | 'irrelevant';
  userComment?: string;
  agentLearning: {
    pattern: string;
    confidence: number;
    adjustment: string;
  };
  timestamp: number;
}

export interface RawContentItem {
  id: string;
  type: 'url' | 'note' | 'audio' | 'image' | 'file';
  title: string;
  content: string;
  url?: string;
  timestamp: number;
  agentAnalysis: {
    summary: string;
    relevanceScore: number;
    userInterests: string[];
    keyInsights: string[];
    actionRecommendation: 'keep' | 'archive' | 'delete' | 'review';
  };
  teachingStatus: 'pending' | 'taught' | 'ignored';
  thumbnail?: string;
}

export interface ContentPattern {
  type: 'topic' | 'interest' | 'temporal' | 'behavioral';
  data: any;
  confidence: number;
  lastUpdated: number;
}

export interface ProactiveSearchQuery {
  keywords: string[];
  categories: string[];
  timeRange: 'today' | 'week' | 'month';
  maxResults: number;
  userContext: UserContext;
}

export interface UserContext {
  interests: string[];
  recentActivity: string[];
  currentProjects: string[];
  learningGoals: string[];
  preferences: {
    contentTypes: string[];
    sources: string[];
    languages: string[];
  };
}

export interface LibraryMode {
  id: 'overview' | 'teaching' | 'discovery';
  name: string;
  description: string;
  icon: string;
}

export interface TeachingSession {
  id: string;
  startTime: number;
  endTime?: number;
  contentItems: RawContentItem[];
  feedbackGiven: TeachingFeedback[];
  learningOutcomes: string[];
  agentImprovements: string[];
}

export interface DiscoverySession {
  id: string;
  date: string;
  discoveries: Discovery[];
  userActions: Array<{
    discoveryId: string;
    action: 'saved' | 'read_later' | 'not_relevant';
    timestamp: number;
  }>;
  effectivenessScore: number;
}

export interface LibraryStats {
  totalContent: number;
  contentByType: Record<string, number>;
  teachingSessions: number;
  discoveriesFound: number;
  userEngagement: {
    averageSessionTime: number;
    feedbackGiven: number;
    discoveriesActedOn: number;
  };
  agentLearning: {
    patternsLearned: number;
    accuracyImprovement: number;
    lastLearningUpdate: number;
  };
}

export interface ContentAnalysis {
  id: string;
  contentId: string;
  analysis: {
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    complexity: 'simple' | 'moderate' | 'complex';
    relevance: number;
    keyInsights: string[];
  };
  agentInsights: {
    userInterestAlignment: number;
    projectRelevance: number;
    learningValue: number;
    actionRecommendation: string;
  };
  timestamp: number;
}

export interface LibraryFilter {
  mode: LibraryMode['id'];
  timeRange?: 'today' | 'week' | 'month' | 'all';
  contentType?: string[];
  relevance?: 'high' | 'medium' | 'low' | 'all';
  status?: 'pending' | 'processed' | 'all';
}

export interface LibrarySearchQuery {
  query: string;
  mode: LibraryMode['id'];
  filters?: LibraryFilter;
  includeAnalysis?: boolean;
  limit?: number;
}

export interface LibrarySearchResult {
  item: RawContentItem | Discovery;
  relevanceScore: number;
  matchedFields: string[];
  analysis?: ContentAnalysis;
}

// Export types for external use
export type LibraryModeType = LibraryMode['id'];
export type TeachingRating = TeachingFeedback['userRating'];
export type DiscoveryCategory = Discovery['category'];
export type ContentType = RawContentItem['type'];
export type UserAction = Discovery['userAction'];
