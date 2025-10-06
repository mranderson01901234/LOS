import { initDB } from './db';
import type { GrowthMetrics, Milestone } from '../types/database';

export class GrowthService {
  
  // Award XP and check for level ups
  static async awardXP(amount: number, reason: string): Promise<{
    leveledUp: boolean;
    oldLevel: number;
    newLevel: number;
    newMilestones: Milestone[];
  }> {
    const db = await initDB();
    const metrics = await db.get('growth_metrics', 'current');
    if (!metrics) throw new Error('Growth metrics not initialized');
    
    const oldLevel = metrics.currentLevel;
    const newTotalXP = metrics.totalXP + amount;
    
    // Calculate new level
    let newLevel = oldLevel;
    while (newTotalXP >= this.totalXpForLevel(newLevel + 1)) {
      newLevel++;
    }
    
    const currentXP = newTotalXP - this.totalXpForLevel(newLevel);
    const xpForNextLevel = this.xpForLevel(newLevel + 1);
    
    // Update metrics
    await db.put('growth_metrics', {
      ...metrics,
      currentLevel: newLevel,
      currentXP: currentXP,
      totalXP: newTotalXP,
      lastLevelUp: newLevel > oldLevel ? Date.now() : metrics.lastLevelUp
    });// Check for newly achieved milestones
    const newMilestones = await this.checkMilestones();
    
    return {
      leveledUp: newLevel > oldLevel,
      oldLevel,
      newLevel,
      newMilestones
    };
  }
  
  // Track message sent
  static async trackMessage(): Promise<{
    leveledUp: boolean;
    oldLevel: number;
    newLevel: number;
    newMilestones: any[];
  }> {
    const db = await initDB();
    const metrics = await db.get('growth_metrics', 'current');
    if (!metrics) {
      return {
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        newMilestones: []
      };
    }
    
    // Update streak
    await this.updateStreak();
    
    // Update message count
    const newMessageCount = metrics.totalMessages + 1;
    await db.put('growth_metrics', {
      ...metrics,
      totalMessages: newMessageCount
    });
    
    // Award XP
    let xpAmount = 10; // Base XP for message
    
    // Bonus for first message of the day
    const today = new Date().toISOString().split('T')[0];
    if (metrics.lastActiveDate !== today) {
      xpAmount += 25;
      await db.put('growth_metrics', {
        ...metrics,
        lastActiveDate: today
      });
    }
    
    return await this.awardXP(xpAmount, 'Sent message');
  }
  
  // Track document saved
  static async trackDocument(): Promise<{
    leveledUp: boolean;
    oldLevel: number;
    newLevel: number;
    newMilestones: any[];
  }> {
    const db = await initDB();
    const metrics = await db.get('growth_metrics', 'current');
    if (!metrics) {
      return {
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        newMilestones: []
      };
    }
    
    const newDocCount = metrics.totalDocuments + 1;
    await db.put('growth_metrics', {
      ...metrics,
      totalDocuments: newDocCount
    });
    
    return await this.awardXP(50, 'Saved document');
  }
  
  // Track conversation created
  static async trackConversation(): Promise<{
    leveledUp: boolean;
    oldLevel: number;
    newLevel: number;
    newMilestones: any[];
  }> {
    const db = await initDB();
    const metrics = await db.get('growth_metrics', 'current');
    if (!metrics) {
      return {
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        newMilestones: []
      };
    }
    
    const newConvCount = metrics.totalConversations + 1;
    await db.put('growth_metrics', {
      ...metrics,
      totalConversations: newConvCount
    });
    
    return await this.awardXP(25, 'Created conversation');
  }
  
  // Update daily streak
  static async updateStreak(): Promise<void> {
    const db = await initDB();
    const metrics = await db.get('growth_metrics', 'current');
    if (!metrics) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastActive = new Date(metrics.lastActiveDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let newStreak = metrics.currentStreak;
    let newDaysActive = metrics.daysActive;
    
    if (today !== metrics.lastActiveDate) {
      // New day
      newDaysActive++;
      
      if (metrics.lastActiveDate === yesterdayStr) {
        // Continuing streak
        newStreak++;
      } else {
        // Streak broken
        newStreak = 1;
      }
      
      const longestStreak = Math.max(metrics.longestStreak, newStreak);
      
      await db.put('growth_metrics', {
        ...metrics,
        currentStreak: newStreak,
        longestStreak: longestStreak,
        daysActive: newDaysActive,
        lastActiveDate: today
      });
      
      // Award streak XP
      await this.awardXP(10 * newStreak, `${newStreak} day streak`);
    }
  }
  
  // Check for milestone achievements
  static async checkMilestones(): Promise<Milestone[]> {
    const db = await initDB();
    const metrics = await db.get('growth_metrics', 'current');
    if (!metrics) return [];
    
    const allMilestones = await db.getAll('milestones');
    const newlyAchieved: Milestone[] = [];
    
    for (const milestone of allMilestones) {
      // Skip if already achieved
      if (milestone.achievedAt || metrics.milestones.includes(milestone.id)) {
        continue;
      }
      
      // Check if requirement met
      let achieved = false;
      switch (milestone.requirement.type) {
        case 'messages':
          achieved = metrics.totalMessages >= milestone.requirement.value;
          break;
        case 'documents':
          achieved = metrics.totalDocuments >= milestone.requirement.value;
          break;
        case 'days':
          achieved = metrics.daysActive >= milestone.requirement.value;
          break;
        case 'streak':
          achieved = metrics.currentStreak >= milestone.requirement.value;
          break;
      }
      
      if (achieved) {
        // Mark as achieved
        await db.put('milestones', {
          ...milestone,
          achievedAt: Date.now()
        });
        
        await db.put('growth_metrics', {
          ...metrics,
          milestones: [...metrics.milestones, milestone.id]
        });
        
        // Award XP
        await this.awardXP(milestone.xpReward, `Milestone: ${milestone.title}`);
        
        newlyAchieved.push(milestone);}
    }
    
    return newlyAchieved;
  }
  
  // Get current stage based on level
  static getStage(level: number): {
    name: string;
    description: string;
    minLevel: number;
    maxLevel: number;
    icon: string;
  } {
    if (level <= 5) return { 
      name: 'Newborn', 
      description: 'Just beginning to learn', 
      minLevel: 1, 
      maxLevel: 5,
      icon: '🥚'
    };
    if (level <= 15) return { 
      name: 'Infant', 
      description: 'Starting to understand', 
      minLevel: 6, 
      maxLevel: 15,
      icon: '🐣'
    };
    if (level <= 30) return { 
      name: 'Toddler', 
      description: 'Curious and energetic', 
      minLevel: 16, 
      maxLevel: 30,
      icon: '🐤'
    };
    if (level <= 50) return { 
      name: 'Child', 
      description: 'Developing knowledge', 
      minLevel: 31, 
      maxLevel: 50,
      icon: '🐥'
    };
    if (level <= 75) return { 
      name: 'Adolescent', 
      description: 'Building understanding', 
      minLevel: 51, 
      maxLevel: 75,
      icon: '🦅'
    };
    if (level <= 100) return { 
      name: 'Adult', 
      description: 'Mature and knowledgeable', 
      minLevel: 76, 
      maxLevel: 100,
      icon: '🦉'
    };
    return { 
      name: 'Sage', 
      description: 'Wise companion', 
      minLevel: 101, 
      maxLevel: 999,
      icon: '🧙'
    };
  }
  
  // XP calculation helpers
  static xpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(1.15, level - 1));
  }
  
  static totalXpForLevel(level: number): number {
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += this.xpForLevel(i);
    }
    return total;
  }
  
  // Reset growth metrics to level 1 (for debugging/testing)
  static async resetGrowthMetrics(): Promise<void> {
    const db = await initDB();
    const today = new Date().toISOString().split('T')[0];
    
    const resetMetrics: GrowthMetrics = {
      id: 'current',
      currentLevel: 1,
      currentXP: 0,
      totalXP: 0,
      totalMessages: 0,
      totalDocuments: 0,
      totalConversations: 0,
      totalFacts: 0,
      interestsIdentified: 0,
      daysActive: 1,
      currentStreak: 1,
      longestStreak: 1,
      createdAt: Date.now(),
      lastActiveDate: today,
      lastLevelUp: Date.now(),
      milestones: [],
    };
    
    await db.put('growth_metrics', resetMetrics);}
  
  // Get current growth state
  static async getGrowthState(): Promise<{
    level: number;
    stage: ReturnType<typeof GrowthService.getStage>;
    currentXP: number;
    xpForNextLevel: number;
    progress: number; // 0-1
    totalMessages: number;
    totalDocuments: number;
    totalConversations: number;
    daysActive: number;
    currentStreak: number;
    recentMilestones: Milestone[];
  }> {
    const db = await initDB();
    const metrics = await db.get('growth_metrics', 'current');
    if (!metrics) throw new Error('Growth metrics not initialized');
    
    const stage = this.getStage(metrics.currentLevel);
    const xpForNext = this.xpForLevel(metrics.currentLevel + 1);
    const progress = metrics.currentXP / xpForNext;
    
    // Get recent milestones (last 5)
    const allMilestones = await db.getAllFromIndex('milestones', 'achievedAt');
    const recentMilestones = allMilestones
      .filter(m => m.achievedAt && m.achievedAt > 0)
      .sort((a, b) => (b.achievedAt || 0) - (a.achievedAt || 0))
      .slice(0, 5);
    
    return {
      level: metrics.currentLevel,
      stage,
      currentXP: metrics.currentXP,
      xpForNextLevel: xpForNext,
      progress,
      totalMessages: metrics.totalMessages,
      totalDocuments: metrics.totalDocuments,
      totalConversations: metrics.totalConversations,
      daysActive: metrics.daysActive,
      currentStreak: metrics.currentStreak,
      recentMilestones: recentMilestones
    };
  }
}
