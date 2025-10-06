/**
 * Secure Agent Service - Replaces direct API calls with secure backend calls
 * 
 * This service provides the same interface as the original agent but uses
 * secure backend API calls instead of exposing API keys to the client.
 */

import { secureApi, LlmMessage, LlmResponse } from '../secureApi';
import { AGENT_TOOLS } from './tools';
import { executeAgentTool } from './toolExecutor';
import { AgentExecution, ExecutionStep } from './types';
import { QueryRouter } from './queryRouter';
import { MemoryManager } from '../memory/memoryManager';
import { PreRouter } from './preRouter';
import { ApplicationContext } from './applicationContext';
import { robustExecutor } from '../foundation/robustExecutor';
import { performanceMonitor } from '../foundation/performanceMonitor';
import { featureFlags } from '../foundation/featureFlags';
import { taskGraphExecutor } from '../evolution/taskGraphExecutor';

export class SecureClaudeAgent {
  private maxIterations = 10;
  private modelSonnet = 'claude-3-5-sonnet-20241022';
  private modelHaiku = 'claude-3-5-haiku-20241022';
  private router = new QueryRouter();
  private memoryManager = new MemoryManager();
  private preRouter = new PreRouter();
  private appContextManager = new ApplicationContext();

  // Cost tracking
  private estimatedCost = 0;

  async execute(
    userRequest: string,
    conversationHistory: any[],
    onStep?: (step: ExecutionStep) => void,
    forceModel?: 'haiku' | 'sonnet'
  ): Promise<AgentExecution> {
    
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Start performance tracking
    performanceMonitor.startTracking(requestId, 'agent_execution', {
      userRequest: userRequest.substring(0, 100),
      conversationLength: conversationHistory.length,
      forceModel
    });

    try {
      return await robustExecutor.executeWithRetry(
        async () => this.executeInternal(userRequest, conversationHistory, onStep, forceModel, requestId),
        'agent_execution',
        { maxRetries: 2, baseDelay: 1000 }
      );
    } finally {
      performanceMonitor.completeTracking(requestId, true);
    }
  }

  private async executeInternal(
    userRequest: string,
    conversationHistory: any[],
    onStep?: (step: ExecutionStep) => void,
    forceModel?: 'haiku' | 'sonnet',
    requestId?: string
  ): Promise<AgentExecution> {
    
    const startTime = Date.now();
    const steps: ExecutionStep[] = [];
    let currentModel = forceModel || 'haiku';

    try {
      // Step 1: Pre-routing (trivial queries)
      onStep?.({
        type: 'pre_routing',
        description: 'Checking if query can be handled without full agent',
        timestamp: Date.now(),
        metadata: { requestId }
      });

      const preRouteResult = await this.preRouter.checkTrivial(userRequest);
      if (!preRouteResult.shouldRoute) {
        const step: ExecutionStep = {
          type: 'pre_route_response',
          description: 'Query handled by pre-router',
          timestamp: Date.now(),
          metadata: { 
            requestId,
            response: preRouteResult.response,
            method: 'pre_route'
          }
        };
        steps.push(step);
        onStep?.(step);

        return {
          response: preRouteResult.response,
          steps,
          executionTime: Date.now() - startTime,
          modelUsed: 'pre-router',
          estimatedCost: 0,
          metadata: {
            requestId,
            method: 'pre_route',
            success: true
          }
        };
      }

      // Step 2: Query routing
      onStep?.({
        type: 'query_routing',
        description: 'Determining optimal search strategy',
        timestamp: Date.now(),
        metadata: { requestId }
      });

      const routeDecision = await this.router.routeQuery(userRequest);
      const step: ExecutionStep = {
        type: 'route_decision',
        description: `Route decision: ${routeDecision.strategy}`,
        timestamp: Date.now(),
        metadata: { 
          requestId,
          strategy: routeDecision.strategy,
          confidence: routeDecision.confidence,
          reason: routeDecision.reason
        }
      };
      steps.push(step);
      onStep?.(step);

      // Step 3: Memory context
      onStep?.({
        type: 'memory_context',
        description: 'Retrieving relevant memory context',
        timestamp: Date.now(),
        metadata: { requestId }
      });

      const memoryContext = await this.memoryManager.buildHotMemory();
      const memoryStep: ExecutionStep = {
        type: 'memory_retrieved',
        description: `Retrieved memory context (${memoryContext.length} characters)`,
        timestamp: Date.now(),
        metadata: { 
          requestId,
          contextLength: memoryContext.length
        }
      };
      steps.push(memoryStep);
      onStep?.(memoryStep);

      // Step 4: Application context
      onStep?.({
        type: 'app_context',
        description: 'Gathering application context',
        timestamp: Date.now(),
        metadata: { requestId }
      });

      const appContext = await this.appContextManager.getContext();
      const appStep: ExecutionStep = {
        type: 'app_context_retrieved',
        description: 'Application context gathered',
        timestamp: Date.now(),
        metadata: { 
          requestId,
          contextKeys: Object.keys(appContext)
        }
      };
      steps.push(appStep);
      onStep?.(appStep);

      // Step 5: Build system prompt
      const systemPrompt = this.buildSystemPrompt(memoryContext, appContext, routeDecision);
      
      // Step 6: Execute with Claude
      onStep?.({
        type: 'claude_execution',
        description: `Executing with Claude ${currentModel}`,
        timestamp: Date.now(),
        metadata: { requestId, model: currentModel }
      });

      const messages: LlmMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: userRequest }
      ];

      const claudeResponse = await this.callClaudeSecure(messages, currentModel);
      
      const claudeStep: ExecutionStep = {
        type: 'claude_response',
        description: 'Claude response received',
        timestamp: Date.now(),
        metadata: { 
          requestId,
          model: currentModel,
          responseLength: claudeResponse.content.length,
          usage: claudeResponse.usage
        }
      };
      steps.push(claudeStep);
      onStep?.(claudeStep);

      // Step 7: Tool execution if needed
      let toolResults: any[] = [];
      if (claudeResponse.content.includes('```json')) {
        onStep?.({
          type: 'tool_execution',
          description: 'Executing tools based on Claude response',
          timestamp: Date.now(),
          metadata: { requestId }
        });

        const toolCalls = this.extractToolCalls(claudeResponse.content);
        for (const toolCall of toolCalls) {
          try {
            const result = await executeAgentTool(toolCall.name, toolCall.args);
            toolResults.push({ tool: toolCall.name, result });
            
            const toolStep: ExecutionStep = {
              type: 'tool_executed',
              description: `Executed tool: ${toolCall.name}`,
              timestamp: Date.now(),
              metadata: { 
                requestId,
                toolName: toolCall.name,
                success: result.success
              }
            };
            steps.push(toolStep);
            onStep?.(toolStep);
          } catch (error) {
            const errorStep: ExecutionStep = {
              type: 'tool_error',
              description: `Tool execution failed: ${toolCall.name}`,
              timestamp: Date.now(),
              metadata: { 
                requestId,
                toolName: toolCall.name,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            };
            steps.push(errorStep);
            onStep?.(errorStep);
          }
        }
      }

      // Step 8: Final response synthesis
      let finalResponse = claudeResponse.content;
      if (toolResults.length > 0) {
        onStep?.({
          type: 'response_synthesis',
          description: 'Synthesizing final response with tool results',
          timestamp: Date.now(),
          metadata: { requestId, toolResultsCount: toolResults.length }
        });

        // If we have tool results, we might want to synthesize a final response
        // For now, we'll return the original response
        finalResponse = claudeResponse.content;
      }

      // Calculate estimated cost
      this.estimatedCost = this.calculateCost(claudeResponse.usage, currentModel);

      return {
        response: finalResponse,
        steps,
        executionTime: Date.now() - startTime,
        modelUsed: currentModel,
        estimatedCost: this.estimatedCost,
        metadata: {
          requestId,
          method: 'secure_agent',
          success: true,
          toolResultsCount: toolResults.length,
          usage: claudeResponse.usage
        }
      };

    } catch (error) {
      const errorStep: ExecutionStep = {
        type: 'execution_error',
        description: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        metadata: { 
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      steps.push(errorStep);
      onStep?.(errorStep);

      return {
        response: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        steps,
        executionTime: Date.now() - startTime,
        modelUsed: currentModel,
        estimatedCost: this.estimatedCost,
        metadata: {
          requestId,
          method: 'secure_agent',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Call Claude API securely through backend
   */
  private async callClaudeSecure(messages: LlmMessage[], model: string): Promise<LlmResponse> {
    try {
      return await secureApi.callLlm({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7
      });
    } catch (error) {
      console.error('Secure Claude API call failed:', error);
      throw new Error(`Claude API call failed: ${error}`);
    }
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(memoryContext: any, appContext: any, routeDecision: any): string {
    return `You are LOS (Life Operating System), an AI assistant that serves as an extension of the user's mind. You have access to their personal knowledge base and can help them manage information, learn, and grow.

CONTEXT:
- Memory Facts: ${memoryContext.facts.length} relevant facts
- Recent Conversations: ${memoryContext.conversations.length} conversations
- Application State: ${JSON.stringify(appContext, null, 2)}

SEARCH STRATEGY: ${routeDecision.strategy} (confidence: ${routeDecision.confidence})
REASONING: ${routeDecision.reason}

AVAILABLE TOOLS:
${AGENT_TOOLS.map(tool => `- ${tool.function.name}: ${tool.function.description}`).join('\n')}

INSTRUCTIONS:
1. Be proactive and helpful
2. Use tools when appropriate to access information
3. Provide actionable responses
4. Reference relevant context from memory
5. Be concise but comprehensive

Remember: You are an extension of the user's mind, not just a chatbot. Help them think, learn, and accomplish their goals.`;
  }

  /**
   * Extract tool calls from Claude response
   */
  private extractToolCalls(response: string): Array<{ name: string; args: any }> {
    const toolCalls: Array<{ name: string; args: any }> = [];
    
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const toolCall = JSON.parse(jsonMatch[1]);
        if (toolCall.tool && toolCall.args) {
          toolCalls.push({ name: toolCall.tool, args: toolCall.args });
        }
      }
    } catch (error) {
      console.warn('Failed to parse tool call from response:', error);
    }
    
    return toolCalls;
  }

  /**
   * Calculate estimated cost based on usage
   */
  private calculateCost(usage: any, model: string): number {
    if (!usage) return 0;
    
    const pricing = {
      'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 }
    };
    
    const modelPricing = pricing[model as keyof typeof pricing];
    if (!modelPricing) return 0;
    
    return (usage.input_tokens * modelPricing.input + usage.output_tokens * modelPricing.output) / 1000;
  }
}

// Export singleton instance
export const secureClaudeAgent = new SecureClaudeAgent();
