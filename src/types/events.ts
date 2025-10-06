/**
 * Event Types - Type definitions for Library autonomy events
 * 
 * This file contains all the type definitions for events used throughout
 * the Library autonomy system.
 */

// Re-export event types from eventBus for convenience
export type {
  LibraryPayload,
  AppEvent,
  EventSubscription,
  EventBusStats
} from '../services/eventBus';

// Re-export queue types from queueManager for convenience
export type {
  QueueTaskStatus,
  QueueTask,
  QueueStats,
  QueueConfig
} from '../services/queueManager';

// Additional event types for specific features

export interface CheckInEvent {
  id: string;
  type: 'ingestion' | 'enrichment' | 'proposal' | 'execution' | 'error';
  title: string;
  description: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export interface ProposalEvent {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  actions: Array<{
    tool: string;
    args: any;
    preview: any;
  }>;
  estimatedCost: number;
  estimatedTime: number;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
}

export interface ReceiptEvent {
  id: string;
  planId: string;
  executedAt: number;
  actions: Array<{
    tool: string;
    args: any;
    result: any;
    success: boolean;
  }>;
  totalCost: number;
  totalTime: number;
  canRollback: boolean;
  rollbackActions?: Array<{
    tool: string;
    args: any;
  }>;
}

export interface PolicyViolationEvent {
  id: string;
  policy: string;
  violation: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  resolved: boolean;
  resolution?: string;
}

export interface CostTrackingEvent {
  id: string;
  operation: string;
  cost: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SystemHealthEvent {
  id: string;
  status: 'healthy' | 'degraded' | 'critical';
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  alerts: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
  timestamp: number;
}

// Event handler types
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

export type LibraryEventHandler = EventHandler<{ kind: 'library.item.created'; at: number; itemId: string; payload: any }>;
export type WorkflowEventHandler = EventHandler<{ kind: 'workflow.proposed' | 'workflow.executed' | 'workflow.failed'; at: number; planId: string }>;
export type EnrichmentEventHandler = EventHandler<{ kind: 'enrichment.started' | 'enrichment.completed' | 'enrichment.failed'; at: number; itemId: string }>;
export type PolicyEventHandler = EventHandler<{ kind: 'policy.violation'; at: number; policy: string; details: any }>;
export type CostEventHandler = EventHandler<{ kind: 'cost.threshold'; at: number; amount: number; threshold: number }>;
export type HealthEventHandler = EventHandler<{ kind: 'system.health'; at: number; status: 'healthy' | 'degraded' | 'critical'; metrics: any }>;

// Event filter types
export interface EventFilter {
  kinds?: string[];
  itemId?: string;
  planId?: string;
  since?: number;
  until?: number;
  limit?: number;
}

export interface EventQuery {
  filter?: EventFilter;
  sort?: 'asc' | 'desc';
  groupBy?: 'kind' | 'itemId' | 'planId';
}

// Event aggregation types
export interface EventAggregation {
  total: number;
  byKind: Record<string, number>;
  byItem: Record<string, number>;
  byPlan: Record<string, number>;
  timeRange: {
    start: number;
    end: number;
  };
}

// Event export/import types
export interface EventExport {
  events: any[];
  metadata: {
    exportedAt: number;
    version: string;
    totalEvents: number;
  };
}

export interface EventImport {
  events: any[];
  options: {
    merge: boolean;
    skipDuplicates: boolean;
    validateTypes: boolean;
  };
}
