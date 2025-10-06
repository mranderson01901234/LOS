/**
 * Activity Types - Type definitions for Check-In system
 * 
 * This file contains all the type definitions for activities tracked
 * in the Check-In system, including proposals, executions, and receipts.
 */

export interface CheckInActivity {
  id: string;
  type: 'ingestion' | 'enrichment' | 'proposal' | 'execution' | 'error' | 'policy_violation';
  title: string;
  description: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, any>;
  itemId?: string;
  planId?: string;
  receiptId?: string;
}

export interface ProposalActivity extends CheckInActivity {
  type: 'proposal';
  ruleId: string;
  actions: ProposalAction[];
  estimatedCost: number;
  estimatedTime: number;
  preview: any;
  canExecute: boolean;
}

export interface ProposalAction {
  tool: string;
  args: any;
  preview: any;
  description: string;
}

export interface ExecutionActivity extends CheckInActivity {
  type: 'execution';
  planId: string;
  receiptId: string;
  actions: ExecutedAction[];
  actualCost: number;
  actualTime: number;
  canRollback: boolean;
}

export interface ExecutedAction {
  tool: string;
  args: any;
  result: any;
  success: boolean;
  error?: string;
}

export interface ReceiptActivity extends CheckInActivity {
  type: 'execution';
  receiptId: string;
  planId: string;
  executedAt: number;
  actions: ExecutedAction[];
  totalCost: number;
  totalTime: number;
  canRollback: boolean;
  rollbackActions?: RollbackAction[];
}

export interface RollbackAction {
  tool: string;
  args: any;
  description: string;
}

export interface IngestionActivity extends CheckInActivity {
  type: 'ingestion';
  itemId: string;
  contentType: 'url' | 'pdf' | 'text' | 'image' | 'audio';
  source: string;
  size?: number;
  processingStatus: 'queued' | 'processing' | 'completed' | 'failed';
}

export interface EnrichmentActivity extends CheckInActivity {
  type: 'enrichment';
  itemId: string;
  enrichmentType: 'summarize' | 'extract_entities' | 'link_related' | 'categorize';
  enrichmentStatus: 'started' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface PolicyViolationActivity extends CheckInActivity {
  type: 'policy_violation';
  policy: string;
  violation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolution?: string;
}

export interface ErrorActivity extends CheckInActivity {
  type: 'error';
  errorType: 'system' | 'user' | 'network' | 'api';
  errorMessage: string;
  stackTrace?: string;
  retryable: boolean;
  retryCount?: number;
}

// Activity filter and query types
export interface ActivityFilter {
  types?: CheckInActivity['type'][];
  status?: CheckInActivity['status'][];
  itemId?: string;
  planId?: string;
  since?: number;
  until?: number;
  limit?: number;
}

export interface ActivityQuery {
  filter?: ActivityFilter;
  sort?: 'asc' | 'desc';
  groupBy?: 'type' | 'status' | 'itemId';
}

// Activity aggregation types
export interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byDay: Record<string, number>;
  successRate: number;
  averageProcessingTime: number;
  totalCost: number;
}

// Activity export/import types
export interface ActivityExport {
  activities: CheckInActivity[];
  metadata: {
    exportedAt: number;
    version: string;
    totalActivities: number;
    timeRange: {
      start: number;
      end: number;
    };
  };
}

// Activity dashboard data
export interface CheckInDashboard {
  recentActivities: CheckInActivity[];
  pendingProposals: ProposalActivity[];
  yesterdayStats: ActivityStats;
  todayStats: ActivityStats;
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    activeTasks: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

// Activity notification types
export interface ActivityNotification {
  id: string;
  activityId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionRequired?: boolean;
  actionUrl?: string;
}

// Activity search types
export interface ActivitySearchResult {
  activity: CheckInActivity;
  relevanceScore: number;
  matchedFields: string[];
}

export interface ActivitySearchQuery {
  query: string;
  filters?: ActivityFilter;
  limit?: number;
  includeContent?: boolean;
}

// Activity batch operations
export interface ActivityBatchOperation {
  operation: 'approve' | 'reject' | 'execute' | 'rollback' | 'delete';
  activityIds: string[];
  reason?: string;
  metadata?: Record<string, any>;
}

export interface ActivityBatchResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    activityId: string;
    error: string;
  }>;
}
