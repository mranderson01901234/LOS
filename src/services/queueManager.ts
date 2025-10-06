/**
 * Background Queue Manager - Persistent background task execution with retry mechanisms
 * 
 * This service manages background tasks for Library autonomy features,
 * providing reliable execution with retry logic and progress tracking.
 */

import { eventBus, AppEvent } from './eventBus';
import { featureFlags } from './foundation/featureFlags';
import { performanceMonitor } from './foundation/performanceMonitor';

export type QueueTaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

export interface QueueTask {
  id: string;
  type: string;
  payload: any;
  status: QueueTaskStatus;
  priority: number; // Higher numbers = higher priority
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

export interface QueueStats {
  totalTasks: number;
  tasksByStatus: Record<QueueTaskStatus, number>;
  tasksByType: Record<string, number>;
  averageExecutionTime: number;
  successRate: number;
  lastProcessedAt?: number;
}

export interface QueueConfig {
  maxConcurrentTasks: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  retryBackoffMultiplier: number;
  taskTimeoutMs: number;
}

/**
 * Background Queue Manager for Library autonomy tasks
 */
export class QueueManager {
  private tasks: Map<string, QueueTask> = new Map();
  private runningTasks: Set<string> = new Set();
  private config: QueueConfig;
  private stats: QueueStats;
  private isProcessing: boolean = false;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxConcurrentTasks: 3,
      retryDelayMs: 1000,
      maxRetryDelayMs: 30000,
      retryBackoffMultiplier: 2,
      taskTimeoutMs: 300000, // 5 minutes
      ...config
    };

    this.stats = {
      totalTasks: 0,
      tasksByStatus: {
        queued: 0,
        running: 0,
        success: 0,
        failed: 0,
        cancelled: 0
      },
      tasksByType: {},
      averageExecutionTime: 0,
      successRate: 0
    };
  }

  /**
   * Add a task to the queue
   */
  async addTask(task: Omit<QueueTask, 'id' | 'status' | 'createdAt' | 'retryCount'>): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueTask: QueueTask = {
      ...task,
      id: taskId,
      status: 'queued',
      createdAt: Date.now(),
      retryCount: 0
    };

    this.tasks.set(taskId, queueTask);
    this.updateStats();

    // Emit task queued event
    eventBus.emitWorkflowQueued(taskId, task.type, task.payload);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return taskId;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): QueueTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): QueueTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'running') {
      this.runningTasks.delete(taskId);
    }

    task.status = 'cancelled';
    task.completedAt = Date.now();
    this.updateStats();

    // Emit task cancelled event
    eventBus.emitWorkflowCancelled(taskId);

    return true;
  }

  /**
   * Clear completed tasks
   */
  clearCompletedTasks(): number {
    let cleared = 0;
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'success' || task.status === 'failed' || task.status === 'cancelled') {
        this.tasks.delete(taskId);
        cleared++;
      }
    }
    this.updateStats();
    return cleared;
  }

  /**
   * Start processing tasks
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.isProcessing) {
      try {
        // Get next task to process
        const nextTask = this.getNextTask();
        
        if (nextTask) {
          await this.processTask(nextTask);
        } else {
          // No tasks to process, wait a bit
          await this.sleep(1000);
        }
      } catch (error) {
        console.error('QueueManager: Error in processing loop:', error);
        await this.sleep(5000);
      }
    }
  }

  /**
   * Stop processing tasks
   */
  stopProcessing(): void {
    this.isProcessing = false;
  }

  /**
   * Get next task to process based on priority
   */
  private getNextTask(): QueueTask | null {
    const queuedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'queued')
      .sort((a, b) => b.priority - a.priority);

    return queuedTasks[0] || null;
  }

  /**
   * Process a single task
   */
  private async processTask(task: QueueTask): Promise<void> {
    if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
      return; // Wait for a slot to become available
    }

    // Mark as running
    task.status = 'running';
    task.startedAt = Date.now();
    this.runningTasks.add(task.id);
    this.updateStats();

    const requestId = `queue_${task.id}`;

    try {
      // Execute the task
      const result = await this.executeTask(task);
      
      // Mark as successful
      task.status = 'success';
      task.completedAt = Date.now();
      task.result = result;

      // Emit success event
      eventBus.emitWorkflowCompleted(task.id, result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if we should retry
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'queued';
        task.error = errorMessage;
        console.warn(`QueueManager: Retrying ${task.type} task (${task.id}), attempt ${task.retryCount}`);
        
        // Calculate retry delay with exponential backoff
        const delay = Math.min(
          this.config.retryDelayMs * Math.pow(this.config.retryBackoffMultiplier, task.retryCount - 1),
          this.config.maxRetryDelayMs
        );
        
        // Schedule retry
        setTimeout(() => {
          if (this.tasks.has(task.id)) {
            this.processTask(task);
          }
        }, delay);
        
      } else {
        // Max retries exceeded, mark as failed
        task.status = 'failed';
        task.completedAt = Date.now();
        task.error = errorMessage;
        
        console.error(`QueueManager: Failed ${task.type} task (${task.id}) after ${task.maxRetries} retries`);
        
        // Emit failure event
        eventBus.emitWorkflowFailed(task.id, errorMessage, false);
      }
    } finally {
      this.runningTasks.delete(task.id);
      this.updateStats();
    }
  }

  /**
   * Execute a task based on its type
   */
  private async executeTask(task: QueueTask): Promise<any> {
    switch (task.type) {
      case 'document_processing':
        return await this.processDocument(task.payload);
      case 'content_analysis':
        return await this.analyzeContent(task.payload);
      case 'data_sync':
        return await this.syncData(task.payload);
      case 'cleanup':
        return await this.performCleanup(task.payload);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Process document task
   */
  private async processDocument(payload: any): Promise<any> {
    // Implementation for document processing
    console.log('Processing document:', payload);
    return { processed: true, documentId: payload.documentId };
  }

  /**
   * Analyze content task
   */
  private async analyzeContent(payload: any): Promise<any> {
    // Implementation for content analysis
    console.log('Analyzing content:', payload);
    return { analyzed: true, contentId: payload.contentId };
  }

  /**
   * Sync data task
   */
  private async syncData(payload: any): Promise<any> {
    // Implementation for data synchronization
    console.log('Syncing data:', payload);
    return { synced: true, dataId: payload.dataId };
  }

  /**
   * Perform cleanup task
   */
  private async performCleanup(payload: any): Promise<any> {
    // Implementation for cleanup operations
    console.log('Performing cleanup:', payload);
    return { cleaned: true, cleanupId: payload.cleanupId };
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const tasks = Array.from(this.tasks.values());
    
    this.stats.totalTasks = tasks.length;
    this.stats.tasksByStatus = {
      queued: tasks.filter(t => t.status === 'queued').length,
      running: tasks.filter(t => t.status === 'running').length,
      success: tasks.filter(t => t.status === 'success').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length
    };

    // Calculate success rate
    const completedTasks = tasks.filter(t => t.status === 'success' || t.status === 'failed');
    if (completedTasks.length > 0) {
      this.stats.successRate = completedTasks.filter(t => t.status === 'success').length / completedTasks.length;
    }

    // Calculate average execution time
    const tasksWithDuration = tasks.filter(t => t.startedAt && t.completedAt);
    if (tasksWithDuration.length > 0) {
      const totalDuration = tasksWithDuration.reduce((sum, t) => sum + (t.completedAt! - t.startedAt!), 0);
      this.stats.averageExecutionTime = totalDuration / tasksWithDuration.length;
    }

    this.stats.lastProcessedAt = Date.now();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const queueManager = new QueueManager();