/**
 * Event Bus System - Centralized event orchestration for Library autonomy
 * 
 * This service provides a centralized event system for all Library autonomy features,
 * enabling loose coupling between components and comprehensive event tracking.
 */

import { featureFlags } from './foundation/featureFlags';

// Event type definitions
export type LibraryPayload =
  | { type: 'url'; url: string; title?: string; html?: string }
  | { type: 'pdf'; id: string; path: string; filename: string }
  | { type: 'text'; id: string; content: string; source?: string }
  | { type: 'image'; id: string; path: string }
  | { type: 'audio'; id: string; path: string; mime: string };

export type AppEvent =
  | { kind: 'library.item.created'; at: number; itemId: string; payload: LibraryPayload }
  | { kind: 'workflow.proposed'; at: number; planId: string; ruleId: string; preview: any }
  | { kind: 'workflow.executed'; at: number; planId: string; receiptId: string; result: any }
  | { kind: 'workflow.failed'; at: number; planId: string; error: string; retryable: boolean }
  | { kind: 'enrichment.started'; at: number; itemId: string; type: string }
  | { kind: 'enrichment.completed'; at: number; itemId: string; result: any }
  | { kind: 'enrichment.failed'; at: number; itemId: string; error: string }
  | { kind: 'policy.violation'; at: number; policy: string; details: any }
  | { kind: 'cost.threshold'; at: number; amount: number; threshold: number }
  | { kind: 'system.health'; at: number; status: 'healthy' | 'degraded' | 'critical'; metrics: any };

export interface EventSubscription {
  id: string;
  kinds: AppEvent['kind'][];
  handler: (event: AppEvent) => void;
  active: boolean;
}

export interface EventBusStats {
  totalEvents: number;
  eventsByKind: Record<string, number>;
  activeSubscriptions: number;
  lastEventAt?: number;
}

/**
 * Central Event Bus for Library autonomy system
 */
export class EventBus {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHistory: AppEvent[] = [];
  private maxHistorySize = 1000;
  private stats: EventBusStats = {
    totalEvents: 0,
    eventsByKind: {},
    activeSubscriptions: 0
  };

  /**
   * Emit an event to all relevant subscribers
   */
  emit(event: AppEvent): void {
    // Check if event bus is enabled
    if (!featureFlags.isEnabled('check_in_system')) {return;
    }

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Update stats
    this.stats.totalEvents++;
    this.stats.eventsByKind[event.kind] = (this.stats.eventsByKind[event.kind] || 0) + 1;
    this.stats.lastEventAt = event.at;

    // Notify subscribers
    const relevantSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active && sub.kinds.includes(event.kind));relevantSubscriptions.forEach(subscription => {
      try {
        subscription.handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.kind}:`, error);
      }
    });
  }

  /**
   * Subscribe to specific event kinds
   */
  subscribe(kinds: AppEvent['kind'][], handler: (event: AppEvent) => void): () => void {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      kinds,
      handler,
      active: true
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.stats.activeSubscriptions++;

    // Return unsubscribe function
    return () => {
      const sub = this.subscriptions.get(subscriptionId);
      if (sub) {
        sub.active = false;
        this.subscriptions.delete(subscriptionId);
        this.stats.activeSubscriptions--;}
    };
  }

  /**
   * Subscribe to a single event kind
   */
  subscribeTo(kind: AppEvent['kind'], handler: (event: AppEvent) => void): () => void {
    return this.subscribe([kind], handler);
  }

  /**
   * Get recent events of a specific kind
   */
  getRecentEvents(kind?: AppEvent['kind'], limit: number = 50): AppEvent[] {
    let events = this.eventHistory;
    
    if (kind) {
      events = events.filter(event => event.kind === kind);
    }
    
    return events.slice(-limit);
  }

  /**
   * Get events for a specific item
   */
  getItemEvents(itemId: string): AppEvent[] {
    return this.eventHistory.filter(event => 
      'itemId' in event && event.itemId === itemId
    );
  }

  /**
   * Get event bus statistics
   */
  getStats(): EventBusStats {
    return { ...this.stats };
  }

  /**
   * Clear event history (useful for testing)
   */
  clearHistory(): void {
    this.eventHistory = [];
    this.stats = {
      totalEvents: 0,
      eventsByKind: {},
      activeSubscriptions: this.stats.activeSubscriptions,
      lastEventAt: undefined
    };
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active);
  }

  /**
   * Emit library item created event
   */
  emitLibraryItemCreated(itemId: string, payload: LibraryPayload): void {
    this.emit({
      kind: 'library.item.created',
      at: Date.now(),
      itemId,
      payload
    });
  }

  /**
   * Emit workflow proposed event
   */
  emitWorkflowProposed(planId: string, ruleId: string, preview: any): void {
    this.emit({
      kind: 'workflow.proposed',
      at: Date.now(),
      planId,
      ruleId,
      preview
    });
  }

  /**
   * Emit workflow executed event
   */
  emitWorkflowExecuted(planId: string, receiptId: string, result: any): void {
    this.emit({
      kind: 'workflow.executed',
      at: Date.now(),
      planId,
      receiptId,
      result
    });
  }

  /**
   * Emit workflow failed event
   */
  emitWorkflowFailed(planId: string, error: string, retryable: boolean = true): void {
    this.emit({
      kind: 'workflow.failed',
      at: Date.now(),
      planId,
      error,
      retryable
    });
  }

  /**
   * Emit enrichment started event
   */
  emitEnrichmentStarted(itemId: string, type: string): void {
    this.emit({
      kind: 'enrichment.started',
      at: Date.now(),
      itemId,
      type
    });
  }

  /**
   * Emit enrichment completed event
   */
  emitEnrichmentCompleted(itemId: string, result: any): void {
    this.emit({
      kind: 'enrichment.completed',
      at: Date.now(),
      itemId,
      result
    });
  }

  /**
   * Emit enrichment failed event
   */
  emitEnrichmentFailed(itemId: string, error: string): void {
    this.emit({
      kind: 'enrichment.failed',
      at: Date.now(),
      itemId,
      error
    });
  }

  /**
   * Emit policy violation event
   */
  emitPolicyViolation(policy: string, details: any): void {
    this.emit({
      kind: 'policy.violation',
      at: Date.now(),
      policy,
      details
    });
  }

  /**
   * Emit cost threshold event
   */
  emitCostThreshold(amount: number, threshold: number): void {
    this.emit({
      kind: 'cost.threshold',
      at: Date.now(),
      amount,
      threshold
    });
  }

  /**
   * Emit system health event
   */
  emitSystemHealth(status: 'healthy' | 'degraded' | 'critical', metrics: any): void {
    this.emit({
      kind: 'system.health',
      at: Date.now(),
      status,
      metrics
    });
  }
}

// Global event bus instance
export const eventBus = new EventBus();

// Export convenience functions
export const emitEvent = (event: AppEvent) => eventBus.emit(event);
export const subscribeToEvents = (kinds: AppEvent['kind'][], handler: (event: AppEvent) => void) => 
  eventBus.subscribe(kinds, handler);
export const subscribeToEvent = (kind: AppEvent['kind'], handler: (event: AppEvent) => void) => 
  eventBus.subscribeTo(kind, handler);
