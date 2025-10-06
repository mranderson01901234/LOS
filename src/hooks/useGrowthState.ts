import { useState, useEffect } from 'react';
import { GrowthService } from '../services/growthService';

export interface GrowthState {
  level: number;
  stage: {
    name: string;
    description: string;
    minLevel: number;
    maxLevel: number;
    icon: string;
  };
  currentXP: number;
  xpForNextLevel: number;
  progress: number; // 0-1
  totalMessages: number;
  totalDocuments: number;
  totalConversations: number;
  daysActive: number;
  currentStreak: number;
  recentMilestones: Array<{
    id: string;
    category: 'conversation' | 'knowledge' | 'relationship' | 'learning';
    title: string;
    description: string;
    xpReward: number;
    achievedAt?: number;
  }>;
}

export function useGrowthState() {
  const [growthState, setGrowthState] = useState<GrowthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGrowthState = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const state = await GrowthService.getGrowthState();
      setGrowthState(state);
    } catch (err) {
      console.error('Failed to load growth state:', err);
      setError(err instanceof Error ? err.message : 'Failed to load growth data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGrowthState();
    
    // Refresh every 30 seconds to catch updates
    const interval = setInterval(loadGrowthState, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    growthState,
    isLoading,
    error,
    refresh: loadGrowthState
  };
}
