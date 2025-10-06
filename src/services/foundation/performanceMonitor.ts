/**
 * Performance Monitoring and Metrics Collection System
 * Tracks agent performance, costs, and system health
 */

export interface PerformanceMetrics {
  requestId: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tokenCount: number;
  cost: number;
  model: string;
  toolsUsed: string[];
  cacheHits: number;
  errors: string[];
  success: boolean;
  metadata?: any;
}

export interface PerformanceBaseline {
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  memoryUsage: number;
  costPerRequest: number;
  monthlyCost: number;
  successRate: number;
  errorRate: number;
  requestsPerDay: number;
  toolUsageDistribution: Record<string, number>;
  timestamp: Date;
}

export interface PerformanceReport {
  current: PerformanceMetrics[];
  baseline: PerformanceBaseline;
  comparison: {
    responseTimeChange: number;
    costChange: number;
    successRateChange: number;
    memoryChange: number;
  };
  recommendations: string[];
  alerts: string[];
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private baseline: PerformanceBaseline | null = null;
  private dailyMetrics: Map<string, PerformanceMetrics[]> = new Map();
  private alerts: string[] = [];

  /**
   * Start tracking a performance metric
   */
  startTracking(requestId: string, operationName: string, metadata?: any): void {
    const metric: PerformanceMetrics = {
      requestId,
      operationName,
      startTime: new Date(),
      tokenCount: 0,
      cost: 0,
      model: 'unknown',
      toolsUsed: [],
      cacheHits: 0,
      errors: [],
      success: false,
      metadata
    };

    this.metrics.set(requestId, metric);
  }

  /**
   * Update metric with intermediate data
   */
  updateMetric(requestId: string, updates: Partial<PerformanceMetrics>): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      Object.assign(metric, updates);
      this.metrics.set(requestId, metric);
    }
  }

  /**
   * Complete tracking and finalize metric
   */
  completeTracking(requestId: string, success: boolean, errors: string[] = []): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.endTime = new Date();
      metric.duration = metric.endTime.getTime() - metric.startTime.getTime();
      metric.success = success;
      metric.errors = errors;

      // Store in daily metrics
      const today = new Date().toISOString().split('T')[0];
      if (!this.dailyMetrics.has(today)) {
        this.dailyMetrics.set(today, []);
      }
      this.dailyMetrics.get(today)!.push(metric);

      // Check for performance issues
      this.checkPerformanceAlerts(metric);

      // Clean up old metrics (keep last 1000)
      if (this.metrics.size > 1000) {
        const oldestKey = this.metrics.keys().next().value;
        this.metrics.delete(oldestKey);
      }
    }
  }

  /**
   * Track tool usage
   */
  trackToolUsage(requestId: string, toolName: string, duration: number, success: boolean): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.toolsUsed.push(toolName);
      if (!metric.metadata) metric.metadata = {};
      if (!metric.metadata.toolMetrics) metric.metadata.toolMetrics = [];
      
      metric.metadata.toolMetrics.push({
        tool: toolName,
        duration,
        success,
        timestamp: new Date()
      });
    }
  }

  /**
   * Track cache hit
   */
  trackCacheHit(requestId: string, cacheKey: string): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.cacheHits++;
      if (!metric.metadata) metric.metadata = {};
      if (!metric.metadata.cacheHits) metric.metadata.cacheHits = [];
      
      metric.metadata.cacheHits.push({
        key: cacheKey,
        timestamp: new Date()
      });
    }
  }

  /**
   * Establish performance baseline
   */
  async establishBaseline(): Promise<PerformanceBaseline> {
    const recentMetrics = this.getRecentMetrics(7); // Last 7 days
    
    if (recentMetrics.length === 0) {
      throw new Error('No metrics available to establish baseline');
    }

    const durations = recentMetrics.map(m => m.duration || 0).filter(d => d > 0);
    const costs = recentMetrics.map(m => m.cost);
    const successes = recentMetrics.filter(m => m.success);
    const errors = recentMetrics.filter(m => !m.success);

    // Calculate percentiles
    durations.sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    // Calculate tool usage distribution
    const toolUsage: Record<string, number> = {};
    recentMetrics.forEach(metric => {
      metric.toolsUsed.forEach(tool => {
        toolUsage[tool] = (toolUsage[tool] || 0) + 1;
      });
    });

    this.baseline = {
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95ResponseTime: durations[p95Index] || 0,
      p99ResponseTime: durations[p99Index] || 0,
      memoryUsage: await this.getCurrentMemoryUsage(),
      costPerRequest: costs.reduce((a, b) => a + b, 0) / costs.length,
      monthlyCost: costs.reduce((a, b) => a + b, 0) * 30, // Estimate monthly
      successRate: successes.length / recentMetrics.length,
      errorRate: errors.length / recentMetrics.length,
      requestsPerDay: recentMetrics.length / 7,
      toolUsageDistribution: toolUsage,
      timestamp: new Date()
    };return this.baseline;
  }

  /**
   * Get current performance report
   */
  getPerformanceReport(): PerformanceReport {
    const recentMetrics = this.getRecentMetrics(1); // Last 24 hours
    const currentBaseline = this.baseline;

    if (!currentBaseline) {
      throw new Error('No baseline established. Call establishBaseline() first.');
    }

    // Calculate current averages
    const currentAvgResponseTime = recentMetrics.length > 0 
      ? recentMetrics.map(m => m.duration || 0).reduce((a, b) => a + b, 0) / recentMetrics.length 
      : 0;
    
    const currentAvgCost = recentMetrics.length > 0
      ? recentMetrics.map(m => m.cost).reduce((a, b) => a + b, 0) / recentMetrics.length
      : 0;

    const currentSuccessRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => m.success).length / recentMetrics.length
      : 0;

    // Calculate changes
    const responseTimeChange = currentBaseline.averageResponseTime > 0
      ? ((currentAvgResponseTime - currentBaseline.averageResponseTime) / currentBaseline.averageResponseTime) * 100
      : 0;

    const costChange = currentBaseline.costPerRequest > 0
      ? ((currentAvgCost - currentBaseline.costPerRequest) / currentBaseline.costPerRequest) * 100
      : 0;

    const successRateChange = currentBaseline.successRate > 0
      ? ((currentSuccessRate - currentBaseline.successRate) / currentBaseline.successRate) * 100
      : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(recentMetrics, currentBaseline);

    return {
      current: recentMetrics,
      baseline: currentBaseline,
      comparison: {
        responseTimeChange,
        costChange,
        successRateChange,
        memoryChange: 0 // TODO: Implement memory tracking
      },
      recommendations,
      alerts: this.alerts
    };
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(metric: PerformanceMetrics): void {
    if (!this.baseline) return;

    // Response time alert
    if (metric.duration && metric.duration > this.baseline.p95ResponseTime * 2) {
      this.addAlert(`Slow response detected: ${metric.operationName} took ${metric.duration}ms`);
    }

    // Cost alert
    if (metric.cost > this.baseline.costPerRequest * 3) {
      this.addAlert(`High cost detected: ${metric.operationName} cost $${metric.cost.toFixed(4)}`);
    }

    // Error rate alert
    const recentErrors = this.getRecentMetrics(1).filter(m => !m.success);
    if (recentErrors.length > 5) {
      this.addAlert(`High error rate: ${recentErrors.length} errors in last 24 hours`);
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics[], baseline: PerformanceBaseline): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    const avgResponseTime = metrics.length > 0 
      ? metrics.map(m => m.duration || 0).reduce((a, b) => a + b, 0) / metrics.length 
      : 0;

    if (avgResponseTime > baseline.averageResponseTime * 1.5) {
      recommendations.push('Consider implementing response caching to improve response times');
    }

    // Cost recommendations
    const avgCost = metrics.length > 0
      ? metrics.map(m => m.cost).reduce((a, b) => a + b, 0) / metrics.length
      : 0;

    if (avgCost > baseline.costPerRequest * 1.3) {
      recommendations.push('Consider using Haiku model for simpler queries to reduce costs');
    }

    // Cache recommendations
    const cacheHitRate = metrics.length > 0
      ? metrics.map(m => m.cacheHits).reduce((a, b) => a + b, 0) / metrics.length
      : 0;

    if (cacheHitRate < 0.1) {
      recommendations.push('Low cache hit rate detected. Consider implementing more aggressive caching');
    }

    // Tool usage recommendations
    const toolUsage: Record<string, number> = {};
    metrics.forEach(metric => {
      metric.toolsUsed.forEach(tool => {
        toolUsage[tool] = (toolUsage[tool] || 0) + 1;
      });
    });

    const mostUsedTool = Object.entries(toolUsage).sort(([,a], [,b]) => b - a)[0];
    if (mostUsedTool && mostUsedTool[1] > metrics.length * 0.8) {
      recommendations.push(`Tool ${mostUsedTool[0]} is used in ${(mostUsedTool[1]/metrics.length*100).toFixed(1)}% of requests. Consider optimization.`);
    }

    return recommendations;
  }

  /**
   * Get recent metrics
   */
  private getRecentMetrics(days: number): PerformanceMetrics[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const allMetrics: PerformanceMetrics[] = [];
    for (const dayMetrics of this.dailyMetrics.values()) {
      allMetrics.push(...dayMetrics);
    }

    return allMetrics.filter(metric => metric.startTime >= cutoff);
  }

  /**
   * Get current memory usage (simplified)
   */
  private async getCurrentMemoryUsage(): Promise<number> {
    // This is a simplified implementation
    // In a real implementation, you'd use performance.memory API or similar
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Add alert
   */
  private addAlert(message: string): void {
    this.alerts.push(`${new Date().toISOString()}: ${message}`);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const allMetrics = Array.from(this.metrics.values());
    return JSON.stringify({
      metrics: allMetrics,
      baseline: this.baseline,
      alerts: this.alerts,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics.clear();
    this.dailyMetrics.clear();
    this.alerts = [];
    this.baseline = null;
  }
}

// Global instance for use throughout the application
export const performanceMonitor = new PerformanceMonitor();
