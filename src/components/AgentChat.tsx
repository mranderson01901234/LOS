import React, { useRef, useEffect } from 'react';
import { Send, Loader2, ArrowDown } from 'lucide-react';
import { useAgentChat } from '../hooks/useAgentChat';
import { useChat } from '../contexts/ChatContext';

// Helper functions for cleaner UI
function getToolDisplayName(toolName: string): string {
  const toolNames: Record<string, string> = {
    'search_documents': 'Searching documents...',
    'get_document_content': 'Reading document...',
    'list_documents': 'Listing documents...',
    'create_document': 'Creating document...',
    'update_document': 'Updating document...',
    'delete_documents': 'Deleting documents...',
    'search_facts': 'Searching facts...',
    'add_facts': 'Adding facts...',
    'get_user_context': 'Getting user context...',
    'analyze_content_patterns': 'Analyzing patterns...',
    'search_conversations': 'Searching conversations...',
    'create_study_plan': 'Creating study plan...'
  };
  return toolNames[toolName] || `Using ${toolName}...`;
}

function getThinkingSummary(thinking: string, userRequest: string): string {
  // Detect if this is a simple request that doesn't need verbose updates
  const simpleRequests = [
    'hello', 'hi', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no',
    'what', 'how', 'when', 'where', 'who', 'why'
  ];
  
  const complexKeywords = [
    'create', 'organize', 'analyze', 'find', 'search', 'list', 'show me',
    'help me', 'can you', 'please', 'study plan', 'pattern', 'summary'
  ];
  
  const isSimpleRequest = simpleRequests.some(word => 
    userRequest.toLowerCase().trim().startsWith(word) && userRequest.length < 20
  );
  
  const isComplexRequest = complexKeywords.some(keyword => 
    userRequest.toLowerCase().includes(keyword) || userRequest.length > 30
  );
  
  // For simple requests, show minimal status
  if (isSimpleRequest && !isComplexRequest) {
    if (thinking.toLowerCase().includes('understand')) return 'Processing...';
    if (thinking.toLowerCase().includes('final')) return 'Responding...';
    return 'Thinking...';
  }
  
  // For complex requests, show more detailed status
  if (thinking.toLowerCase().includes('understand')) return 'Understanding your request...';
  if (thinking.toLowerCase().includes('plan')) return 'Planning approach...';
  if (thinking.toLowerCase().includes('search')) return 'Preparing search...';
  if (thinking.toLowerCase().includes('analyze')) return 'Analyzing data...';
  if (thinking.toLowerCase().includes('create')) return 'Preparing to create...';
  if (thinking.toLowerCase().includes('organize')) return 'Organizing information...';
  if (thinking.toLowerCase().includes('summarize')) return 'Summarizing findings...';
  if (thinking.toLowerCase().includes('final')) return 'Finalizing response...';
  
  // Default to first 50 characters if no pattern matches
  return thinking.length > 50 ? thinking.substring(0, 50) + '...' : thinking;
}

function shouldShowVerboseStatus(userRequest: string): boolean {
  // Simple requests that don't need verbose status
  const simpleRequests = [
    'hello', 'hi', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no'
  ];
  
  // Complex keywords that benefit from verbose status
  const complexKeywords = [
    'create', 'organize', 'analyze', 'find', 'search', 'list', 'show me',
    'help me', 'can you', 'please', 'study plan', 'pattern', 'summary',
    'what documents', 'what facts', 'tell me about'
  ];
  
  const isSimpleRequest = simpleRequests.some(word => 
    userRequest.toLowerCase().trim().startsWith(word) && userRequest.length < 15
  );
  
  const isComplexRequest = complexKeywords.some(keyword => 
    userRequest.toLowerCase().includes(keyword) || userRequest.length > 25
  );
  
  // Show verbose status for complex requests, simple status for simple requests
  return isComplexRequest || (!isSimpleRequest && userRequest.length > 20);
}

function cleanAgentOutput(content: string): string {
  // Remove markdown formatting for better readability
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold** formatting
    .replace(/\*(.*?)\*/g, '$1')     // Remove *italic* formatting
    .replace(/`(.*?)`/g, '$1')       // Remove `code` formatting
    .replace(/#{1,6}\s/g, '')       // Remove markdown headers
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Convert [text](url) to just text
    .replace(/\n\n+/g, '\n\n')      // Normalize multiple newlines
    .trim();
}

export function AgentChat() {
  const { 
    currentConvId,
    messages: dbMessages,
    isSending,
    isGenerating,
    loadConversations,
    selectConversation,
    newConversation
  } = useChat();
  
  const { 
    messages, 
    sendMessage, 
    isThinking, 
    currentStep,
    executionHistory,
    loadConversation
  } = useAgentChat(currentConvId);
  
  const [input, setInput] = React.useState('');
  const [lastUserRequest, setLastUserRequest] = React.useState('');
  const [userHasScrolled, setUserHasScrolled] = React.useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation when currentConvId changes
  useEffect(() => {
    if (currentConvId) {
      loadConversation(currentConvId);
      // Reset scroll state when switching conversations
      setUserHasScrolled(false);
    }
  }, [currentConvId, loadConversation]);

  // Track user scroll behavior
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      
      setUserHasScrolled(!isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Simplified auto-scroll behavior - always scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);

  // Focus input when component mounts and when thinking stops
  useEffect(() => {
    if (!isThinking && !isSending && !isGenerating) {
      inputRef.current?.focus();
    }
  }, [isThinking, isSending, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setLastUserRequest(input.trim());
      sendMessage(input);
      setInput('');
      
      // Focus the input after sending message
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Show welcome message if no messages yet
  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
      >
        {showWelcome && (
          <div className="welcome-message">
            <div className="welcome-content">
              <h2>👋 Welcome to LOS Agent</h2>
              <p>I'm your AI assistant with access to your documents, facts, and knowledge base. I can help you:</p>
              <ul>
                <li>📚 Search and organize your documents</li>
                <li>📝 Create notes and study plans</li>
                <li>🔍 Analyze patterns in your content</li>
                <li>💡 Answer questions using your knowledge</li>
              </ul>
              <p>Try asking me something like "What documents do I have?" or "Create a note about photography"</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-content">{cleanAgentOutput(msg.content)}</div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="tools-used">
                Tools used: {msg.sources.join(', ')}
              </div>
            )}
            {msg.metadata?.estimated_cost && (
              <div className="cost-indicator">
                Estimated cost: ${msg.metadata.estimated_cost.toFixed(4)}
                {' '}({msg.metadata.model_used?.toUpperCase()})
              </div>
            )}
          </div>
        ))}

        {/* Thinking indicators - positioned as last message */}
        {isThinking && currentStep && shouldShowVerboseStatus(lastUserRequest) && (
          <div className="message assistant">
            <div className="thinking-indicator">
              <div className="step-number">
                Step {currentStep.step}
                {currentStep.metadata?.model_used && (
                  <span className={`model-badge ${currentStep.metadata.model_used}`}>
                    {currentStep.metadata.model_used.toUpperCase()}
                  </span>
                )}
              </div>
              
              {currentStep.action && (
                <div className="action">
                  <strong>Action:</strong> {getToolDisplayName(currentStep.action.tool)}
                  {currentStep.observation && (
                    <span className={`result ${currentStep.observation.success ? 'success' : 'failed'}`}>
                      {currentStep.observation.success ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              )}

              {!currentStep.action && currentStep.thinking && (
                <div className="thinking">
                  <strong>Processing:</strong> {getThinkingSummary(currentStep.thinking, lastUserRequest)}
                </div>
              )}
            </div>
          </div>
        )}

        {isThinking && !shouldShowVerboseStatus(lastUserRequest) && (
          <div className="message assistant">
            <div className="simple-thinking">
              <div className="simple-status">
                <div className="thinking-dots">Thinking</div>
              </div>
            </div>
          </div>
        )}

        {/* Always show some indicator when thinking */}
        {isThinking && !currentStep && (
          <div className="message assistant">
            <div className="simple-thinking">
              <div className="simple-status">
                <div className="thinking-dots">Processing</div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-border-primary bg-bg-secondary px-6 py-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask me anything or give me a task..."
              disabled={isThinking || isSending || isGenerating}
              className="w-full px-4 py-3 bg-bg-elevated border-2 border-border-primary rounded-xl text-text-primary placeholder-text-disabled resize-none transition-all duration-200 ease-out focus:border-border-focus focus:shadow-input-focus outline-none"
              style={{ minHeight: '56px', maxHeight: '160px' }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isThinking || isSending || isGenerating}
            className={`w-12 h-12 flex-shrink-0 flex items-center justify-center bg-accent-white text-bg-primary rounded-xl transition-all duration-200 ease-out ${
              !input.trim() || isThinking || isSending || isGenerating
                ? 'opacity-50 cursor-not-allowed bg-bg-hover'
                : 'hover:scale-105 hover:shadow-glow active:scale-95'
            }`}
          >
            {isThinking || isSending || isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="text-micro mt-4 flex items-center justify-center space-x-4 text-text-disabled">
          <span>Press Enter to send</span>
          <span>•</span>
          <span>Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}

