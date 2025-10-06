/**
 * Rules Engine UI Component - Display and manage rules
 * 
 * This component provides a UI for viewing rules, their status,
 * and execution statistics.
 */

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Play, 
  Pause, 
  Eye, 
  MessageCircle, 
  Zap, 
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { rulesEngine } from '../../services/rulesEngine';
import { featureFlags } from '../../services/foundation/featureFlags';
import type { Rule, RuleEngineStats, RuleMode } from '../../types/rules';

interface RulesEngineProps {
  className?: string;
}

export function RulesEngine({ className = '' }: RulesEngineProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [stats, setStats] = useState<RuleEngineStats | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'stats' | 'executions'>('rules');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!featureFlags.isEnabled('rules_engine')) {
      setIsLoading(false);
      return;
    }

    loadRulesData();
  }, []);

  const loadRulesData = async () => {
    try {
      setIsLoading(true);
      
      const allRules = rulesEngine.getAllRules();
      setRules(allRules);
      
      const engineStats = rulesEngine.getStats();
      setStats(engineStats);
      
    } catch (error) {
      console.error('Failed to load rules data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    rulesEngine.setRuleEnabled(ruleId, enabled);
    loadRulesData(); // Refresh data
  };

  const getModeIcon = (mode: RuleMode) => {
    switch (mode) {
      case 'observe':
        return <Eye className="w-4 h-4" />;
      case 'ask':
        return <MessageCircle className="w-4 h-4" />;
      case 'auto':
        return <Zap className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getModeColor = (mode: RuleMode) => {
    switch (mode) {
      case 'observe':
        return 'text-blue-400';
      case 'ask':
        return 'text-yellow-400';
      case 'auto':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (rule: Rule) => {
    if (!rule.enabled) {
      return <Pause className="w-4 h-4 text-gray-400" />;
    }
    
    if (rule.metadata.executionCount === 0) {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    
    const successRate = rule.metadata.executionCount > 0 
      ? rule.metadata.successCount / rule.metadata.executionCount 
      : 0;
    
    if (successRate >= 0.8) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    } else if (successRate >= 0.5) {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  if (!featureFlags.isEnabled('rules_engine')) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <div className="text-center">
          <Settings className="w-16 h-16 text-text-secondary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Rules Engine</h2>
          <p className="text-text-secondary">The Rules Engine requires the feature flag to be enabled.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-accent-white animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading Rules Engine...</p>
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
            <h1 className="text-2xl font-bold text-text-primary">Rules Engine</h1>
            <p className="text-text-secondary">Automated decision-making and workflow management</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={loadRulesData}
              className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-text-primary" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-primary">
        <div className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-4 px-2 border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-accent-white text-accent-white'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Settings className="w-4 h-4 mr-2 inline" />
            Rules
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 px-2 border-b-2 transition-colors ${
              activeTab === 'stats'
                ? 'border-accent-white text-accent-white'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('executions')}
            className={`py-4 px-2 border-b-2 transition-colors ${
              activeTab === 'executions'
                ? 'border-accent-white text-accent-white'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Clock className="w-4 h-4 mr-2 inline" />
            Executions
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Active Rules</h2>
              <div className="text-sm text-text-secondary">
                {rules.filter(r => r.enabled).length} of {rules.length} enabled
              </div>
            </div>
            
            {rules.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary">No rules configured</p>
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className="bg-bg-secondary rounded-lg border border-border-primary p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(rule)}
                        <h3 className="text-base font-medium text-text-primary">{rule.name}</h3>
                        <div className={`flex items-center space-x-1 ${getModeColor(rule.mode)}`}>
                          {getModeIcon(rule.mode)}
                          <span className="text-sm capitalize">{rule.mode}</span>
                        </div>
                        <span className="text-xs text-text-tertiary bg-bg-tertiary px-2 py-1 rounded">
                          Priority {rule.priority}
                        </span>
                      </div>
                      
                      <p className="text-sm text-text-secondary mb-3">{rule.description}</p>
                      
                      <div className="flex items-center space-x-6 text-xs text-text-tertiary mb-4">
                        <span>Executions: {rule.metadata.executionCount}</span>
                        <span>Success Rate: {rule.metadata.executionCount > 0 
                          ? Math.round((rule.metadata.successCount / rule.metadata.executionCount) * 100)
                          : 0}%</span>
                        <span>Avg Time: {Math.round(rule.metadata.averageExecutionTime)}ms</span>
                        <span>Category: {rule.metadata.category}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-text-tertiary">Triggers:</span>
                        {rule.triggers.map(trigger => (
                          <span key={trigger.id} className="text-xs bg-bg-tertiary px-2 py-1 rounded">
                            {trigger.event}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          rule.enabled
                            ? 'bg-bg-primary hover:bg-bg-hover text-text-primary border border-border-primary'
                            : 'bg-bg-primary hover:bg-bg-hover text-text-secondary border border-border-primary'
                        }`}
                      >
                        {rule.enabled ? (
                          <>
                            <Pause className="w-4 h-4 mr-2 inline" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2 inline" />
                            Enable
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text-primary">Engine Statistics</h2>
            
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 text-center">
                <div className="text-2xl font-bold text-text-primary">{stats.totalRules}</div>
                <div className="text-xs text-text-secondary">Total Rules</div>
              </div>
              <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 text-center">
                <div className="text-2xl font-bold text-text-primary">{stats.enabledRules}</div>
                <div className="text-xs text-text-secondary">Enabled</div>
              </div>
              <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 text-center">
                <div className="text-2xl font-bold text-text-primary">{stats.totalExecutions}</div>
                <div className="text-xs text-text-secondary">Executions</div>
              </div>
              <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 text-center">
                <div className="text-2xl font-bold text-text-primary">{Math.round(stats.averageExecutionTime)}ms</div>
                <div className="text-xs text-text-secondary">Avg Time</div>
              </div>
            </div>
            
            {/* Rules by Mode */}
            <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
              <h3 className="text-sm font-medium text-text-primary mb-4">Rules by Mode</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(stats.rulesByMode).map(([mode, count]) => (
                  <div key={mode} className="text-center">
                    <div className={`text-2xl font-bold ${getModeColor(mode as RuleMode)}`}>{count}</div>
                    <div className="text-xs text-text-secondary capitalize">{mode}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Top Performing Rules */}
            {stats.topPerformingRules.length > 0 && (
              <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
                <h3 className="text-sm font-medium text-text-primary mb-4">Top Performing Rules</h3>
                <div className="space-y-3">
                  {stats.topPerformingRules.map(rule => (
                    <div key={rule.ruleId} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{rule.ruleName}</div>
                        <div className="text-xs text-text-secondary">{rule.executionCount} executions</div>
                      </div>
                      <div className="text-sm font-medium text-text-primary">
                        {Math.round(rule.successRate * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'executions' && stats && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Recent Executions</h2>
            
            {stats.recentExecutions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary">No executions yet</p>
              </div>
            ) : (
              stats.recentExecutions.map(execution => (
                <div key={execution.id} className="bg-bg-secondary rounded-lg border border-border-primary p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="text-sm font-medium text-text-primary">
                          {rules.find(r => r.id === execution.ruleId)?.name || 'Unknown Rule'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          execution.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                          execution.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                          'bg-yellow-600/20 text-yellow-400'
                        }`}>
                          {execution.status}
                        </span>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {new Date(execution.startTime).toLocaleString()} • 
                        Duration: {execution.duration || 0}ms • 
                        Results: {execution.results.length}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
