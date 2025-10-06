/**
 * Library Dashboard - Main component for intelligent Library system
 * 
 * This component provides the main interface for the intelligent Library system
 * with teaching and discovery modes.
 */

import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Brain, 
  Search, 
  Calendar, 
  TrendingUp, 
  Lightbulb,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Download,
  Share,
  Archive,
  Trash2,
  CheckCircle,
  Clock
} from 'lucide-react';
import { contentPatternAnalyzer } from '../../services/contentPatternAnalyzer';
import { proactiveDiscoveryService } from '../../services/proactiveDiscovery';
import { featureFlags } from '../../services/foundation/featureFlags';
import type { 
  LibraryMode, 
  DailySnapshot, 
  Discovery, 
  RawContentItem,
  LibraryStats
} from '../../types/library';

interface LibraryDashboardProps {
  className?: string;
}

export function LibraryDashboard({ className = '' }: LibraryDashboardProps) {
  const [activeMode, setActiveMode] = useState<LibraryMode['id']>('overview');
  const [dailySnapshot, setDailySnapshot] = useState<DailySnapshot | null>(null);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [rawContent, setRawContent] = useState<RawContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<LibraryStats | null>(null);

  const libraryModes: LibraryMode[] = [
    {
      id: 'overview',
      name: 'Overview',
      description: 'Daily snapshot and insights',
      icon: '📊'
    },
    {
      id: 'teaching',
      name: 'Teaching',
      description: 'Teach the agent with raw content',
      icon: '🧠'
    },
    {
      id: 'discovery',
      name: 'Discovery',
      description: 'Proactive content discoveries',
      icon: '🔍'
    }
  ];

  useEffect(() => {
    if (!featureFlags.isEnabled('rules_engine')) {
      setIsLoading(false);
      return;
    }

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load daily snapshot
      const snapshot = await contentPatternAnalyzer.generateDailySnapshot();
      setDailySnapshot(snapshot);
      
      // Load discoveries
      const newDiscoveries = await proactiveDiscoveryService.generateDailyDiscoveries();
      setDiscoveries(newDiscoveries);
      
      // Load raw content (mock for now)
      const mockRawContent = await generateMockRawContent();
      setRawContent(mockRawContent);
      
      // Load stats
      const mockStats = await generateMockStats();
      setStats(mockStats);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockRawContent = async (): Promise<RawContentItem[]> => {
    // Mock raw content for demonstration
    return [
      {
        id: '1',
        type: 'url',
        title: 'ESPN Sports Website',
        content: 'ESPN - Serving Sports Fans. Anytime. Anywhere.',
        url: 'https://espn.com',
        timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
        agentAnalysis: {
          summary: 'Sports news and analysis website with comprehensive coverage of major sports leagues.',
          relevanceScore: 0.8,
          userInterests: ['sports', 'nfl', 'fantasy'],
          keyInsights: ['Fantasy football resources', 'Injury reports', 'Player statistics'],
          actionRecommendation: 'keep'
        },
        teachingStatus: 'pending',
        thumbnail: 'https://via.placeholder.com/150x100/0066cc/ffffff?text=ESPN'
      },
      {
        id: '2',
        type: 'note',
        title: 'Growth Implementation Notes',
        content: 'Selection from Growth implementation status - Claude',
        timestamp: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
        agentAnalysis: {
          summary: 'Technical notes about LOS development and implementation progress.',
          relevanceScore: 0.9,
          userInterests: ['development', 'los', 'planning'],
          keyInsights: ['Phase 3 implementation', 'Event Bus integration', 'Check-In system'],
          actionRecommendation: 'keep'
        },
        teachingStatus: 'pending'
      }
    ];
  };

  const generateMockStats = async (): Promise<LibraryStats> => {
    return {
      totalContent: 39,
      contentByType: {
        url: 39,
        note: 0,
        audio: 0,
        image: 0,
        file: 0
      },
      teachingSessions: 5,
      discoveriesFound: 12,
      userEngagement: {
        averageSessionTime: 15,
        feedbackGiven: 8,
        discoveriesActedOn: 3
      },
      agentLearning: {
        patternsLearned: 15,
        accuracyImprovement: 0.2,
        lastLearningUpdate: Date.now()
      }
    };
  };

  const handleDiscoveryAction = (discoveryId: string, action: Discovery['userAction']) => {
    proactiveDiscoveryService.updateDiscoveryAction(discoveryId, action);
    setDiscoveries(prev => 
      prev.map(d => d.id === discoveryId ? { ...d, userAction: action } : d)
    );
  };

  const handleTeachingFeedback = (contentId: string, rating: 'important' | 'neutral' | 'irrelevant') => {
    setRawContent(prev => 
      prev.map(item => 
        item.id === contentId 
          ? { ...item, teachingStatus: 'taught' }
          : item
      )
    );};

  if (!featureFlags.isEnabled('rules_engine')) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Intelligent Library</h2>
          <p className="text-text-secondary">The intelligent Library system requires Rules Engine to be enabled.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-accent-white animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading intelligent Library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full bg-bg-primary ${className}`}>
      {/* Header */}
      <div className="border-b border-border-primary p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Knowledge Library</h1>
            <p className="text-text-secondary">Intelligent content management and discovery</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={loadDashboardData}
              className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-text-primary" />
            </button>
            
            <button className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors">
              <Settings className="w-5 h-5 text-text-primary" />
            </button>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="border-b border-border-primary">
        <div className="flex space-x-8 px-6">
          {libraryModes.map(mode => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`py-4 px-2 border-b-2 transition-colors ${
                activeMode === mode.id
                  ? 'border-accent-white text-accent-white'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="mr-2">{mode.icon}</span>
              {mode.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeMode === 'overview' && dailySnapshot && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Daily Snapshot - Single Pane */}
            <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">
                  📅 Today's Knowledge Snapshot
                </h2>
                <span className="text-sm text-text-secondary">{dailySnapshot.date}</span>
              </div>
              
              {/* LOS Learning Summary */}
              <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <h3 className="font-medium mb-2">[BOT] LOS Learning Summary:</h3>
                <p className="text-sm">{dailySnapshot.summary}</p>
              </div>
              
              {/* Content Added Today */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-text-primary mb-3">📊 Content Added Today:</h3>
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(dailySnapshot.contentAdded).map(([type, count]) => (
                    <div key={type} className="text-center p-3 rounded-lg bg-bg-tertiary">
                      <div className="text-2xl font-bold text-text-primary">{count}</div>
                      <div className="text-xs text-text-secondary capitalize">{type}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Proactive Discoveries */}
              {dailySnapshot.proactiveDiscoveries.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-3">🔍 Proactive Discoveries:</h3>
                  <div className="space-y-3">
                    {dailySnapshot.proactiveDiscoveries.slice(0, 3).map(discovery => (
                      <div key={discovery.id} className="flex items-center justify-between p-4 rounded-lg bg-bg-tertiary border border-border-primary">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-text-primary">{discovery.title}</h4>
                          <p className="text-xs text-text-secondary mt-1">{discovery.reason}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleDiscoveryAction(discovery.id, 'saved')}
                            className="px-4 py-2 text-xs font-medium bg-bg-primary hover:bg-bg-hover text-text-primary border border-border-primary rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleDiscoveryAction(discovery.id, 'not_relevant')}
                            className="px-4 py-2 text-xs font-medium bg-bg-primary hover:bg-bg-hover text-text-secondary border border-border-primary rounded-lg transition-colors"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Stats Overview - Inline */}
              {stats && (
                <div className="mt-6 pt-6 border-t border-border-primary">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-text-primary">{stats.totalContent}</div>
                      <div className="text-xs text-text-secondary">Total Content</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-text-primary">{stats.discoveriesFound}</div>
                      <div className="text-xs text-text-secondary">Discoveries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-text-primary">{stats.agentLearning.patternsLearned}</div>
                      <div className="text-xs text-text-secondary">Patterns Learned</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeMode === 'teaching' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">🧠 Teaching Mode</h2>
              <div className="text-sm text-text-secondary">
                {rawContent.filter(item => item.teachingStatus === 'pending').length} items pending
              </div>
            </div>
            
            {rawContent.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary">No content to teach the agent</p>
              </div>
            ) : (
              rawContent.map(item => (
                <div key={item.id} className="bg-bg-secondary rounded-lg border border-border-primary p-6">
                  <div className="flex items-start space-x-6">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {item.thumbnail ? (
                        <img 
                          src={item.thumbnail} 
                          alt={item.title}
                          className="w-20 h-16 object-cover rounded-lg border border-border-primary"
                        />
                      ) : (
                        <div className="w-20 h-16 bg-bg-tertiary rounded-lg border border-border-primary flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-text-secondary" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-text-primary mb-2">{item.title}</h3>
                      <p className="text-sm text-text-secondary mb-4 line-clamp-2">{item.content}</p>
                      
                      <div className="mb-4 p-4 rounded-lg bg-bg-tertiary border border-border-primary">
                        <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center">
                          <Brain className="w-4 h-4 mr-2" />
                          Agent Analysis
                        </h4>
                        <p className="text-sm text-text-secondary mb-3">{item.agentAnalysis.summary}</p>
                        <div className="flex items-center space-x-4 text-xs text-text-tertiary">
                          <span>Relevance: {Math.round(item.agentAnalysis.relevanceScore * 100)}%</span>
                          <span>•</span>
                          <span>Recommendation: {item.agentAnalysis.actionRecommendation}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleTeachingFeedback(item.id, 'important')}
                          className="px-4 py-2 text-sm font-medium bg-bg-primary hover:bg-bg-hover text-text-primary border border-border-primary rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Important</span>
                        </button>
                        <button
                          onClick={() => handleTeachingFeedback(item.id, 'neutral')}
                          className="px-4 py-2 text-sm font-medium bg-bg-primary hover:bg-bg-hover text-text-secondary border border-border-primary rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Neutral</span>
                        </button>
                        <button
                          onClick={() => handleTeachingFeedback(item.id, 'irrelevant')}
                          className="px-4 py-2 text-sm font-medium bg-bg-primary hover:bg-bg-hover text-text-secondary border border-border-primary rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Irrelevant</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeMode === 'discovery' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">🔍 Discovery Mode</h2>
              <div className="text-sm text-text-secondary">
                {discoveries.length} discoveries found
              </div>
            </div>
            
            {discoveries.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary">No discoveries found yet</p>
                <button
                  onClick={loadDashboardData}
                  className="mt-4 px-4 py-2 bg-bg-primary hover:bg-bg-hover text-text-primary border border-border-primary rounded-lg transition-colors"
                >
                  Refresh Discoveries
                </button>
              </div>
            ) : (
              discoveries.map(discovery => (
                <div key={discovery.id} className="bg-bg-secondary rounded-lg border border-border-primary p-6">
                  <div className="flex items-start space-x-6">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-16 bg-bg-tertiary rounded-lg border border-border-primary flex items-center justify-center relative">
                        <BookOpen className="w-8 h-8 text-text-secondary" />
                        {/* Recommended Badge for High Priority */}
                        {discovery.relevanceScore > 0.8 && (
                          <div className="absolute -top-2 -right-2 bg-accent-white text-bg-primary text-xs font-bold px-2 py-1 rounded-full">
                            ⭐
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-medium text-text-primary">{discovery.title}</h3>
                        {discovery.relevanceScore > 0.8 && (
                          <span className="text-xs font-medium text-accent-white bg-accent-white/10 px-2 py-1 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-text-secondary mb-3">{discovery.description}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-text-tertiary mb-4">
                        <span>Source: {discovery.source}</span>
                        <span>•</span>
                        <span>Relevance: {Math.round(discovery.relevanceScore * 100)}%</span>
                        <span>•</span>
                        <span>Category: {discovery.category}</span>
                      </div>
                      
                      <p className="text-xs text-text-tertiary mb-4">{discovery.reason}</p>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleDiscoveryAction(discovery.id, 'saved')}
                          className="px-4 py-2 text-sm font-medium bg-bg-primary hover:bg-bg-hover text-text-primary border border-border-primary rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => handleDiscoveryAction(discovery.id, 'read_later')}
                          className="px-4 py-2 text-sm font-medium bg-bg-primary hover:bg-bg-hover text-text-secondary border border-border-primary rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Read Later</span>
                        </button>
                        <button
                          onClick={() => handleDiscoveryAction(discovery.id, 'not_relevant')}
                          className="px-4 py-2 text-sm font-medium bg-bg-primary hover:bg-bg-hover text-text-secondary border border-border-primary rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Skip</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
