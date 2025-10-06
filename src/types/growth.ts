export interface GrowthStage {
  id: string;
  name: string;
  level: number;
  description: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  requiredConversations: number;
}

export interface GrowthStats {
  conversations: number;
  articlesSaved: number;
  factsLearned: number;
  daysActive: number;
}

export interface GrowthData {
  currentStage: GrowthStage;
  stats: GrowthStats;
  progressToNext: number; // percentage
  nextMilestone: string;
  milestonesToNext: number;
}

export const growthStages: GrowthStage[] = [
  {
    id: 'newborn',
    name: 'Newborn',
    level: 1,
    description: 'Just beginning your learning journey. Every conversation helps you grow.',
    icon: '🥚',
    color: 'text-blue-400',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-blue-600',
    requiredConversations: 0,
  },
  {
    id: 'infant',
    name: 'Infant',
    level: 2,
    description: 'Starting to recognize patterns and build basic understanding.',
    icon: '🐣',
    color: 'text-green-400',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-green-600',
    requiredConversations: 10,
  },
  {
    id: 'toddler',
    name: 'Toddler',
    level: 3,
    description: 'Curious and exploring, asking questions and making connections.',
    icon: '🐤',
    color: 'text-yellow-400',
    gradientFrom: 'from-yellow-500',
    gradientTo: 'to-yellow-600',
    requiredConversations: 25,
  },
  {
    id: 'child',
    name: 'Child',
    level: 4,
    description: 'Developing deeper understanding and forming complex thoughts.',
    icon: '🐥',
    color: 'text-purple-400',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-purple-600',
    requiredConversations: 50,
  },
  {
    id: 'teen',
    name: 'Teen',
    level: 5,
    description: 'Independent thinking and forming your own perspectives.',
    icon: '🦅',
    color: 'text-orange-400',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-orange-600',
    requiredConversations: 100,
  },
  {
    id: 'adult',
    name: 'Adult',
    level: 6,
    description: 'Mature understanding with wisdom and experience.',
    icon: '🦉',
    color: 'text-indigo-400',
    gradientFrom: 'from-indigo-500',
    gradientTo: 'to-indigo-600',
    requiredConversations: 200,
  },
];

export const mockGrowthData: GrowthData = {
  currentStage: growthStages[0], // Newborn
  stats: {
    conversations: 0,
    articlesSaved: 0,
    factsLearned: 0,
    daysActive: 0,
  },
  progressToNext: 0,
  nextMilestone: 'Infant',
  milestonesToNext: 10,
};
