import React from 'react';
import { MessageCircle, BookOpen, Brain, Calendar, Trophy, Target, Zap, TrendingUp, RotateCcw } from 'lucide-react';
import { useGrowthState } from '../../hooks/useGrowthState';
import { GrowthService } from '../../services/growthService';

const Growth: React.FC = () => {
  const { growthState, isLoading, error, refresh } = useGrowthState();

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset your growth progress to Level 1? This cannot be undone.')) {
      await GrowthService.resetGrowthMetrics();
      refresh();
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary text-lg">Loading growth data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Error loading growth data</div>
          <p className="text-text-secondary mb-4">{error}</p>
          <button 
            onClick={refresh}
            className="px-6 py-3 bg-bg-elevated border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!growthState) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center">
          <p className="text-text-secondary text-lg">No growth data available</p>
        </div>
      </div>
    );
  }

  const statsData = [
    {
      label: 'Messages',
      value: growthState.totalMessages,
      icon: MessageCircle,
      color: 'text-text-secondary',
    },
    {
      label: 'Documents',
      value: growthState.totalDocuments,
      icon: BookOpen,
      color: 'text-text-secondary',
    },
    {
      label: 'Conversations',
      value: growthState.totalConversations,
      icon: Brain,
      color: 'text-text-secondary',
    },
    {
      label: 'Days Active',
      value: growthState.daysActive,
      icon: Calendar,
      color: 'text-text-secondary',
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-heading-1 mb-3">Growth Dashboard</h1>
        <p className="text-text-secondary text-lg">Track your learning journey and watch yourself evolve</p>
        
        {/* Debug Reset Button */}
        <div className="mt-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2 mx-auto transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Level 1 (Debug)
          </button>
        </div>
      </div>

      {/* Current Stage Display */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-bg-secondary to-bg-elevated p-12 text-text-primary border border-border-primary shadow-premium-lg`}>
        <div className="relative z-10 text-center">
          <div className="text-9xl mb-6 animate-pulse-subtle">{growthState.stage.icon}</div>
          <h2 className="text-heading-1 mb-3">{growthState.stage.name}</h2>
          <div className="text-body text-text-secondary mb-6 font-medium">Level {growthState.level}</div>
          <p className="text-body text-text-secondary max-w-2xl mx-auto leading-relaxed">{growthState.stage.description}</p>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute top-8 right-8 w-40 h-40 bg-accent-glow rounded-full opacity-5"></div>
        <div className="absolute bottom-8 left-8 w-32 h-32 bg-accent-glow rounded-full opacity-3"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-accent-glow rounded-full opacity-2"></div>
      </div>

      {/* XP Progress Section */}
      <div className="card p-8">
        <div className="flex items-center mb-6">
          <Zap className="w-6 h-6 text-text-secondary mr-3" />
          <h3 className="text-heading-3">Experience Progress</h3>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-body text-text-primary font-medium">Level {growthState.level + 1}</span>
            <span className="text-text-secondary font-medium">{Math.round(growthState.progress * 100)}%</span>
          </div>
          
          <div className="w-full bg-bg-elevated rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-text-secondary to-text-primary rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${growthState.progress * 100}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-text-tertiary mt-2">
            <span>{growthState.currentXP} XP</span>
            <span>{growthState.xpForNextLevel} XP needed</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="card p-8 card-interactive">
              <div className="flex items-center justify-between mb-6">
                <IconComponent className={`w-8 h-8 ${stat.color}`} />
                <div className={`text-4xl font-bold text-text-primary`}>{stat.value}</div>
              </div>
              <div className="text-text-secondary font-medium">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Streak Section */}
      <div className="card p-8">
        <div className="flex items-center mb-6">
          <TrendingUp className="w-6 h-6 text-text-secondary mr-3" />
          <h3 className="text-heading-3">Activity Streak</h3>
        </div>
        
        <div className="text-center">
          <div className="text-6xl mb-4">🔥</div>
          <div className="text-4xl font-bold text-text-primary mb-2">{growthState.currentStreak}</div>
          <div className="text-text-secondary">Days in a row</div>
        </div>
      </div>

      {/* Recent Milestones */}
      <div className="card p-8">
        <div className="flex items-center mb-6">
          <Trophy className="w-6 h-6 text-text-secondary mr-3" />
          <h3 className="text-heading-3">Recent Achievements</h3>
        </div>
        
        {growthState.recentMilestones.length > 0 ? (
          <div className="space-y-4">
            {growthState.recentMilestones.map((milestone) => (
              <div key={milestone.id} className="flex items-start gap-4 p-4 bg-bg-elevated rounded-lg">
                <div className="text-3xl">🏆</div>
                <div className="flex-1">
                  <div className="font-medium text-text-primary mb-1">{milestone.title}</div>
                  <div className="text-sm text-text-secondary mb-2">{milestone.description}</div>
                  <div className="text-xs text-text-tertiary">+{milestone.xpReward} XP</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-8xl mb-6 opacity-20">🏆</div>
            <p className="text-text-secondary text-lg mb-3">No milestones yet</p>
            <p className="text-text-tertiary">
              Start chatting and saving documents to unlock your first milestone!
            </p>
          </div>
        )}
      </div>

      {/* Growth Stages Preview */}
      <div className="card p-8">
        <h3 className="text-heading-3 mb-8">Growth Journey</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Newborn', icon: '🥚', level: '1-5' },
            { name: 'Infant', icon: '🐣', level: '6-15' },
            { name: 'Toddler', icon: '🐤', level: '16-30' },
            { name: 'Child', icon: '🐥', level: '31-50' },
            { name: 'Adolescent', icon: '🦅', level: '51-75' },
            { name: 'Adult', icon: '🦉', level: '76-100' },
            { name: 'Sage', icon: '🧙', level: '101+' },
          ].map((stage, index) => (
            <div 
              key={stage.name}
              className={`text-center p-6 rounded-xl transition-all duration-300 card-interactive ${
                stage.name === growthState.stage.name 
                  ? 'bg-bg-elevated border-2 border-text-primary text-text-primary' 
                  : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="text-4xl mb-3">{stage.icon}</div>
              <div className="text-caption mb-2">{stage.name}</div>
              <div className="text-xs text-text-tertiary">Level {stage.level}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Growth;
