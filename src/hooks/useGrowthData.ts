import { useState, useEffect } from 'react';
import { GrowthData, mockGrowthData as initialData, growthStages } from '../types/growth';

export const useGrowthData = () => {
  const [growthData, setGrowthData] = useState<GrowthData>(initialData);

  // Load from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('los-growth-data');
      if (saved) {
        setGrowthData(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load growth data:', error);
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem('los-growth-data', JSON.stringify(growthData));
    } catch (error) {
      console.error('Failed to save growth data:', error);
    }
  }, [growthData]);

  const updateStats = (updates: Partial<GrowthData['stats']>) => {
    setGrowthData(prev => ({
      ...prev,
      stats: { ...prev.stats, ...updates }
    }));
  };

  const addConversation = () => {
    setGrowthData(prev => {
      const newConversations = prev.stats.conversations + 1;
      const currentStageIndex = growthStages.findIndex(stage => stage.id === prev.currentStage.id);
      const nextStage = growthStages[currentStageIndex + 1];
      
      if (nextStage && newConversations >= nextStage.requiredConversations) {
        // Level up!
        const progressToNext = 100;
        const milestonesToNext = 0;
        
        return {
          ...prev,
          stats: { ...prev.stats, conversations: newConversations },
          currentStage: nextStage,
          progressToNext,
          nextMilestone: growthStages[currentStageIndex + 2]?.name || 'Max Level',
          milestonesToNext,
        };
      } else {
        // Calculate progress to next stage
        const progressToNext = nextStage 
          ? Math.min(100, (newConversations / nextStage.requiredConversations) * 100)
          : 100;
        const milestonesToNext = nextStage 
          ? Math.max(0, nextStage.requiredConversations - newConversations)
          : 0;
        
        return {
          ...prev,
          stats: { ...prev.stats, conversations: newConversations },
          progressToNext,
          milestonesToNext,
        };
      }
    });
  };

  const resetData = () => {
    setGrowthData(initialData);
  };

  return {
    growthData,
    updateStats,
    addConversation,
    resetData,
  };
};
