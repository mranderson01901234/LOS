/**
 * Task Graph Executor - Advanced Planning and Execution System
 * Implements Plan → Act → Observe → Re-plan cycles for intelligent task execution
 */

export interface TaskNode {
  id: string;
  type: 'action' | 'decision' | 'parallel' | 'sequential' | 'conditional';
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  dependencies: string[];
  children?: string[];
  tool?: string;
  toolInput?: any;
  condition?: string;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  metadata?: any;
}

export interface TaskGraph {
  id: string;
  name: string;
  description: string;
  rootNode: string;
  nodes: Map<string, TaskNode>;
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  executionHistory: TaskExecution[];
  metadata?: any;
}

export interface TaskExecution {
  nodeId: string;
  action: string;
  input: any;
  result: any;
  success: boolean;
  error?: string;
  duration: number;
  timestamp: Date;
}

export interface PlanningContext {
  userRequest: string;
  conversationHistory: any[];
  availableTools: string[];
  memoryContext?: any;
  constraints?: {
    maxSteps?: number;
    maxCost?: number;
    maxDuration?: number;
    preferredModel?: string;
  };
}

export class TaskGraphExecutor {
  private graphs: Map<string, TaskGraph> = new Map();
  private executionQueue: string[] = [];
  private isExecuting = false;

  /**
   * Create a new task graph from a user request
   */
  async createTaskGraph(
    userRequest: string,
    conversationHistory: any[],
    context?: Partial<PlanningContext>
  ): Promise<TaskGraph> {
    // Reduced logging to prevent console spam
    const graphId = `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const planningContext: PlanningContext = {
      userRequest,
      conversationHistory,
      availableTools: await this.getAvailableTools(),
      ...context
    };

    // Generate initial plan
    const plan = await this.generatePlan(planningContext);
    
    // Create task graph
    const graph: TaskGraph = {
      id: graphId,
      name: `Task Graph for: ${userRequest.substring(0, 50)}...`,
      description: userRequest,
      rootNode: plan.rootNode,
      nodes: plan.nodes,
      status: 'planning',
      createdAt: new Date(),
      updatedAt: new Date(),
      executionHistory: [],
      metadata: { planningContext }
    };

    this.graphs.set(graphId, graph);
    
    return graph;
  }

  /**
   * Execute a task graph
   */
  async executeTaskGraph(graphId: string): Promise<TaskGraph> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Task graph ${graphId} not found`);
    }

    graph.status = 'executing';
    graph.updatedAt = new Date();

    try {
      // Execute the graph starting from root node
      await this.executeNode(graph, graph.rootNode);
      
      // Check if all nodes are completed
      const allCompleted = Array.from(graph.nodes.values()).every(
        node => node.status === 'completed' || node.status === 'skipped'
      );
      
      if (allCompleted) {
        graph.status = 'completed';
      } else {
        // Some nodes failed
        const failedNodes = Array.from(graph.nodes.values()).filter(
          node => node.status === 'failed'
        );
        if (failedNodes.length > 0) {
          graph.status = 'failed';
        }
      }
      
    } catch (error: any) {
      graph.status = 'failed';
    }

    graph.updatedAt = new Date();
    return graph;
  }

  /**
   * Execute a single node in the task graph
   */
  private async executeNode(graph: TaskGraph, nodeId: string): Promise<void> {
    const node = graph.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found in graph ${graph.id}`);
    }

    if (node.status !== 'pending') {
      return; // Already executed or in progress
    }

    node.status = 'running';
    node.startTime = new Date();

    try {
      // Check dependencies
      const dependenciesMet = await this.checkDependencies(graph, node);
      if (!dependenciesMet) {
        node.status = 'pending';
        return; // Dependencies not met, will be retried later
      }

      // Execute based on node type
      let result: any;
      switch (node.type) {
        case 'action':
          result = await this.executeActionNode(graph, node);
          break;
        case 'decision':
          result = await this.executeDecisionNode(graph, node);
          break;
        case 'parallel':
          result = await this.executeParallelNode(graph, node);
          break;
        case 'sequential':
          result = await this.executeSequentialNode(graph, node);
          break;
        case 'conditional':
          result = await this.executeConditionalNode(graph, node);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      node.result = result;
      node.status = 'completed';
      node.endTime = new Date();
      node.duration = node.endTime.getTime() - node.startTime.getTime();

      // Record execution
      graph.executionHistory.push({
        nodeId,
        action: node.name,
        input: node.toolInput,
        result,
        success: true,
        duration: node.duration,
        timestamp: new Date()
      });

      // Node completed successfully

      // Execute children if any
      if (node.children && node.children.length > 0) {
        for (const childId of node.children) {
          await this.executeNode(graph, childId);
        }
      }

    } catch (error: any) {
      node.status = 'failed';
      node.error = error.message;
      node.endTime = new Date();
      node.duration = node.endTime.getTime() - node.startTime.getTime();

      // Record failed execution
      graph.executionHistory.push({
        nodeId,
        action: node.name,
        input: node.toolInput,
        result: null,
        success: false,
        error: error.message,
        duration: node.duration,
        timestamp: new Date()
      });

      // Node failed
    }
  }

  /**
   * Execute an action node (tool execution)
   */
  private async executeActionNode(graph: TaskGraph, node: TaskNode): Promise<any> {
    if (!node.tool) {
      throw new Error(`Action node ${node.id} has no tool specified`);
    }
    
    // Import and execute the tool
    const { executeAgentTool } = await import('../agent/toolExecutor');
    const result = await executeAgentTool(node.tool, node.toolInput || {});
    
    return result;
  }

  /**
   * Execute a decision node (AI decision making)
   */
  private async executeDecisionNode(graph: TaskGraph, node: TaskNode): Promise<any> {
    // Use AI to make decision based on context
    const context = this.buildDecisionContext(graph, node);
    const decision = await this.makeAIDecision(context);
    
    return decision;
  }

  /**
   * Execute parallel nodes
   */
  private async executeParallelNode(graph: TaskGraph, node: TaskNode): Promise<any> {
    if (!node.children || node.children.length === 0) {
      return null;
    }
    
    // Execute all children in parallel
    const promises = node.children.map(childId => this.executeNode(graph, childId));
    await Promise.all(promises);
    
    // Collect results
    const results = node.children.map(childId => {
      const childNode = graph.nodes.get(childId);
      return childNode ? childNode.result : null;
    });
    
    return results;
  }

  /**
   * Execute sequential nodes
   */
  private async executeSequentialNode(graph: TaskGraph, node: TaskNode): Promise<any> {
    if (!node.children || node.children.length === 0) {
      return null;
    }
    
    const results: any[] = [];
    for (const childId of node.children) {
      await this.executeNode(graph, childId);
      const childNode = graph.nodes.get(childId);
      if (childNode) {
        results.push(childNode.result);
      }
    }
    
    return results;
  }

  /**
   * Execute conditional node
   */
  private async executeConditionalNode(graph: TaskGraph, node: TaskNode): Promise<any> {
    if (!node.condition || !node.children) {
      throw new Error(`Conditional node ${node.id} missing condition or children`);
    }
    
    // Evaluate condition
    const conditionMet = await this.evaluateCondition(node.condition, graph);
    
    if (conditionMet && node.children.length > 0) {
      // Execute first child (true branch)
      await this.executeNode(graph, node.children[0]);
      const childNode = graph.nodes.get(node.children[0]);
      return childNode ? childNode.result : null;
    } else if (!conditionMet && node.children.length > 1) {
      // Execute second child (false branch)
      await this.executeNode(graph, node.children[1]);
      const childNode = graph.nodes.get(node.children[1]);
      return childNode ? childNode.result : null;
    }
    
    return null;
  }

  /**
   * Generate initial plan using AI
   */
  private async generatePlan(context: PlanningContext): Promise<{ rootNode: string; nodes: Map<string, TaskNode> }> {
    // Use AI to generate task decomposition
    const planPrompt = this.buildPlanningPrompt(context);
    const planResponse = await this.callPlanningAI(planPrompt);
    
    // Parse AI response into task nodes
    const nodes = this.parsePlanResponse(planResponse, context);
    
    // Find root node (node with no dependencies)
    const rootNode = Array.from(nodes.values()).find(node => 
      node.dependencies.length === 0
    );
    
    if (!rootNode) {
      throw new Error('No root node found in generated plan');
    }
    
    return { rootNode: rootNode.id, nodes };
  }

  /**
   * Build planning prompt for AI
   */
  private buildPlanningPrompt(context: PlanningContext): string {
    return `
You are an advanced AI task planner. Break down the following user request into a structured task graph.

User Request: "${context.userRequest}"

Available Tools: ${context.availableTools.join(', ')}

Conversation Context: ${context.conversationHistory.length} previous messages

Please create a task graph that:
1. Decomposes the request into logical steps
2. Identifies dependencies between steps
3. Uses appropriate tools for each action
4. Includes decision points where needed
5. Considers parallel execution where possible

Return your response as a JSON structure with nodes and their relationships.
Each node should have: id, type, name, description, dependencies, tool (if action), toolInput (if action)

Example structure:
{
  "nodes": [
    {
      "id": "root",
      "type": "sequential",
      "name": "Main Task",
      "description": "Execute main task",
      "dependencies": [],
      "children": ["step1", "step2"]
    },
    {
      "id": "step1",
      "type": "action",
      "name": "Search Web",
      "description": "Search for information",
      "dependencies": [],
      "tool": "search_web",
      "toolInput": {"query": "example query"}
    }
  ]
}
`;
  }

  /**
   * Call AI for planning
   */
  private async callPlanningAI(prompt: string): Promise<string> {
    // Use a simple AI call for planning
    // In production, this would use a dedicated planning model
    const { ClaudeAgent } = await import('../agent/agent');
    const agent = new ClaudeAgent();
    
    const result = await agent.execute(prompt, []);
    return result.result;
  }

  /**
   * Parse AI plan response into task nodes
   */
  private parsePlanResponse(response: string, context: PlanningContext): Map<string, TaskNode> {
    const nodes = new Map<string, TaskNode>();
    
    try {
      // Try to parse JSON response
      const planData = JSON.parse(response);
      
      if (planData.nodes && Array.isArray(planData.nodes)) {
        for (const nodeData of planData.nodes) {
          const node: TaskNode = {
            id: nodeData.id,
            type: nodeData.type || 'action',
            name: nodeData.name,
            description: nodeData.description,
            status: 'pending',
            dependencies: nodeData.dependencies || [],
            children: nodeData.children,
            tool: nodeData.tool,
            toolInput: nodeData.toolInput,
            condition: nodeData.condition
          };
          nodes.set(node.id, node);
        }
      }
    } catch (error) {
      console.warn('Failed to parse AI plan response, creating simple plan');
      
      // Fallback: create a simple sequential plan
      const rootNode: TaskNode = {
        id: 'root',
        type: 'sequential',
        name: 'Execute Request',
        description: context.userRequest,
        status: 'pending',
        dependencies: [],
        children: ['action1']
      };
      
      const actionNode: TaskNode = {
        id: 'action1',
        type: 'action',
        name: 'Process Request',
        description: 'Process the user request',
        status: 'pending',
        dependencies: [],
        tool: 'search_web',
        toolInput: { query: context.userRequest }
      };
      
      nodes.set(rootNode.id, rootNode);
      nodes.set(actionNode.id, actionNode);
    }
    
    return nodes;
  }

  /**
   * Check if node dependencies are met
   */
  private async checkDependencies(graph: TaskGraph, node: TaskNode): Promise<boolean> {
    for (const depId of node.dependencies) {
      const depNode = graph.nodes.get(depId);
      if (!depNode || depNode.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  /**
   * Build decision context for AI
   */
  private buildDecisionContext(graph: TaskGraph, node: TaskNode): any {
    return {
      node,
      graph,
      executionHistory: graph.executionHistory,
      context: graph.metadata?.planningContext
    };
  }

  /**
   * Make AI decision
   */
  private async makeAIDecision(context: any): Promise<any> {
    // Simple decision making - in production this would be more sophisticated
    return { decision: 'continue', reasoning: 'Default decision' };
  }

  /**
   * Evaluate condition
   */
  private async evaluateCondition(condition: string, graph: TaskGraph): Promise<boolean> {
    // Simple condition evaluation - in production this would be more sophisticated
    return true;
  }

  /**
   * Get available tools
   */
  private async getAvailableTools(): Promise<string[]> {
    const { AGENT_TOOLS } = await import('../agent/tools');
    return AGENT_TOOLS.map(tool => tool.name);
  }

  /**
   * Get task graph by ID
   */
  getTaskGraph(graphId: string): TaskGraph | undefined {
    return this.graphs.get(graphId);
  }

  /**
   * Get all task graphs
   */
  getAllTaskGraphs(): TaskGraph[] {
    return Array.from(this.graphs.values());
  }

  /**
   * Delete task graph
   */
  deleteTaskGraph(graphId: string): boolean {
    return this.graphs.delete(graphId);
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalGraphs: number;
    completedGraphs: number;
    failedGraphs: number;
    averageExecutionTime: number;
  } {
    const graphs = Array.from(this.graphs.values());
    const completed = graphs.filter(g => g.status === 'completed').length;
    const failed = graphs.filter(g => g.status === 'failed').length;
    
    const totalTime = graphs.reduce((sum, g) => {
      const duration = g.updatedAt.getTime() - g.createdAt.getTime();
      return sum + duration;
    }, 0);
    
    return {
      totalGraphs: graphs.length,
      completedGraphs: completed,
      failedGraphs: failed,
      averageExecutionTime: graphs.length > 0 ? totalTime / graphs.length : 0
    };
  }
}

// Global instance
export const taskGraphExecutor = new TaskGraphExecutor();
