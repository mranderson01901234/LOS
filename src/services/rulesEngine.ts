/**
 * Rules Engine Service - Core automation and decision-making engine
 * 
 * This service manages rules, executes them based on triggers,
 * and handles the three modes: observe, ask, auto.
 */

import { v4 as uuidv4 } from 'uuid';
import { eventBus } from './eventBus';
import { queueManager } from './queueManager';
import { featureFlags } from './foundation/featureFlags';
import {
  Rule,
  RuleMode,
  Trigger,
  Condition,
  Action,
  RuleExecution,
  ExecutionStatus,
  ExecutionContext,
  ActionResult,
  RuleEngineStats,
  RuleValidationResult,
  RuleEngineConfig,
  FilterOperator,
  ActionType
} from '../types/rules';

export class RulesEngine {
  private rules: Map<string, Rule> = new Map();
  private executions: Map<string, RuleExecution> = new Map();
  private config: RuleEngineConfig;
  private isInitialized = false;

  constructor() {
    this.config = {
      maxConcurrentExecutions: 5,
      defaultTimeout: 30000, // 30 seconds
      retryConfig: {
        maxAttempts: 3,
        delay: 1000,
        backoff: 'exponential'
      },
      loggingLevel: 'info',
      enableMetrics: true,
      enableShadowMode: true,
      shadowModeConfig: {
        enabled: true,
        logActions: true,
        simulateDelays: false,
        mockResults: false
      }
    };

    this.initialize();
  }

  /**
   * Initialize the Rules Engine
   */
  private async initialize(): Promise<void> {
    if (!featureFlags.isEnabled('rules_engine')) {return;
    }

    try {
      // Load default rules
      await this.loadDefaultRules();
      
      // Subscribe to events
      this.subscribeToEvents();
      
      this.isInitialized = true;} catch (error) {
      console.error('Failed to initialize Rules Engine:', error);
    }
  }

  /**
   * Load default rules for Library autonomy
   */
  private async loadDefaultRules(): Promise<void> {
    const defaultRules: Rule[] = [
      {
        id: 'auto-enrich-urls',
        name: 'Auto-enrich URLs',
        description: 'Automatically enrich URL content with summaries and metadata',
        enabled: true,
        priority: 8,
        mode: 'auto',
        triggers: [{
          id: 'url-added',
          type: 'event',
          event: 'library.item.created',
          filters: [{
            field: 'type',
            operator: 'equals',
            value: 'url'
          }]
        }],
        conditions: [{
          id: 'is-url',
          type: 'content',
          field: 'type',
          operator: 'equals',
          value: 'url'
        }],
        actions: [{
          id: 'enrich-url',
          type: 'enrich_content',
          target: 'content',
          parameters: {
            enrichmentTypes: ['summarize', 'extract_entities', 'categorize']
          }
        }],
        metadata: {
          author: 'system',
          version: '1.0.0',
          tags: ['auto-enrichment', 'urls'],
          category: 'content-processing',
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          averageExecutionTime: 0
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'ask-for-categorization',
        name: 'Ask for Content Categorization',
        description: 'Ask user to categorize content when confidence is low',
        enabled: true,
        priority: 6,
        mode: 'ask',
        triggers: [{
          id: 'low-confidence',
          type: 'event',
          event: 'enrichment.completed',
          filters: [{
            field: 'confidence',
            operator: 'less_than',
            value: 0.7
          }]
        }],
        conditions: [{
          id: 'low-confidence',
          type: 'content',
          field: 'confidence',
          operator: 'less_than',
          value: 0.7
        }],
        actions: [{
          id: 'create-categorization-proposal',
          type: 'create_proposal',
          target: 'user',
          parameters: {
            proposalType: 'categorization',
            message: 'Please help categorize this content'
          }
        }],
        metadata: {
          author: 'system',
          version: '1.0.0',
          tags: ['user-interaction', 'categorization'],
          category: 'user-assistance',
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          averageExecutionTime: 0
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'observe-patterns',
        name: 'Observe Content Patterns',
        description: 'Observe and learn from user content patterns',
        enabled: true,
        priority: 4,
        mode: 'observe',
        triggers: [{
          id: 'content-added',
          type: 'event',
          event: 'library.item.created'
        }],
        conditions: [],
        actions: [{
          id: 'update-patterns',
          type: 'update_metadata',
          target: 'patterns',
          parameters: {
            updateType: 'content_pattern'
          }
        }],
        metadata: {
          author: 'system',
          version: '1.0.0',
          tags: ['pattern-learning', 'observation'],
          category: 'learning',
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          averageExecutionTime: 0
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    // Add rules to engine
    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });}

  /**
   * Subscribe to relevant events
   */
  private subscribeToEvents(): void {
    const events = [
      'library.item.created',
      'enrichment.completed',
      'enrichment.failed',
      'user.feedback.given',
      'content.categorized',
      'content.archived'
    ];

    events.forEach(eventName => {
      eventBus.subscribeTo(eventName as any, (event: any) => {
        this.handleEvent(eventName, event);
      });
    });}

  /**
   * Handle incoming events
   */
  private async handleEvent(eventName: string, event: any): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Find rules that match this event
      const matchingRules = this.findMatchingRules(eventName, event);
      
      // Execute matching rules
      for (const rule of matchingRules) {
        await this.executeRule(rule, eventName, event);
      }
      
    } catch (error) {
      console.error('Failed to handle event:', error);
    }
  }

  /**
   * Find rules that match the event
   */
  private findMatchingRules(eventName: string, event: any): Rule[] {
    const matchingRules: Rule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check if any trigger matches
      const hasMatchingTrigger = rule.triggers.some(trigger => {
        if (trigger.type !== 'event') return false;
        if (trigger.event !== eventName) return false;
        
        // Check filters if any
        if (trigger.filters) {
          return this.evaluateFilters(trigger.filters, event);
        }
        
        return true;
      });

      if (hasMatchingTrigger) {
        matchingRules.push(rule);
      }
    }

    // Sort by priority (higher first)
    return matchingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute a rule
   */
  private async executeRule(rule: Rule, triggerEvent: string, event: any): Promise<void> {
    const executionId = uuidv4();
    const startTime = Date.now();

    // Create execution context
    const context: ExecutionContext = {
      event,
      content: event.payload || event,
      metadata: {
        ruleId: rule.id,
        triggerEvent,
        executionId
      }
    };

    // Create execution record
    const execution: RuleExecution = {
      id: executionId,
      ruleId: rule.id,
      triggerId: rule.triggers.find(t => t.event === triggerEvent)?.id || 'unknown',
      status: 'running',
      startTime,
      context,
      results: [],
      retryCount: 0
    };

    this.executions.set(executionId, execution);

    try {

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions, context);
      
      if (!conditionsMet) {
        execution.status = 'completed';
        execution.endTime = Date.now();
        execution.duration = execution.endTime - execution.startTime;
return;
      }

      // Execute based on mode
      switch (rule.mode) {
        case 'observe':
          await this.executeObserveMode(rule, context, execution);
          break;
        case 'ask':
          await this.executeAskMode(rule, context, execution);
          break;
        case 'auto':
          await this.executeAutoMode(rule, context, execution);
          break;
      }

      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      // Update rule statistics
      this.updateRuleStats(rule, execution);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      console.error(`Rule ${rule.name} failed:`, error);
    }
  }

  /**
   * Execute observe mode (just log/record)
   */
  private async executeObserveMode(rule: Rule, context: ExecutionContext, execution: RuleExecution): Promise<void> {// In observe mode, we just record the event
    const result: ActionResult = {
      actionId: 'observe',
      status: 'success',
      result: { observed: true, context: context.metadata },
      duration: 0
    };
    
    execution.results.push(result);
  }

  /**
   * Execute ask mode (create proposals)
   */
  private async executeAskMode(rule: Rule, context: ExecutionContext, execution: RuleExecution): Promise<void> {// Create a proposal for user review
    const proposal = {
      id: uuidv4(),
      ruleId: rule.id,
      type: 'user_decision',
      title: rule.name,
      description: rule.description,
      context,
      actions: rule.actions,
      createdAt: Date.now()
    };

    // Emit proposal event
    eventBus.emit('workflow.proposed' as any, {
      kind: 'workflow.proposed',
      payload: proposal,
      timestamp: Date.now()
    });

    const result: ActionResult = {
      actionId: 'ask',
      status: 'success',
      result: { proposal },
      duration: 0
    };
    
    execution.results.push(result);
  }

  /**
   * Execute auto mode (automatic execution)
   */
  private async executeAutoMode(rule: Rule, context: ExecutionContext, execution: RuleExecution): Promise<void> {// Execute all actions
    for (const action of rule.actions) {
      const actionResult = await this.executeAction(action, context);
      execution.results.push(actionResult);
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: Action, context: ExecutionContext): Promise<ActionResult> {
    const startTime = Date.now();
    
    try {let result: any;
      
      switch (action.type) {
        case 'enrich_content':
          result = await this.executeEnrichContent(action, context);
          break;
        case 'categorize_content':
          result = await this.executeCategorizeContent(action, context);
          break;
        case 'tag_content':
          result = await this.executeTagContent(action, context);
          break;
        case 'create_proposal':
          result = await this.executeCreateProposal(action, context);
          break;
        case 'update_metadata':
          result = await this.executeUpdateMetadata(action, context);
          break;
        case 'send_to_queue':
          result = await this.executeSendToQueue(action, context);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return {
        actionId: action.id,
        status: 'success',
        result,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        actionId: action.id,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Execute enrich content action
   */
  private async executeEnrichContent(action: Action, context: ExecutionContext): Promise<any> {
    const enrichmentTypes = action.parameters.enrichmentTypes || ['summarize'];
    
    // Queue enrichment task
    await queueManager.enqueue('enrich_document', {
      itemId: context.content?.id,
      enrichmentTypes,
      context
    }, {
      priority: 1,
      metadata: { source: 'rules_engine', actionId: action.id }
    });

    return { queued: true, enrichmentTypes };
  }

  /**
   * Execute categorize content action
   */
  private async executeCategorizeContent(action: Action, context: ExecutionContext): Promise<any> {
    // This would integrate with content analysisreturn { categorized: true };
  }

  /**
   * Execute tag content action
   */
  private async executeTagContent(action: Action, context: ExecutionContext): Promise<any> {
    const tags = action.parameters.tags || [];return { tagged: true, tags };
  }

  /**
   * Execute create proposal action
   */
  private async executeCreateProposal(action: Action, context: ExecutionContext): Promise<any> {
    const proposal = {
      id: uuidv4(),
      type: action.parameters.proposalType || 'general',
      title: action.parameters.title || 'Proposal',
      description: action.parameters.message || 'Please review this proposal',
      context,
      createdAt: Date.now()
    };

    eventBus.emit('workflow.proposed' as any, {
      kind: 'workflow.proposed',
      payload: proposal,
      timestamp: Date.now()
    });

    return { proposal };
  }

  /**
   * Execute update metadata action
   */
  private async executeUpdateMetadata(action: Action, context: ExecutionContext): Promise<any> {return { metadataUpdated: true };
  }

  /**
   * Execute send to queue action
   */
  private async executeSendToQueue(action: Action, context: ExecutionContext): Promise<any> {
    const queueName = action.parameters.queueName || 'default';
    const taskData = action.parameters.taskData || context;
    
    await queueManager.enqueue(queueName, taskData, {
      priority: action.parameters.priority || 1,
      metadata: { source: 'rules_engine', actionId: action.id }
    });

    return { queued: true, queueName };
  }

  /**
   * Evaluate conditions
   */
  private async evaluateConditions(conditions: Condition[], context: ExecutionContext): Promise<boolean> {
    if (conditions.length === 0) return true;

    // Simple AND logic for now
    for (const condition of conditions) {
      const met = await this.evaluateCondition(condition, context);
      if (!met) return false;
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: Condition, context: ExecutionContext): Promise<boolean> {
    const value = this.getFieldValue(condition.field, context);
    return this.compareValues(value, condition.operator, condition.value);
  }

  /**
   * Get field value from context
   */
  private getFieldValue(field: string, context: ExecutionContext): any {
    // Simple field access for now
    const parts = field.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as any)[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, operator: FilterOperator, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }

  /**
   * Evaluate filters
   */
  private evaluateFilters(filters: any[], event: any): boolean {
    return filters.every(filter => {
      const value = this.getFieldValue(filter.field, { event, metadata: {} });
      return this.compareValues(value, filter.operator, filter.value);
    });
  }

  /**
   * Update rule statistics
   */
  private updateRuleStats(rule: Rule, execution: RuleExecution): void {
    rule.metadata.executionCount++;
    rule.metadata.lastExecuted = execution.startTime;
    
    if (execution.status === 'completed') {
      rule.metadata.successCount++;
    } else {
      rule.metadata.failureCount++;
    }
    
    // Update average execution time
    const totalTime = rule.metadata.averageExecutionTime * (rule.metadata.executionCount - 1);
    rule.metadata.averageExecutionTime = (totalTime + (execution.duration || 0)) / rule.metadata.executionCount;
  }

  /**
   * Get engine statistics
   */
  getStats(): RuleEngineStats {
    const rules = Array.from(this.rules.values());
    const executions = Array.from(this.executions.values());
    
    const rulesByMode: Record<RuleMode, number> = {
      observe: 0,
      ask: 0,
      auto: 0
    };
    
    const rulesByCategory: Record<string, number> = {};
    
    rules.forEach(rule => {
      rulesByMode[rule.mode]++;
      rulesByCategory[rule.metadata.category] = (rulesByCategory[rule.metadata.category] || 0) + 1;
    });

    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0);

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      totalExecutions: executions.length,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime: executions.length > 0 ? totalDuration / executions.length : 0,
      rulesByMode,
      rulesByCategory,
      topPerformingRules: rules
        .filter(r => r.metadata.executionCount > 0)
        .map(r => ({
          ruleId: r.id,
          ruleName: r.name,
          successRate: r.metadata.executionCount > 0 ? r.metadata.successCount / r.metadata.executionCount : 0,
          executionCount: r.metadata.executionCount
        }))
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5),
      recentExecutions: executions
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, 10)
    };
  }

  /**
   * Add a new rule
   */
  addRule(rule: Rule): void {
    this.rules.set(rule.id, rule);}

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {}
    return removed;
  }

  /**
   * Get all rules
   */
  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): Rule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      rule.updatedAt = Date.now();
      return true;
    }
    return false;
  }
}

// Global instance
export const rulesEngine = new RulesEngine();
