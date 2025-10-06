/**
 * Rules Engine Types - Core types for automated decision-making
 * 
 * This file contains all the type definitions for the Rules Engine,
 * including rules, triggers, conditions, and actions.
 */

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // 1-10, higher = more important
  mode: RuleMode;
  triggers: Trigger[];
  conditions: Condition[];
  actions: Action[];
  metadata: RuleMetadata;
  createdAt: number;
  updatedAt: number;
}

export type RuleMode = 'observe' | 'ask' | 'auto';

export interface Trigger {
  id: string;
  type: TriggerType;
  event: string; // Event name from Event Bus
  filters?: TriggerFilter[];
  cooldown?: number; // Minimum time between triggers (ms)
}

export type TriggerType = 'event' | 'schedule' | 'condition' | 'manual';

export interface TriggerFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';

export interface Condition {
  id: string;
  type: ConditionType;
  field: string;
  operator: FilterOperator;
  value: any;
  logic?: LogicOperator; // 'and' | 'or' for combining conditions
}

export type ConditionType = 'content' | 'user' | 'system' | 'time' | 'pattern' | 'custom';

export type LogicOperator = 'and' | 'or';

export interface Action {
  id: string;
  type: ActionType;
  target: string; // What to act on
  parameters: Record<string, any>;
  delay?: number; // Delay before execution (ms)
  retry?: RetryConfig;
}

export type ActionType = 
  | 'enrich_content'
  | 'categorize_content'
  | 'tag_content'
  | 'archive_content'
  | 'delete_content'
  | 'notify_user'
  | 'create_proposal'
  | 'execute_workflow'
  | 'update_metadata'
  | 'send_to_queue'
  | 'custom';

export interface RetryConfig {
  maxAttempts: number;
  delay: number; // Base delay between retries (ms)
  backoff: 'linear' | 'exponential';
}

export interface RuleMetadata {
  author: string;
  version: string;
  tags: string[];
  category: string;
  lastExecuted?: number;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  triggerId: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  context: ExecutionContext;
  results: ActionResult[];
  error?: string;
  retryCount: number;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';

export interface ExecutionContext {
  event: any; // Original event that triggered the rule
  content?: any; // Content being processed
  user?: any; // User context
  system?: any; // System state
  metadata: Record<string, any>;
}

export interface ActionResult {
  actionId: string;
  status: 'success' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  duration: number;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: Partial<Rule>;
  parameters: TemplateParameter[];
  examples: RuleExample[];
}

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: any[]; // For enum-like parameters
}

export interface RuleExample {
  name: string;
  description: string;
  rule: Rule;
  testData: any;
  expectedResults: any;
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  enabled: boolean;
  priority: number;
  metadata: RuleSetMetadata;
}

export interface RuleSetMetadata {
  author: string;
  version: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface RuleEngineStats {
  totalRules: number;
  enabledRules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  rulesByMode: Record<RuleMode, number>;
  rulesByCategory: Record<string, number>;
  topPerformingRules: Array<{
    ruleId: string;
    ruleName: string;
    successRate: number;
    executionCount: number;
  }>;
  recentExecutions: RuleExecution[];
}

export interface RuleValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface RuleTestResult {
  ruleId: string;
  testData: any;
  expectedResults: any;
  actualResults: any;
  passed: boolean;
  errors: string[];
  executionTime: number;
}

export interface RuleEngineConfig {
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  retryConfig: RetryConfig;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  enableShadowMode: boolean;
  shadowModeConfig?: ShadowModeConfig;
}

export interface ShadowModeConfig {
  enabled: boolean;
  logActions: boolean;
  simulateDelays: boolean;
  mockResults: boolean;
}

// Export types for external use
export type RuleId = string;
export type TriggerId = string;
export type ActionId = string;
export type ExecutionId = string;
