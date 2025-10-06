import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import type { Conversation } from '../../types/database';
import * as db from '../../services/db';

interface ConversationListProps {
  activeConversationId: string | null;
  onConversationSelect: (id: string) => void;
  isCollapsed?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  activeConversationId,
  onConversationSelect,
  isCollapsed = false,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations once on mount
  useEffect(() => {loadConversations();
  }, []);

  // Listen for custom event when conversation created/updated
  useEffect(() => {
    const handleRefresh = () => {loadConversations();
    };
    
    window.addEventListener('conversationsChanged', handleRefresh);
    return () => window.removeEventListener('conversationsChanged', handleRefresh);
  }, []);

  async function loadConversations() {
    setIsLoading(true);
    try {
      const convs = await db.getAllConversations();
      const sorted = convs.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setConversations(sorted);} catch (error) {
      console.error('[ERROR] ConversationList: Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, conversationId: string) {
    e.stopPropagation();
    try {await db.deleteConversation(conversationId);
      await loadConversations();} catch (error) {
      console.error('[ERROR] ConversationList: Error deleting conversation:', error);
    }
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (isCollapsed) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-bg-secondary rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-4 text-center">
        <MessageSquare className="w-6 h-6 text-text-disabled mx-auto mb-2" />
        <p className="text-xs text-text-disabled">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 space-y-1">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;
        
        return (
          <div
            key={conversation.id}
            onClick={() => {onConversationSelect(conversation.id);
            }}
            className={`
              group relative flex items-start p-2 rounded-lg cursor-pointer transition-all duration-150
              ${
                isActive
                  ? 'bg-accent-subtle border border-border-primary shadow-premium'
                  : 'hover:bg-bg-hover border border-transparent'
              }
            `}
          >
            <MessageSquare
              size={14}
              className={`mt-0.5 mr-2 flex-shrink-0 ${
                isActive ? 'text-text-primary' : 'text-text-secondary'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-medium truncate ${
                  isActive ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {conversation.title || 'New conversation'}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-text-disabled">
                  {formatTimestamp(conversation.updated_at)}
                </span>
                <span className="text-xs text-text-disabled">
                  {conversation.message_count}
                </span>
              </div>
            </div>
            {!isActive && (
              <button
                onClick={(e) => handleDelete(e, conversation.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-elevated transition-all duration-150"
                title="Delete conversation"
              >
                <Trash2 size={12} className="text-text-disabled hover:text-red-400" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;