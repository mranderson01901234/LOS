export interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ExecutionStep {
  step: number;
  thinking: string;
  action?: {
    tool: string;
    input: any;
  };
  observation?: any;
  timestamp: number;
}

export interface AgentExecution {
  request: string;
  steps: ExecutionStep[];
  result: string;
  totalSteps: number;
  success: boolean;
  metadata?: {
    model_used?: 'haiku' | 'sonnet';
    estimated_cost?: number;
  };
}

