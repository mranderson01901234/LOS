import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bug, FileText, Link as LinkIcon, Globe } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { runCompleteDiagnostic } from '../../utils/chatDiagnostics';
import { getDocument } from '../../services/db';
import { useLocation } from 'react-router-dom';
import { LevelUpModal } from '../Growth/LevelUpModal';
import { MilestoneNotification } from '../Growth/MilestoneNotification';
import type { Message, Document } from '../../types/database';

// Memoized message component to prevent unnecessary re-renders
const MessageItem = React.memo(({ message }: { message: Message }) => {
  const [sources, setSources] = useState<Document[]>([]);

  // Load sources when message has sources
  useEffect(() => {
    if (message.sources && message.sources.length > 0) {
      // Separate URLs from document IDs
      const documentIds = message.sources.filter(source => !source.startsWith('http'));
      
      // Deduplicate document IDs (same document might appear multiple times from different chunks)
      const uniqueDocumentIds = [...new Set(documentIds)];// Load document sources
      if (uniqueDocumentIds.length > 0) {
        Promise.all(uniqueDocumentIds.map(id => getDocument(id)))
          .then(docs => {
            const validDocs = docs.filter(d => d !== undefined) as Document[];
            setSources(validDocs);
          })
          .catch(err => console.error('Failed to load sources:', err));
      }
    }
  }, [message.sources]);

  const formatCodeBlock = (content: string) => {
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const parts = content.split(codeBlockRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a code block
        return (
          <pre key={index} className="bg-bg-elevated border border-border-primary text-text-primary p-4 rounded-xl text-sm font-mono overflow-x-auto my-4 shadow-premium">
            <code>{part}</code>
          </pre>
        );
      }
      return part;
    });
  };

  const formatMessage = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Handle numbered lists (1. 2. 3. etc.)
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={index} className="ml-4 text-text-primary mb-3 flex items-start">
            <span className="font-semibold text-text-secondary mr-3 flex-shrink-0">{line.match(/^\d+\./)?.[0]}</span>
            <span className="leading-relaxed">{line.replace(/^\d+\.\s/, '')}</span>
          </div>
        );
      }
      // Handle bold text
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <div key={index} className="font-semibold text-text-primary mb-3">
            {line.slice(2, -2)}
          </div>
        );
      }
      // Handle bullet points
      if (line.startsWith('- ')) {
        return (
          <div key={index} className="ml-4 text-text-primary mb-2 flex items-start">
            <span className="w-1.5 h-1.5 bg-text-secondary rounded-full mt-2 mr-3 flex-shrink-0"></span>
            <span className="leading-relaxed">{line.slice(2)}</span>
          </div>
        );
      }
      // Handle empty lines
      if (line.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }
      // Regular text
      return (
        <div key={index} className="text-text-primary leading-relaxed mb-2">
          {formatCodeBlock(line)}
        </div>
      );
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }).toUpperCase();
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <LinkIcon className="w-3 h-3" />;
      case 'file':
        return <FileText className="w-3 h-3" />;
      case 'note':
        return <FileText className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  // Separate URLs from document sources and deduplicate
  const urls = [...new Set(message.sources?.filter(source => source.startsWith('http')) || [])];
  const hasLocalSources = sources.length > 0;
  const hasWebSources = urls.length > 0;

  return (
    <div
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${
        message.role === 'system' ? 'justify-center' : ''
      } animate-slide-up`}
    >
      <div
        className={`${message.role !== 'system' ? 'max-w-[75%]' : 'max-w-2xl'} ${
          message.role === 'user'
            ? 'bg-bg-elevated border border-border-highlight rounded-2xl px-6 py-5 shadow-premium-lg'
            : message.role === 'assistant'
            ? 'bg-bg-secondary border border-border-primary rounded-2xl px-6 py-5 shadow-message'
            : 'bg-bg-elevated border border-border-primary text-text-tertiary text-sm text-center px-6 py-3 rounded-xl shadow-premium'
        }`}
      >
        <div className="prose prose-invert max-w-none">
          {formatMessage(message.content)}
        </div>
        
        {/* Sources */}
        {(hasLocalSources || hasWebSources) && message.role === 'assistant' && (
          <div className="mt-6 pt-4 border-t border-border-primary/50">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-secondary">Sources</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Local sources (documents) */}
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 px-3 py-2 bg-bg-elevated border border-border-primary rounded-lg text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  {getSourceIcon(source.type)}
                  <span className="truncate max-w-40">{source.title}</span>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-white hover:text-gray-300 ml-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
              
              {/* Web sources (URLs) */}
              {urls.map((url, index) => {
                try {
                  const urlObj = new URL(url);
                  const domain = urlObj.hostname.replace('www.', '');
                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span className="truncate max-w-40 font-medium">{domain}</span>
                    </a>
                  );
                } catch {
                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span className="truncate max-w-40 font-medium">Web Source</span>
                    </a>
                  );
                }
              })}
            </div>
          </div>
        )}
        
        <div
          className={`text-micro mt-3 ${
            message.role === 'user' ? 'text-text-disabled text-right' : 'text-text-disabled'
          }`}
        >
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

// Memoized message list to prevent re-renders when messages array changes
const MessageList = React.memo(({ messages }: { messages: Message[] }) => {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <MessageItem 
          key={message.id} 
          message={message}
        />
      ))}
    </div>
  );
});

MessageList.displayName = 'MessageList';

const ChatInterface: React.FC = () => {
  const {
    currentConvId,
    messages: dbMessages,
    isLoading: isLoadingHistory,
    isSending,
    isGenerating,
    ollamaAvailable,
    checkOllamaStatus,
    loadConversations,
    selectConversation,
    newConversation,
    sendMessage,
    // Growth system
    levelUpData,
    milestoneNotifications,
    dismissLevelUp,
    dismissMilestoneNotification,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const previousConvIdRef = useRef<string | null>(null);
  const previousLocationRef = useRef<string>('');

  // Initialize chat system on mount
  useEffect(() => {// Check Ollama status
    checkOllamaStatus();
    
    // Load conversations
    loadConversations().then(convs => {
      if (convs.length === 0) {newConversation();
      } else {const mostRecent = convs.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];
        selectConversation(mostRecent.id);
      }
    });
  }, []); // Run once on mount - empty deps, no magic
  // Enhanced helper function to scroll to absolute bottom with multiple strategies
  const scrollToAbsoluteBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;// Strategy 1: Immediate scroll
      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTop = maxScroll;
      
      // Strategy 2: Multiple delayed attempts to handle dynamic content
      const scrollAttempts = [10, 50, 100, 200, 300];
      scrollAttempts.forEach(delay => {
        setTimeout(() => {
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, delay);
      });
      
      // Strategy 3: Final verification and correction
      setTimeout(() => {
        if (container && container.scrollTop < container.scrollHeight - container.clientHeight - 5) {container.scrollTop = container.scrollHeight;
        }
      }, 400);
    }
  };

  // Force scroll to bottom - used for critical moments
  const forceScrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;// Immediate aggressive scroll
      container.scrollTop = container.scrollHeight;
      
      // Use requestAnimationFrame for smooth scroll
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      });
      
      // Final verification
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
  };

  // COMPREHENSIVE AUTO-SCROLL SYSTEM
  
  // 1. Auto-scroll when messages change or during generation
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      
      // Always scroll when generation completes, or when user is near bottom
      if (!isGenerating || isNearBottom) {
        setTimeout(() => {
          scrollToAbsoluteBottom();
        }, 100);
      }
    }
  }, [dbMessages.length, isGenerating]); // Trigger on message count change or generation state

  // 2. Auto-scroll when conversation changes (switching between chats)
  useEffect(() => {
    if (currentConvId !== previousConvIdRef.current) {previousConvIdRef.current = currentConvId;
      
      // Force scroll when switching conversations
      setTimeout(() => {
        forceScrollToBottom();
      }, 150);
    }
  }, [currentConvId]);

  // 3. Auto-scroll when returning to chat from other tabs
  useEffect(() => {
    const currentPath = location.pathname;
    const wasOnChat = previousLocationRef.current === '/chat' || previousLocationRef.current === '/';
    const isNowOnChat = currentPath === '/chat' || currentPath === '/';
    
    // If we're returning to chat from another tab
    if (isNowOnChat && !wasOnChat && previousLocationRef.current !== '') {setTimeout(() => {
        forceScrollToBottom();
      }, 200);
    }
    
    previousLocationRef.current = currentPath;
  }, [location.pathname]);

  // 4. Auto-scroll when loading completes (initial load or conversation switch)
  useEffect(() => {
    if (!isLoadingHistory && dbMessages.length > 0) {setTimeout(() => {
        forceScrollToBottom();
      }, 100);
    }
  }, [isLoadingHistory, dbMessages.length]);

  // 5. Auto-scroll during AI generation (smooth streaming)
  useEffect(() => {
    if (isGenerating && messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      
      // Only scroll if user is near bottom to avoid interrupting manual scrolling
      if (isNearBottom) {
        const interval = setInterval(() => {
          if (container && isGenerating) {
            container.scrollTop = container.scrollHeight;
          } else {
            clearInterval(interval);
          }
        }, 100);
        
        return () => clearInterval(interval);
      }
    }
  }, [isGenerating]);

  // 6. Auto-scroll when component becomes visible (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {setTimeout(() => {
          forceScrollToBottom();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 5 * 24; // 5 lines * 24px line height
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputText]);

  // Focus input when generating stops
  useEffect(() => {
    if (!isGenerating && !isSending) {
      textareaRef.current?.focus();
    }
  }, [isGenerating, isSending]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending || isGenerating) return;

    const messageContent = inputText.trim();
    setInputText('');

    // Immediately scroll to absolute bottom when user sends message
    setTimeout(() => {
      scrollToAbsoluteBottom();
    }, 50);
    
    // Additional scroll attempts to prevent upward movement
    setTimeout(() => {
      scrollToAbsoluteBottom();
    }, 200);
    
    setTimeout(() => {
      scrollToAbsoluteBottom();
    }, 500);

    try {
      // Send user message (AI response is handled in useSimpleChat)
      await sendMessage(messageContent);
      
      // Focus the input after sending message
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show loading state
  if (isLoadingHistory) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border-secondary px-8 h-18 flex items-center shadow-premium relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-primary to-transparent"></div>
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-bg-elevated rounded-2xl flex items-center justify-center shadow-premium-lg border border-border-primary">
              <span className="text-text-primary font-bold text-2xl tracking-tight">LOS</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight leading-none mb-1">Life Operating System</h1>
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-medium">Your intelligent productivity assistant</p>
            </div>
            <div className="ml-auto flex items-center space-x-3">
              {/* DIAGNOSTIC BUTTON - TEMPORARY */}
              <button
                onClick={async () => {await runCompleteDiagnostic();alert('Diagnostic complete! Check console (F12) for detailed results.');
                }}
                className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl border border-red-400 shadow-premium transition-all duration-200"
                title="Run complete diagnostic test (check console for results)"
              >
                <Bug className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Run Diagnostic</span>
              </button>
              
              <div 
                className={`flex items-center space-x-2 bg-bg-elevated px-4 py-2 rounded-xl border shadow-premium ${
                  ollamaAvailable ? 'border-green-500/30 animate-pulse-subtle' : 'border-border-primary'
                }`}
                title={ollamaAvailable ? 'Ollama is running' : 'Ollama is not running - AI responses disabled'}
              >
                <div className={`w-2 h-2 rounded-full ${
                  ollamaAvailable ? 'bg-green-500 shadow-glow' : 'bg-red-500'
                }`}></div>
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {ollamaAvailable ? 'AI Ready' : 'AI Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto">
          {dbMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl px-8">
                <div className="w-20 h-20 bg-bg-elevated rounded-2xl flex items-center justify-center shadow-premium-lg border border-border-primary mx-auto mb-6">
                  <span className="text-text-primary font-bold text-3xl tracking-tight">LOS</span>
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Start chatting to begin your LOS journey
                </h2>
                <p className="text-text-secondary mb-8">
                  I'm ready to learn about you! Ask me anything or share what's on your mind.
                </p>
                <div className="grid grid-cols-1 gap-3 text-left">
                  {[
                    'Help me organize my tasks',
                    'I want to learn about photography',
                    'Tell me about yourself',
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInputText(prompt)}
                      className="px-5 py-4 bg-bg-elevated border border-border-primary rounded-xl text-text-secondary hover:text-text-primary hover:border-border-focus transition-all duration-200 text-left hover:shadow-premium"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <MessageList messages={dbMessages} />
              
              {/* Typing Indicator */}
              {isGenerating && (
                <div className="flex justify-start animate-slide-up">
                  <div className="max-w-[75%] bg-bg-secondary border border-border-primary rounded-2xl px-6 py-5 shadow-message">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-text-secondary flex items-center">
                        <Globe className="w-4 h-4 mr-2 animate-pulse" />
                        LOS is searching and thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
                
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-bg-primary border-t border-border-secondary px-8 py-7 shadow-premium">
        <div className="max-w-6xl mx-auto">
          {/* Unified Input Container */}
          <div className="flex items-end w-full bg-bg-elevated border-2 border-border-primary rounded-2xl overflow-hidden transition-all duration-200 ease-out focus-within:border-border-focus focus-within:shadow-input-focus">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isGenerating
                  ? "AI is generating response..."
                  : ollamaAvailable
                    ? "Message your LOS..."
                    : "Ollama not running - install at ollama.ai"
              }
              disabled={isSending || isGenerating}
              className={`flex-1 bg-transparent border-none px-5 py-4 text-base text-text-primary placeholder-text-disabled resize-none outline-none ${
                isSending || isGenerating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              rows={1}
              style={{ minHeight: '56px', maxHeight: '160px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isSending || isGenerating}
              className={`w-12 h-12 flex-shrink-0 flex items-center justify-center bg-accent-white text-bg-primary rounded-xl m-2 transition-all duration-200 ease-out ${
                !inputText.trim() || isSending || isGenerating
                  ? 'opacity-50 cursor-not-allowed bg-bg-hover'
                  : 'hover:scale-105 hover:shadow-glow active:scale-95'
              }`}
            >
              {isSending || isGenerating ? (
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
      
      {/* Level Up Modal */}
      {levelUpData && (
        <LevelUpModal
          oldLevel={levelUpData.oldLevel}
          newLevel={levelUpData.newLevel}
          stage={levelUpData.stage}
          onClose={dismissLevelUp}
        />
      )}
      
      {/* Milestone Notifications */}
      {milestoneNotifications.map((notification) => (
        <MilestoneNotification
          key={notification.id}
          milestone={notification.milestone}
          onClose={() => dismissMilestoneNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default ChatInterface;
