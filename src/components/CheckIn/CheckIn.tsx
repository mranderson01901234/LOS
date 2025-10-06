/**
 * Check-In Component - Centralized activity feed and proposal management
 * 
 * This component provides the main Check-In interface for Library autonomy,
 * showing activities, proposals, and system status.
 */

import { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  RotateCcw, 
  RefreshCw,
  TrendingUp,
  DollarSign,
  Zap,
  Eye,
  EyeOff,
  Filter,
  Search,
  Bell,
  Settings
} from 'lucide-react';
import { activityTracker, getDashboard, executeProposal, rejectProposal, rollbackExecution } from '../../services/activityTracker';
import { featureFlags } from '../../services/foundation/featureFlags';
import type { 
  CheckInActivity, 
  ProposalActivity, 
  CheckInDashboard,
  ActivityFilter 
} from '../../types/activity';

interface CheckInProps {
  className?: string;
}

export function CheckIn({ className = '' }: CheckInProps) {
  const [dashboard, setDashboard] = useState<CheckInDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'proposals' | 'yesterday' | 'stats'>('recent');
  const [filter, setFilter] = useState<ActivityFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!featureFlags.isEnabled('check_in_system')) {
      setIsLoading(false);
      return;
    }

    loadDashboard();
    
    // Subscribe to activity updates
    const unsubscribe = activityTracker.subscribe((activity) => {
      loadDashboard();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadDashboard = async () => {
    try {
      const dashboardData = getDashboard();
      setDashboard(dashboardData);
      setNotifications(activityTracker.getNotifications());
    } catch (error) {
      console.error('Failed to load Check-In dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteProposal = async (proposalId: string) => {
    try {
      const success = await executeProposal(proposalId);
      if (success) {
        loadDashboard();
      }
    } catch (error) {
      console.error('Failed to execute proposal:', error);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      const success = await rejectProposal(proposalId, 'Rejected by user');
      if (success) {
        loadDashboard();
      }
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    }
  };

  const handleRollbackExecution = async (executionId: string) => {
    try {
      const success = await rollbackExecution(executionId);
      if (success) {
        loadDashboard();
      }
    } catch (error) {
      console.error('Failed to rollback execution:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (activity: CheckInActivity) => {
    switch (activity.type) {
      case 'ingestion':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'enrichment':
        return <Zap className="w-4 h-4 text-purple-500" />;
      case 'proposal':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'execution':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'policy_violation':
        return <XCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!featureFlags.isEnabled('check_in_system')) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <div className="text-center">
          <Activity className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Check-In System</h2>
          <p className="text-text-secondary">The Check-In system is currently disabled.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-accent-white animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading Check-In...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to Load</h2>
          <p className="text-text-secondary">Unable to load Check-In dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full bg-bg-primary ${className}`}>
      {/* Header */}
      <div className="border-b border-border-primary p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Check-In</h1>
            <p className="text-text-secondary">Library autonomy activity feed</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            >
              <Bell className="w-5 h-5 text-text-primary" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={loadDashboard}
              className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-text-primary" />
            </button>
          </div>
        </div>

        {/* System Health */}
        <div className="mt-4 flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              dashboard.systemHealth.status === 'healthy' ? 'bg-green-500' :
              dashboard.systemHealth.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-text-secondary">
              System: {dashboard.systemHealth.status}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">
              Active: {dashboard.systemHealth.activeTasks}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">
              Avg: {Math.round(dashboard.systemHealth.averageResponseTime)}ms
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-primary">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'recent', label: 'Recent', count: dashboard.recentActivities.length },
            { id: 'proposals', label: 'Proposals', count: dashboard.pendingProposals.length },
            { id: 'yesterday', label: 'Yesterday', count: dashboard.yesterdayStats.total },
            { id: 'stats', label: 'Stats', count: dashboard.todayStats.total }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent-white text-accent-white'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-bg-secondary rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'recent' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Activities</h2>
            {dashboard.recentActivities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary">No recent activities</p>
              </div>
            ) : (
              dashboard.recentActivities.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 rounded-lg bg-bg-secondary border border-border-primary"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-text-primary truncate">
                        {activity.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(activity.status)}
                        <span className="text-xs text-text-secondary">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-text-secondary mt-1">
                      {activity.description}
                    </p>
                    
                    {activity.metadata && (
                      <div className="mt-2 text-xs text-text-tertiary">
                        {activity.type === 'proposal' && (
                          <div className="flex items-center space-x-4">
                            <span>Plan: {activity.planId}</span>
                            <span>Rule: {(activity as ProposalActivity).ruleId}</span>
                          </div>
                        )}
                        {activity.type === 'execution' && (
                          <div className="flex items-center space-x-4">
                            <span>Receipt: {(activity as any).receiptId}</span>
                            <span>Cost: ${(activity as any).actualCost || 0}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'proposals' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Pending Proposals</h2>
            {dashboard.pendingProposals.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary">No pending proposals</p>
              </div>
            ) : (
              dashboard.pendingProposals.map(proposal => (
                <div
                  key={proposal.id}
                  className="p-6 rounded-lg bg-bg-secondary border border-border-primary"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        {proposal.title}
                      </h3>
                      <p className="text-text-secondary mt-1">
                        {proposal.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-text-secondary">
                        {formatTimestamp(proposal.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Proposal Details */}
                  <div className="mb-4 p-4 rounded-lg bg-bg-tertiary">
                    <h4 className="text-sm font-medium text-text-primary mb-2">Proposed Actions:</h4>
                    <div className="space-y-2">
                      {proposal.actions.map((action, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Play className="w-3 h-3 text-text-secondary" />
                          <span className="text-sm text-text-secondary">
                            {action.tool}: {action.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost and Time Estimates */}
                  <div className="flex items-center space-x-6 mb-4 text-sm text-text-secondary">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4" />
                      <span>${proposal.estimatedCost}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{proposal.estimatedTime}s</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleExecuteProposal(proposal.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>Run</span>
                    </button>
                    
                    <button
                      onClick={() => handleRejectProposal(proposal.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 px-4 py-2 bg-bg-tertiary hover:bg-bg-quaternary text-text-primary rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'yesterday' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Yesterday's Activities</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-text-primary">Total Activities</span>
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {dashboard.yesterdayStats.total}
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-text-primary">Success Rate</span>
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {Math.round(dashboard.yesterdayStats.successRate * 100)}%
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium text-text-primary">Avg Time</span>
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {Math.round(dashboard.yesterdayStats.averageProcessingTime)}ms
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Today's Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(dashboard.todayStats.byType).map(([type, count]) => (
                <div key={type} className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
                  <div className="text-sm font-medium text-text-primary capitalize mb-1">
                    {type.replace('_', ' ')}
                  </div>
                  <div className="text-2xl font-bold text-text-primary">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
