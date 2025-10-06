/**
 * Feature Flag System for Gradual Rollout and A/B Testing
 * Enables safe deployment and gradual feature adoption
 */

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: FeatureCondition[];
  metadata?: {
    description?: string;
    createdBy?: string;
    createdAt?: Date;
    lastModified?: Date;
  };
}

export interface FeatureCondition {
  type: 'user_id' | 'user_level' | 'time_range' | 'custom';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';
  value: any;
}

export interface FeatureFlagConfig {
  flags: Map<string, FeatureFlag>;
  userId?: string;
  userLevel?: number;
  customContext?: Record<string, any>;
}

export class FeatureFlagManager {
  private config: FeatureFlagConfig = {
    flags: new Map()
  };

  private defaultFlags: FeatureFlag[] = [
    {
      name: 'task_graph_execution',
      enabled: false,
      rolloutPercentage: 0,
      metadata: {
        description: 'Enable task graph-based execution instead of linear execution',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'memory_informed_planning',
      enabled: false,
      rolloutPercentage: 0,
      metadata: {
        description: 'Use historical patterns to inform planning decisions',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'parallel_tool_execution',
      enabled: false,
      rolloutPercentage: 0,
      metadata: {
        description: 'Execute compatible tools in parallel',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'advanced_caching',
      enabled: false,
      rolloutPercentage: 0,
      metadata: {
        description: 'Implement intelligent response caching',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'cost_optimization',
      enabled: false,
      rolloutPercentage: 0,
      metadata: {
        description: 'Automatic cost optimization and model selection',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'performance_monitoring',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        description: 'Enable comprehensive performance monitoring',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'error_recovery',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        description: 'Enable robust error handling and retry logic',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    // Library Autonomy Feature Flags
    {
      name: 'check_in_system',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        description: 'Enable Check-In activity feed and proposal system',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'rules_engine',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        description: 'Enable Rules engine with Observe/Ask/Auto modes',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'shadow_execution',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        description: 'Enable shadow execution with dry-run and rollback',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'policy_engine',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        description: 'Enable policy engine with caps and allowlists',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'auto_enrichment',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        description: 'Enable automatic document enrichment (summarize, tag, link)',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'audio_ingestion',
      enabled: false,
      rolloutPercentage: 0,
      metadata: {
        description: 'Enable audio recording and transcription',
        createdBy: 'system',
        createdAt: new Date()
      }
    },
    {
      name: 'encrypted_storage',
      enabled: true,
      rolloutPercentage: 100,
      metadata: {
        description: 'Enable encryption at rest for sensitive data',
        createdBy: 'system',
        createdAt: new Date()
      }
    }
  ];

  constructor() {
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags(): void {
    this.defaultFlags.forEach(flag => {
      this.config.flags.set(flag.name, flag);
    });
  }

  /**
   * Set user context for feature flag evaluation
   */
  setUserContext(userId: string, userLevel?: number, customContext?: Record<string, any>): void {
    this.config.userId = userId;
    this.config.userLevel = userLevel;
    this.config.customContext = customContext;
  }

  /**
   * Check if a feature flag is enabled for the current user
   */
  isEnabled(flagName: string): boolean {
    const flag = this.config.flags.get(flagName);
    if (!flag) {
      console.warn(`Feature flag '${flagName}' not found`);
      return false;
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userId = this.config.userId || 'anonymous';
      const hash = this.hashString(userId + flagName);
      const userPercentage = hash % 100;
      
      if (userPercentage >= flag.rolloutPercentage) {
        return false;
      }
    }

    // Check conditions
    if (flag.conditions && flag.conditions.length > 0) {
      return this.evaluateConditions(flag.conditions);
    }

    return true;
  }

  /**
   * Enable a feature flag
   */
  enableFeature(flagName: string, rolloutPercentage: number = 100): void {
    const flag = this.config.flags.get(flagName);
    if (flag) {
      flag.enabled = true;
      flag.rolloutPercentage = rolloutPercentage;
      flag.metadata = {
        ...flag.metadata,
        lastModified: new Date()
      };} else {
      console.warn(`Feature flag '${flagName}' not found`);
    }
  }

  /**
   * Disable a feature flag
   */
  disableFeature(flagName: string): void {
    const flag = this.config.flags.get(flagName);
    if (flag) {
      flag.enabled = false;
      flag.rolloutPercentage = 0;
      flag.metadata = {
        ...flag.metadata,
        lastModified: new Date()
      };} else {
      console.warn(`Feature flag '${flagName}' not found`);
    }
  }

  /**
   * Set rollout percentage for a feature flag
   */
  setRolloutPercentage(flagName: string, percentage: number): void {
    const flag = this.config.flags.get(flagName);
    if (flag) {
      flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
      flag.metadata = {
        ...flag.metadata,
        lastModified: new Date()
      };} else {
      console.warn(`Feature flag '${flagName}' not found`);
    }
  }

  /**
   * Add a new feature flag
   */
  addFeatureFlag(flag: FeatureFlag): void {
    flag.metadata = {
      ...flag.metadata,
      createdAt: new Date(),
      lastModified: new Date()
    };
    this.config.flags.set(flag.name, flag);}

  /**
   * Remove a feature flag
   */
  removeFeatureFlag(flagName: string): void {
    if (this.config.flags.delete(flagName)) {} else {
      console.warn(`Feature flag '${flagName}' not found`);
    }
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.config.flags.values());
  }

  /**
   * Get enabled feature flags
   */
  getEnabledFlags(): FeatureFlag[] {
    return this.getAllFlags().filter(flag => this.isEnabled(flag.name));
  }

  /**
   * Get feature flag status
   */
  getFlagStatus(flagName: string): {
    exists: boolean;
    enabled: boolean;
    rolloutPercentage: number;
    isEnabledForUser: boolean;
    metadata?: any;
  } {
    const flag = this.config.flags.get(flagName);
    if (!flag) {
      return {
        exists: false,
        enabled: false,
        rolloutPercentage: 0,
        isEnabledForUser: false
      };
    }

    return {
      exists: true,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      isEnabledForUser: this.isEnabled(flagName),
      metadata: flag.metadata
    };
  }

  /**
   * Evaluate feature flag conditions
   */
  private evaluateConditions(conditions: FeatureCondition[]): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'user_id':
          return this.evaluateCondition(
            this.config.userId || '',
            condition.operator,
            condition.value
          );

        case 'user_level':
          return this.evaluateCondition(
            this.config.userLevel || 0,
            condition.operator,
            condition.value
          );

        case 'time_range':
          const now = new Date();
          const currentHour = now.getHours();
          return this.evaluateCondition(
            currentHour,
            condition.operator,
            condition.value
          );

        case 'custom':
          const customValue = this.config.customContext?.[condition.value.key];
          return this.evaluateCondition(
            customValue,
            condition.operator,
            condition.value.value
          );

        default:
          return false;
      }
    });
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'greater_than':
        return actual > expected;
      case 'less_than':
        return actual < expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'matches':
        return new RegExp(expected).test(String(actual));
      default:
        return false;
    }
  }

  /**
   * Hash a string to a number (0-99)
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Export feature flag configuration
   */
  exportConfig(): string {
    const config = {
      flags: Array.from(this.config.flags.entries()).map(([name, flag]) => ({
        name,
        ...flag
      })),
      userId: this.config.userId,
      userLevel: this.config.userLevel,
      customContext: this.config.customContext,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import feature flag configuration
   */
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      
      // Import flags
      if (config.flags) {
        config.flags.forEach((flagData: any) => {
          const { name, ...flag } = flagData;
          this.config.flags.set(name, flag);
        });
      }

      // Import context
      if (config.userId) {
        this.config.userId = config.userId;
      }
      if (config.userLevel) {
        this.config.userLevel = config.userLevel;
      }
      if (config.customContext) {
        this.config.customContext = config.customContext;
      }} catch (error) {
      console.error('Failed to import feature flag configuration:', error);
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config.flags.clear();
    this.initializeDefaultFlags();}
}

// Global instance for use throughout the application
export const featureFlags = new FeatureFlagManager();
