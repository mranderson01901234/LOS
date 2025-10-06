import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  Network, 
  TrendingUp, 
  Settings, 
  Menu, 
  X,
  Circle,
  Plus,
  ChevronDown,
  ChevronRight,
  Files,
  FileText,
  NotebookText,
  FileImage,
  FileAudio2,
  ListChecks,
  Sparkles,
  Inbox,
  Activity,
  MessageSquare
} from 'lucide-react';
import ConversationList from './ConversationList';
import { useChat } from '../../contexts/ChatContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useLibraryCounts } from '../../hooks/useLibraryCounts';
import { NavItem } from '../sidebar/NavItem';

interface SidebarProps {
  children: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [conversationsOpen, setConversationsOpen] = useState(false);
  const { collapsed, toggleCollapsed, libraryOpen, setLibraryOpen } = useSidebar();
  const { currentConvId, selectConversation, newConversation } = useChat();
  const counts = useLibraryCounts();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNewChat = async () => {try {
      await newConversation();
      navigate('/chat');
      setIsMobileMenuOpen(false);} catch (error) {
      console.error('[ERROR] Sidebar: Failed to create new chat:', error);
    }
  };

  const handleConversationSelect = async (convId: string) => {await selectConversation(convId);
    navigate('/chat');
    setIsMobileMenuOpen(false);
  };

  const isOnChatPage = location.pathname === '/chat' || location.pathname === '/';

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-6 left-6 z-50 p-3 bg-bg-secondary rounded-xl hover:bg-bg-hover transition-all duration-200 shadow-premium border border-border-primary animate-scale-hover"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`
        ${collapsed ? 'w-20' : 'w-72'} 
        bg-gradient-to-b from-bg-primary via-bg-primary to-bg-secondary text-text-primary flex flex-col border-r border-border-primary shadow-premium-xl
        transition-all duration-300 ease-in-out overflow-hidden
        ${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-40' : 'hidden lg:flex'}
      `}>
        {/* Header */}
        <div className="px-6 py-8 border-b border-border-secondary">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-1">LOS</h1>
                <p className="text-xs text-text-tertiary uppercase tracking-widest font-medium">Life Operating System</p>
              </div>
            )}
            {collapsed && (
              <div className="w-full text-center">
                <h1 className="text-xl font-bold text-text-primary tracking-tight">LOS</h1>
              </div>
            )}
            <button
              onClick={toggleCollapsed}
              className="hidden lg:block p-2 hover:bg-accent-subtle rounded-lg transition-all duration-150 hover:scale-105"
            >
              <Menu size={18} className="text-text-secondary" />
            </button>
          </div>
        </div>
        
        {/* New Chat Button */}
        {!collapsed && isOnChatPage && (
          <div className="px-4 pt-4 pb-3">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center px-4 h-10 bg-accent-white text-bg-primary rounded-xl hover:scale-105 hover:shadow-glow transition-all duration-200 font-medium text-sm"
            >
              <Plus size={16} className="mr-2" />
              New Chat
            </button>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* Conversations List (only show on chat page) */}
          {!collapsed && isOnChatPage && (
            <div className="border-t border-border-secondary flex-shrink-0">
              {/* Conversations Header */}
              <button
                onClick={() => setConversationsOpen(!conversationsOpen)}
                className={`
                  group w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-accent-subtle transition-all duration-150
                  ${collapsed ? 'justify-center px-3' : ''}
                `}
                title={collapsed ? "Recent Conversations" : undefined}
              >
                <MessageSquare className="h-5 w-5" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left font-medium">Recent Conversations</span>
                    {conversationsOpen ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
                  </>
                )}
              </button>

              {/* Conversations List */}
              {conversationsOpen && (
                <div className="max-h-48 overflow-y-auto">
                  <ConversationList
                    activeConversationId={currentConvId}
                    onConversationSelect={handleConversationSelect}
                    isCollapsed={collapsed}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Navigation */}
          <nav className={`px-4 ${isOnChatPage ? 'py-3' : 'py-6'} ${isOnChatPage ? 'border-t border-border-secondary' : ''} flex-shrink-0`}>
          <div className="space-y-2">
            {/* Chat Section */}
            <div className={!collapsed ? "px-2 pb-1 text-xs uppercase tracking-wide text-text-tertiary" : ""}>
              {!collapsed && "Chat"}
            </div>
            <NavItem to="/chat" icon={Home} label="Chat" collapsed={collapsed} />

            {/* Capture Section */}
            <div className={!collapsed ? "px-2 pb-1 text-xs uppercase tracking-wide text-text-tertiary mt-3" : "mt-3"}>
              {!collapsed && "Capture"}
            </div>
            <NavItem to="/inbox" icon={Inbox} label="Inbox" collapsed={collapsed} />
            <NavItem to="/check-in" icon={Activity} label="Check-In" collapsed={collapsed} />

            {/* Library Section */}
            <div className={!collapsed ? "px-2 pb-1 text-xs uppercase tracking-wide text-text-tertiary mt-3" : "mt-3"}>
              {!collapsed && "Library"}
            </div>
            
            {/* Library Group Header */}
            <button
              onClick={() => setLibraryOpen(!libraryOpen)}
              className={`
                group w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-accent-subtle transition-all duration-150
                ${collapsed ? 'justify-center px-3' : ''}
              `}
              title={collapsed ? "Library" : undefined}
            >
              <BookOpen className="h-5 w-5" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left font-medium">Library</span>
                  <span className="text-xs rounded-md bg-bg-elevated px-2 py-1 text-text-tertiary">
                    {counts.all}
                  </span>
                  {libraryOpen ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
                </>
              )}
            </button>

            {/* Library Sub-items */}
            {libraryOpen && (
              <div className={collapsed ? "flex flex-col items-center gap-1 mt-1" : "ml-6 flex flex-col gap-1 mt-1"}>
                <NavItem to="/library" icon={Files} label="All items" badge={counts.all} collapsed={collapsed} />
                <NavItem to="/library/articles" icon={FileText} label="Articles" badge={counts.articles} collapsed={collapsed} />
                <NavItem to="/library/pdfs" icon={NotebookText} label="PDFs" badge={counts.pdfs} collapsed={collapsed} />
                <NavItem to="/library/notes" icon={NotebookText} label="Notes" badge={counts.notes} collapsed={collapsed} />
                <NavItem to="/library/images" icon={FileImage} label="Images" badge={counts.images} collapsed={collapsed} />
                <NavItem to="/library/audio" icon={FileAudio2} label="Audio" badge={counts.audio} collapsed={collapsed} />
              </div>
            )}

            {/* Autonomy Section */}
            <div className={!collapsed ? "px-2 pb-1 text-xs uppercase tracking-wide text-text-tertiary mt-3" : "mt-3"}>
              {!collapsed && "Autonomy"}
            </div>
            <NavItem to="/rules" icon={ListChecks} label="Rules" collapsed={collapsed} />
            <NavItem to="/briefs" icon={Sparkles} label="Briefs" collapsed={collapsed} />

            {/* Other Navigation */}
            <NavItem to="/knowledge" icon={Network} label="Knowledge Graph" collapsed={collapsed} />
            <NavItem to="/growth" icon={TrendingUp} label="Growth" collapsed={collapsed} />
            <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
          </div>
        </nav>
        </div>

        {/* Current Stage Indicator */}
        <div className="px-4 py-4 border-t border-border-secondary">
          <div className={`
            bg-gradient-to-br from-bg-secondary to-bg-elevated rounded-2xl border border-border-primary shadow-premium-lg p-4 relative overflow-hidden
            ${collapsed ? 'text-center' : ''}
          `}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-focus to-transparent opacity-50"></div>
            {!collapsed && (
              <div className="flex-1 animate-fade-in relative z-10">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 shadow-glow animate-pulse-subtle"></div>
                  <p className="text-xs text-text-tertiary uppercase tracking-widest font-semibold">System Active</p>
                </div>
                <p className="text-xs text-text-disabled uppercase tracking-wide mb-1">Current Stage</p>
                <p className="text-lg font-bold text-text-primary mb-1 tracking-tight">Newborn</p>
                <p className="text-sm text-text-secondary">Level 1 • Just Beginning</p>
              </div>
            )}
            {collapsed && (
              <div className="text-center relative z-10">
                <div className="w-10 h-10 bg-gradient-to-br from-bg-elevated to-bg-hover rounded-xl flex items-center justify-center mx-auto mb-2 shadow-premium-lg border border-border-primary">
                  <span className="text-sm font-bold text-text-primary">1</span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 shadow-glow animate-pulse-subtle"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-bg-primary bg-opacity-80 backdrop-blur-sm z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">
        {/* Vertical Separator */}
        <div className="w-px bg-border-primary"></div>
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Sidebar;
