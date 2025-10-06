/**
 * Activity Tracker Service - Centralized activity logging and management
 * 
 * This service tracks all Library autonomy activities, provides real-time updates,
 * and manages the Check-In system data.
 */

import { v4 as uuidv4 } from 'uuid';
import { eventBus, AppEvent } from './eventBus';
import { featureFlags } from './foundation/featureFlags';
import {
  CheckInActivity,
  ProposalActivity,
  ExecutionActivity,
  IngestionActivity,
  EnrichmentActivity,
  PolicyViolationActivity,
  ErrorActivity,
  ActivityFilter,
  ActivityQuery,
  ActivityStats,
  CheckInDashboard,
  ActivityNotification,
  ActivitySearchResult,
  ActivitySearchQuery,
  ActivityBatchOperation,
  ActivityBatchResult
} from '../types/activity';

export class ActivityTracker {
  private activities: Map<string, CheckInActivity> = new Map();
  private notifications: Map<string, ActivityNotification> = new Map();
  private maxActivities = 1000;
  private maxNotifications = 100;
  private subscribers: Array<(activity: CheckInActivity) => void> = [];

  constructor() {
    this.initializeEventSubscriptions();
  }

  /**
   * Initialize event subscriptions for automatic activity tracking
   */
  private initializeEventSubscriptions(): void {
    if (!featureFlags.isEnabled('check_in_system')) {return;
    }

    // Subscribe to all relevant events
    eventBus.subscribe([
      'library.item.created',
      'workflow.proposed',
      'workflow.executed',
      'workflow.failed',
      'enrichment.started',
      'enrichment.completed',
      'enrichment.failed',
      'policy.violation',
      'cost.threshold',
      'system.health'
    ], (event: AppEvent) => {
      this.handleEvent(event);
    });}

  /**
   * Handle incoming events and create activities
   */
  private handleEvent(event: AppEvent): void {
    try {
      switch (event.kind) {
        case 'library.item.created':
          this.createIngestionActivity(event);
          break;
        case 'workflow.proposed':
          this.createProposalActivity(event);
          break;
        case 'workflow.executed':
          this.createExecutionActivity(event);
          break;
        case 'workflow.failed':
          this.createErrorActivity(event);
          break;
        case 'enrichment.started':
        case 'enrichment.completed':
        case 'enrichment.failed':
          this.createEnrichmentActivity(event);
          break;
        case 'policy.violation':
          this.createPolicyViolationActivity(event);
          break;
        case 'cost.threshold':
          this.createCostThresholdNotification(event);
          break;
        case 'system.health':
          this.createSystemHealthNotification(event);
          break;
      }
    } catch (error) {
      console.error('Activity Tracker: Error handling event:', error);
    }
  }

  /**
   * Create ingestion activity from library item created event
   */
  private createIngestionActivity(event: Extract<AppEvent, { kind: 'library.item.created' }>): void {
    const activity: IngestionActivity = {
      id: uuidv4(),
      type: 'ingestion',
      title: `New ${event.payload.type} ingested`,
      description: `Item "${(event.payload as any).title || (event.payload as any).filename || 'Untitled'}" was added to the Library`,
      timestamp: event.at,
      status: 'completed',
      itemId: event.itemId,
      contentType: event.payload.type as any,
      source: 'library',
      processingStatus: 'completed',
      metadata: {
        payload: event.payload,
        eventId: event.at
      }
    };

    this.addActivity(activity);
  }

  /**
   * Create proposal activity from workflow proposed event
   */
  private createProposalActivity(event: Extract<AppEvent, { kind: 'workflow.proposed' }>): void {
    const activity: ProposalActivity = {
      id: uuidv4(),
      type: 'proposal',
      title: 'Workflow Proposal',
      description: `New workflow proposal for plan ${event.planId}`,
      timestamp: event.at,
      status: 'pending',
      planId: event.planId,
      ruleId: event.ruleId,
      actions: [], // Will be populated from preview
      estimatedCost: 0,
      estimatedTime: 0,
      preview: event.preview,
      canExecute: true,
      metadata: {
        preview: event.preview,
        eventId: event.at
      }
    };

    this.addActivity(activity);
    this.createNotification({
      type: 'info',
      title: 'New Workflow Proposal',
      message: 'A new workflow proposal is waiting for your approval',
      activityId: activity.id,
      actionRequired: true,
      actionUrl: `/check-in#proposal-${activity.id}`
    });
  }

  /**
   * Create execution activity from workflow executed event
   */
  private createExecutionActivity(event: Extract<AppEvent, { kind: 'workflow.executed' }>): void {
    const activity: ExecutionActivity = {
      id: uuidv4(),
      type: 'execution',
      title: 'Workflow Executed',
      description: `Workflow plan ${event.planId} was executed successfully`,
      timestamp: event.at,
      status: 'completed',
      planId: event.planId,
      receiptId: event.receiptId,
      actions: [], // Will be populated from result
      actualCost: 0,
      actualTime: 0,
      canRollback: true,
      metadata: {
        result: event.result,
        eventId: event.at
      }
    };

    this.addActivity(activity);
  }

  /**
   * Create enrichment activity from enrichment events
   */
  private createEnrichmentActivity(event: Extract<AppEvent, { kind: 'enrichment.started' | 'enrichment.completed' | 'enrichment.failed' }>): void {
    const activity: EnrichmentActivity = {
      id: uuidv4(),
      type: 'enrichment',
      title: `Enrichment ${event.kind.split('.')[1]}`,
      description: `Document enrichment ${event.kind.split('.')[1]} for item ${event.itemId}`,
      timestamp: event.at,
      status: event.kind === 'enrichment.failed' ? 'failed' : 'completed',
      itemId: event.itemId,
      enrichmentType: 'summarize', // Default, could be enhanced
      enrichmentStatus: event.kind === 'enrichment.started' ? 'started' : 
                       event.kind === 'enrichment.completed' ? 'completed' : 'failed',
      result: event.kind === 'enrichment.completed' ? event.result : undefined,
      error: event.kind === 'enrichment.failed' ? event.error : undefined,
      metadata: {
        eventId: event.at
      }
    };

    this.addActivity(activity);
  }

  /**
   * Create policy violation activity
   */
  private createPolicyViolationActivity(event: Extract<AppEvent, { kind: 'policy.violation' }>): void {
    const activity: PolicyViolationActivity = {
      id: uuidv4(),
      type: 'policy_violation',
      title: 'Policy Violation',
      description: `Policy "${event.policy}" violated: ${event.details}`,
      timestamp: event.at,
      status: 'pending',
      policy: event.policy,
      violation: event.details,
      severity: 'medium', // Default, could be enhanced
      resolved: false,
      metadata: {
        details: event.details,
        eventId: event.at
      }
    };

    this.addActivity(activity);
    this.createNotification({
      type: 'warning',
      title: 'Policy Violation',
      message: `Policy "${event.policy}" was violated`,
      activityId: activity.id,
      actionRequired: true
    });
  }

  /**
   * Create error activity from workflow failed event
   */
  private createErrorActivity(event: Extract<AppEvent, { kind: 'workflow.failed' }>): void {
    const activity: ErrorActivity = {
      id: uuidv4(),
      type: 'error',
      title: 'Workflow Failed',
      description: `Workflow plan ${event.planId} failed: ${event.error}`,
      timestamp: event.at,
      status: 'failed',
      planId: event.planId,
      errorType: 'system',
      errorMessage: event.error,
      retryable: event.retryable,
      metadata: {
        eventId: event.at
      }
    };

    this.addActivity(activity);
  }

  /**
   * Create cost threshold notification
   */
  private createCostThresholdNotification(event: Extract<AppEvent, { kind: 'cost.threshold' }>): void {
    this.createNotification({
      type: 'warning',
      title: 'Cost Threshold Reached',
      message: `Daily cost threshold reached: $${event.amount.toFixed(2)}`,
      activityId: '',
      actionRequired: false
    });
  }

  /**
   * Create system health notification
   */
  private createSystemHealthNotification(event: Extract<AppEvent, { kind: 'system.health' }>): void {
    if (event.status === 'critical') {
      this.createNotification({
        type: 'error',
        title: 'System Health Critical',
        message: 'System health is critical, immediate attention required',
        activityId: '',
        actionRequired: true
      });
    }
  }

  /**
   * Add activity to tracker
   */
  private addActivity(activity: CheckInActivity): void {
    this.activities.set(activity.id, activity);
    
    // Maintain max activities limit
    if (this.activities.size > this.maxActivities) {
      const oldestActivity = Array.from(this.activities.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      this.activities.delete(oldestActivity.id);
    }

    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(activity);
      } catch (error) {
        console.error('Activity Tracker: Error in subscriber callback:', error);
      }
    });}

  /**
   * Create notification
   */
  private createNotification(notification: Omit<ActivityNotification, 'id' | 'timestamp' | 'read'>): void {
    const fullNotification: ActivityNotification = {
      ...notification,
      id: uuidv4(),
      timestamp: Date.now(),
      read: false
    };

    this.notifications.set(fullNotification.id, fullNotification);

    // Maintain max notifications limit
    if (this.notifications.size > this.maxNotifications) {
      const oldestNotification = Array.from(this.notifications.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      this.notifications.delete(oldestNotification.id);
    }}

  /**
   * Get activities with filtering and sorting
   */
  getActivities(query?: ActivityQuery): CheckInActivity[] {
    let activities = Array.from(this.activities.values());

    if (query?.filter) {
      const filter = query.filter;
      
      if (filter.types && filter.types.length > 0) {
        activities = activities.filter(a => filter.types!.includes(a.type));
      }
      
      if (filter.status && filter.status.length > 0) {
        activities = activities.filter(a => filter.status!.includes(a.status));
      }
      
      if (filter.itemId) {
        activities = activities.filter(a => a.itemId === filter.itemId);
      }
      
      if (filter.planId) {
        activities = activities.filter(a => a.planId === filter.planId);
      }
      
      if (filter.since) {
        activities = activities.filter(a => a.timestamp >= filter.since!);
      }
      
      if (filter.until) {
        activities = activities.filter(a => a.timestamp <= filter.until!);
      }
    }

    // Sort
    if (query?.sort === 'asc') {
      activities.sort((a, b) => a.timestamp - b.timestamp);
    } else {
      activities.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Limit
    if (query?.filter?.limit) {
      activities = activities.slice(0, query.filter.limit);
    }

    return activities;
  }

  /**
   * Get activity by ID
   */
  getActivity(id: string): CheckInActivity | undefined {
    return this.activities.get(id);
  }

  /**
   * Get pending proposals
   */
  getPendingProposals(): ProposalActivity[] {
    return this.getActivities({
      filter: { types: ['proposal'], status: ['pending'] }
    }) as ProposalActivity[];
  }

  /**
   * Get recent activities
   */
  getRecentActivities(limit: number = 50): CheckInActivity[] {
    return this.getActivities({
      filter: { limit },
      sort: 'desc'
    });
  }

  /**
   * Get activities for a specific item
   */
  getItemActivities(itemId: string): CheckInActivity[] {
    return this.getActivities({
      filter: { itemId }
    });
  }

  /**
   * Get activity statistics
   */
  getActivityStats(): ActivityStats {
    const activities = Array.from(this.activities.values());
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);

    const todayActivities = activities.filter(a => a.timestamp >= oneDayAgo);
    const yesterdayActivities = activities.filter(a => 
      a.timestamp >= twoDaysAgo && a.timestamp < oneDayAgo
    );

    const stats: ActivityStats = {
      total: activities.length,
      byType: {},
      byStatus: {},
      byDay: {},
      successRate: 0,
      averageProcessingTime: 0,
      totalCost: 0
    };

    // Calculate by type and status
    activities.forEach(activity => {
      stats.byType[activity.type] = (stats.byType[activity.type] || 0) + 1;
      stats.byStatus[activity.status] = (stats.byStatus[activity.status] || 0) + 1;
    });

    // Calculate success rate
    const completedActivities = activities.filter(a => a.status === 'completed');
    stats.successRate = activities.length > 0 ? completedActivities.length / activities.length : 0;

    // Calculate average processing time (for activities with timing data)
    const timedActivities = activities.filter(a => 
      a.metadata?.processingTime || a.metadata?.executionTime
    );
    if (timedActivities.length > 0) {
      const totalTime = timedActivities.reduce((sum, a) => 
        sum + (a.metadata?.processingTime || a.metadata?.executionTime || 0), 0
      );
      stats.averageProcessingTime = totalTime / timedActivities.length;
    }

    return stats;
  }

  /**
   * Get Check-In dashboard data
   */
  getDashboard(): CheckInDashboard {
    const recentActivities = this.getRecentActivities(20);
    const pendingProposals = this.getPendingProposals();
    const stats = this.getActivityStats();

    return {
      recentActivities,
      pendingProposals,
      yesterdayStats: stats, // Simplified for now
      todayStats: stats,
      systemHealth: {
        status: 'healthy',
        activeTasks: pendingProposals.length,
        errorRate: 0,
        averageResponseTime: stats.averageProcessingTime
      }
    };
  }

  /**
   * Subscribe to activity updates
   */
  subscribe(callback: (activity: CheckInActivity) => void): () => void {
    this.subscribers.push(callback);
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Execute proposal (approve and run)
   */
  async executeProposal(proposalId: string): Promise<boolean> {
    const proposal = this.getActivity(proposalId) as ProposalActivity;
    if (!proposal || proposal.type !== 'proposal') {
      return false;
    }

    try {
      // Update proposal status
      proposal.status = 'completed';
      proposal.metadata = {
        ...proposal.metadata,
        executedAt: Date.now()
      };

      // Create execution activity
      const execution: ExecutionActivity = {
        id: uuidv4(),
        type: 'execution',
        title: 'Proposal Executed',
        description: `Proposal "${proposal.title}" was executed`,
        timestamp: Date.now(),
        status: 'completed',
        planId: proposal.planId!,
        receiptId: uuidv4(),
        actions: proposal.actions.map(action => ({
          tool: action.tool,
          args: action.args,
          result: { success: true },
          success: true
        })),
        actualCost: proposal.estimatedCost,
        actualTime: proposal.estimatedTime,
        canRollback: true,
        metadata: {
          proposalId: proposal.id,
          executedAt: Date.now()
        }
      };

      this.addActivity(execution);return true;
    } catch (error) {
      console.error('Activity Tracker: Error executing proposal:', error);
      return false;
    }
  }

  /**
   * Reject proposal
   */
  async rejectProposal(proposalId: string, reason?: string): Promise<boolean> {
    const proposal = this.getActivity(proposalId) as ProposalActivity;
    if (!proposal || proposal.type !== 'proposal') {
      return false;
    }

    proposal.status = 'cancelled';
    proposal.metadata = {
      ...proposal.metadata,
      rejectedAt: Date.now(),
      rejectionReason: reason
    };return true;
  }

  /**
   * Rollback execution
   */
  async rollbackExecution(executionId: string): Promise<boolean> {
    const execution = this.getActivity(executionId) as ExecutionActivity;
    if (!execution || execution.type !== 'execution') {
      return false;
    }

    try {
      // Create rollback activity
      const rollback: ExecutionActivity = {
        id: uuidv4(),
        type: 'execution',
        title: 'Execution Rolled Back',
        description: `Execution "${execution.title}" was rolled back`,
        timestamp: Date.now(),
        status: 'completed',
        planId: execution.planId!,
        receiptId: uuidv4(),
        actions: [], // Rollback actions would be implemented here
        actualCost: 0,
        actualTime: 0,
        canRollback: false,
        metadata: {
          originalExecutionId: execution.id,
          rolledBackAt: Date.now()
        }
      };

      this.addActivity(rollback);return true;
    } catch (error) {
      console.error('Activity Tracker: Error rolling back execution:', error);
      return false;
    }
  }

  /**
   * Search activities
   */
  searchActivities(query: ActivitySearchQuery): ActivitySearchResult[] {
    const activities = this.getActivities({
      filter: query.filters
    });

    const results: ActivitySearchResult[] = [];
    const searchTerms = query.query.toLowerCase().split(' ');

    activities.forEach(activity => {
      const searchableText = [
        activity.title,
        activity.description,
        activity.type,
        activity.status
      ].join(' ').toLowerCase();

      const matchedFields: string[] = [];
      let relevanceScore = 0;

      searchTerms.forEach(term => {
        if (searchableText.includes(term)) {
          relevanceScore += 1;
          if (activity.title.toLowerCase().includes(term)) {
            matchedFields.push('title');
          }
          if (activity.description.toLowerCase().includes(term)) {
            matchedFields.push('description');
          }
        }
      });

      if (relevanceScore > 0) {
        results.push({
          activity,
          relevanceScore,
          matchedFields: [...new Set(matchedFields)]
        });
      }
    });

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get notifications
   */
  getNotifications(): ActivityNotification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications.clear();
  }
}

// Global activity tracker instance
export const activityTracker = new ActivityTracker();

// Export convenience functions
export const getActivities = (query?: ActivityQuery) => activityTracker.getActivities(query);
export const getActivity = (id: string) => activityTracker.getActivity(id);
export const getPendingProposals = () => activityTracker.getPendingProposals();
export const getRecentActivities = (limit?: number) => activityTracker.getRecentActivities(limit);
export const getDashboard = () => activityTracker.getDashboard();
export const executeProposal = (id: string) => activityTracker.executeProposal(id);
export const rejectProposal = (id: string, reason?: string) => activityTracker.rejectProposal(id, reason);
export const rollbackExecution = (id: string) => activityTracker.rollbackExecution(id);
