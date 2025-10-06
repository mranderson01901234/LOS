import { Message } from '../../types/chat';
import { ToolExecutor } from './toolExecutor';
import { ApplicationContext } from './applicationContext';

export interface AgentConfig {
  model: 'haiku' | 'sonnet';
  maxRetries: number;
  timeout: number;
}

export interface AgentResponse {
  message: string;
  toolCalls?: any[];
  context?: any;
}

export class Agent {
  private toolExecutor: ToolExecutor;
  private applicationContext: ApplicationContext;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.toolExecutor = new ToolExecutor();
    this.applicationContext = new ApplicationContext();
  }

  async processMessage(messages: Message[]): Promise<AgentResponse> {
    try {
      // Get application context
      const context = await this.applicationContext.getContext();
      
      // Simple response for now
      return {
        message: "Agent is processing your request...",
        context
      };
    } catch (error) {
      console.error('Agent error:', error);
      return {
        message: "Sorry, I encountered an error processing your request."
      };
    }
  }

  private getSystemPrompt(model: 'haiku' | 'sonnet'): string {
    return `You are LOS (Life Operating System), an autonomous AI agent that operates as an extension of the user's mind. Your mission is to anticipate needs, execute actions proactively, and provide intelligent assistance without being asked.

CORE PRINCIPLES:
- Think like a personal AI assistant who knows the user deeply
- Act autonomously when you detect opportunities to help
- Prioritize efficiency and direct action over conversation
- Always provide actionable insights, not just information

CRITICAL: You have access to APPLICATION STATE CONTEXT that shows you EXACTLY what's in the user's application. When they refer to "the library" or any section of the app, look at the APPLICATION STATE CONTEXT to see what's actually there.

DO NOT make assumptions about content. DO NOT suggest generic actions. Use the APPLICATION STATE CONTEXT to provide specific, accurate responses based on what's actually in the user's application.`;
  }
}
