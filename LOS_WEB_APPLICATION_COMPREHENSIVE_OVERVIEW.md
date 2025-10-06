# LOS (Life Operating System) - Comprehensive Web Application Overview

## Table of Contents
1. [Application Overview](#application-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Core Features & Capabilities](#core-features--capabilities)
4. [AI Agent System](#ai-agent-system)
5. [Data Management & Storage](#data-management--storage)
6. [User Interface Components](#user-interface-components)
7. [Services & APIs](#services--apis)
8. [Browser Extension](#browser-extension)
9. [Development & Deployment](#development--deployment)
10. [Future Roadmap](#future-roadmap)

---

## Application Overview

**LOS (Life Operating System)** is a comprehensive AI-powered personal knowledge management and productivity platform designed to serve as an intelligent extension of the user's mind. The application combines advanced AI capabilities with robust data management to create a personalized learning and productivity ecosystem.

### Core Philosophy
- **Autonomous AI Agent**: Operates as an extension of the user's mind, anticipating needs and executing actions proactively
- **Personal Knowledge Base**: Centralized repository for documents, facts, interests, and growth metrics
- **Intelligent Search**: Multi-engine web search combined with semantic local search
- **Growth Tracking**: Gamified learning and productivity metrics with milestone achievements
- **Cross-Platform Integration**: Web application with browser extension for seamless content capture

---

## Architecture & Technology Stack

### Frontend Framework
- **React 19.1.0** with TypeScript
- **Vite 7.0.4** for build tooling and development server
- **Tailwind CSS 3.4.18** for styling
- **React Router DOM 7.9.3** for navigation
- **Lucide React** for icons

### Backend & Database
- **IndexedDB** via `idb` library for client-side storage
- **SQLite3** for Tauri desktop integration
- **Express.js** for API server (when needed)

### AI & Machine Learning
- **Anthropic Claude API** (Haiku & Sonnet models)
- **OpenAI API** integration
- **Ollama** for local AI model support
- **@xenova/transformers** for local embeddings
- **PDF.js** for document processing

### Desktop Integration
- **Tauri 2.0** for desktop application wrapper
- **Tauri API** for native OS integration
- **Tauri Plugin Opener** for external application integration

### Development Tools
- **TypeScript 5.8.3** for type safety
- **PostCSS & Autoprefixer** for CSS processing
- **React Hot Toast** for notifications
- **UUID** for unique identifier generation

---

## Core Features & Capabilities

### 1. **Intelligent Chat System**
- **Dual Chat Architectures**:
  - **Agent Chat**: Advanced Claude-powered agent with tool calling capabilities
  - **Simple Chat**: Direct OpenAI integration with RAG (Retrieval Augmented Generation)
- **Conversation Management**: Persistent chat history with conversation switching
- **Context Awareness**: Application state context for intelligent responses
- **Pre-routing**: Smart query routing to optimize response quality

### 2. **Personal Knowledge Base**
- **Document Management**: Create, read, update, delete notes and documents
- **URL Bookmarking**: Save and categorize web resources
- **File Upload**: Support for PDF, text, and other document formats
- **Semantic Search**: AI-powered search across all personal content
- **Content Processing**: Automatic text extraction and embedding generation

### 3. **Multi-Engine Web Search**
- **Premium APIs**: Brave Search API, Google Search API (Serper.dev)
- **Free Search Engines**: Wikipedia, DuckDuckGo, Google, Bing
- **Intelligent Fallback**: Automatic switching between search providers
- **Search Caching**: 1-hour cache to optimize performance
- **Parallel Processing**: Multiple search engines queried simultaneously

### 4. **Growth & Learning System**
- **Gamified Metrics**: Level-based progression system
- **Milestone Tracking**: Achievement system with notifications
- **Interest Management**: Track and analyze learning patterns
- **Progress Visualization**: Growth charts and statistics
- **Personalized Recommendations**: AI-driven content suggestions

### 5. **Memory & Context System**
- **Fact Management**: Store and retrieve personal facts and preferences
- **Interest Tracking**: Monitor and analyze user interests over time
- **Conversation Memory**: Persistent context across chat sessions
- **Pattern Analysis**: Identify learning and interest patterns
- **Proactive Suggestions**: AI-driven recommendations based on patterns

### 6. **Library Management**
- **Document Organization**: Categorized document storage
- **Rich Text Editor**: Built-in note editor with formatting
- **File Processing**: Automatic content extraction and indexing
- **Search & Filter**: Advanced search capabilities across all content
- **Export/Import**: Data portability and backup functionality

---

## AI Agent System

### Agent Architecture
The LOS AI agent is built on a sophisticated multi-layer architecture:

#### 1. **ClaudeAgent Class**
- **Model Selection**: Automatic switching between Haiku (fast) and Sonnet (comprehensive)
- **Tool Integration**: Access to 15+ specialized tools for data manipulation
- **Context Management**: Application state awareness for intelligent responses
- **Cost Optimization**: Usage tracking and cost management

#### 2. **Tool System**
**Document Management Tools**:
- `create_note`, `create_bookmark`, `update_document`, `delete_document`
- `search_documents`, `list_documents`

**Fact Management Tools**:
- `add_fact`, `search_facts`, `list_facts`, `update_fact`, `delete_fact`

**Conversation Tools**:
- `get_chat_history`, `search_conversations`, `delete_conversation`

**Analysis Tools**:
- `analyze_content_patterns`, `get_proactive_suggestions`
- `search_web`, `create_document`

**Growth Tools**:
- `get_growth_status`, `get_milestones`, `get_user_stats`

#### 3. **Intelligent Routing**
- **PreRouter**: Handles trivial queries without engaging full agent
- **QueryRouter**: Determines optimal search strategy (local vs web vs hybrid)
- **Smart Fallbacks**: Graceful degradation when services are unavailable

#### 4. **System Prompts**
**Optimized for Maximum Efficiency**:
- Autonomous operation as user's mind extension
- Proactive action execution
- Comprehensive tool utilization
- Web search mastery with strategic triggers
- Actionable response optimization

---

## Data Management & Storage

### Database Schema
**IndexedDB Structure**:
```typescript
interface LOSDatabase {
  conversations: ConversationStore
  messages: MessageStore
  documents: DocumentStore
  facts: FactStore
  interests: InterestStore
  growth: GrowthStore
  settings: SettingStore
  embeddings: EmbeddingStore
  milestones: MilestoneStore
}
```

### Data Types
- **Conversations**: Chat sessions with metadata and timestamps
- **Messages**: Individual chat messages with role and content
- **Documents**: Notes, bookmarks, and uploaded files
- **Facts**: Personal facts and preferences
- **Interests**: Categorized interest tracking
- **Growth**: Learning metrics and progress data
- **Settings**: Application configuration and preferences
- **Embeddings**: Vector representations for semantic search
- **Milestones**: Achievement tracking and notifications

### Data Processing Pipeline
1. **Content Ingestion**: Files uploaded or URLs bookmarked
2. **Text Extraction**: PDF and document content extraction
3. **Embedding Generation**: Vector embeddings for semantic search
4. **Indexing**: Content indexed for fast retrieval
5. **Categorization**: Automatic tagging and organization

---

## User Interface Components

### Main Application Structure
```
App.tsx
├── Sidebar (Navigation)
│   ├── ConversationList
│   └── Navigation Menu
├── Main Content Area
│   ├── AgentChat (Primary Interface)
│   ├── Library (Document Management)
│   ├── KnowledgeGraph (Visualization)
│   ├── Growth (Progress Tracking)
│   └── Settings (Configuration)
└── Toast Notifications
```

### Component Architecture
- **AgentChat**: Main AI interaction interface
- **Library**: Document management and organization
- **KnowledgeGraph**: Visual content relationship mapping
- **Growth**: Progress tracking and milestone visualization
- **Settings**: Application configuration and API key management
- **Sidebar**: Navigation and conversation management

### Responsive Design
- **Mobile-First**: Optimized for mobile and tablet devices
- **Desktop Integration**: Full desktop app via Tauri
- **Cross-Platform**: Consistent experience across devices

---

## Services & APIs

### Core Services
1. **Database Service** (`db.ts`): IndexedDB operations and data management
2. **AI Services** (`openai.ts`, `ollama.ts`): AI model integrations
3. **Web Search** (`webSearch.ts`): Multi-engine search implementation
4. **Document Processing** (`documentProcessor.ts`): File handling and text extraction
5. **Embeddings** (`embeddings.ts`): Vector generation for semantic search
6. **Growth Service** (`growthService.ts`): Learning metrics and progress tracking
7. **Memory Management** (`memoryManager.ts`): Context and fact management

### External API Integrations
- **Anthropic Claude API**: Primary AI model provider
- **OpenAI API**: Secondary AI model support
- **Brave Search API**: Premium web search
- **Google Search API**: Alternative search provider
- **Ollama**: Local AI model support

### Security & Rate Limiting
- **API Key Management**: Secure storage and rotation
- **Rate Limiting**: Tool usage limits and abuse prevention
- **Audit Logging**: Comprehensive operation tracking
- **Data Validation**: Input sanitization and validation

---

## Browser Extension

### Extension Features
- **Content Capture**: Save web pages and articles to LOS
- **Quick Access**: Fast bookmarking and note creation
- **Context Integration**: Seamless integration with main application
- **Privacy-Focused**: Local data processing and storage

### Technical Implementation
- **Manifest V3**: Modern extension architecture
- **Content Scripts**: Web page interaction and content extraction
- **Background Service**: Extension lifecycle management
- **Popup Interface**: Quick access to core features

---

## Development & Deployment

### Development Environment
- **Hot Module Replacement**: Instant development feedback
- **TypeScript**: Full type safety and IntelliSense
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting and style consistency

### Build Process
- **Vite Build**: Optimized production builds
- **Tauri Build**: Desktop application packaging
- **Asset Optimization**: Image and resource optimization
- **Bundle Analysis**: Performance monitoring and optimization

### Deployment Options
1. **Web Application**: Standard web deployment
2. **Desktop Application**: Tauri-based native app
3. **Browser Extension**: Chrome/Firefox extension store
4. **Self-Hosted**: Private deployment options

---

## Future Roadmap

### Short-Term Enhancements
- **Enhanced AI Models**: Integration with latest AI models
- **Advanced Search**: Improved semantic search capabilities
- **Mobile App**: Native mobile application development
- **API Expansion**: Additional search engine integrations

### Medium-Term Goals
- **Collaboration Features**: Multi-user knowledge sharing
- **Advanced Analytics**: Detailed learning analytics
- **Plugin System**: Third-party integration capabilities
- **Cloud Sync**: Cross-device synchronization

### Long-Term Vision
- **AI Agent Marketplace**: Community-driven AI agents
- **Enterprise Features**: Team and organization management
- **Advanced Automation**: Workflow automation capabilities
- **Research Integration**: Academic and research tool integration

---

## Technical Specifications

### Performance Metrics
- **Initial Load Time**: < 2 seconds
- **Search Response Time**: < 500ms for local search
- **Web Search Response**: < 3 seconds for multi-engine search
- **Memory Usage**: Optimized for efficient resource utilization

### Browser Support
- **Chrome**: Full support with extension
- **Firefox**: Full support with extension
- **Safari**: Web application support
- **Edge**: Full support

### System Requirements
- **Minimum RAM**: 4GB
- **Storage**: 1GB for application and data
- **Internet**: Required for AI services and web search
- **OS**: Windows, macOS, Linux (desktop app)

---

## Conclusion

LOS represents a comprehensive approach to personal knowledge management, combining cutting-edge AI capabilities with robust data management and user-friendly interfaces. The application's modular architecture and extensive feature set make it a powerful tool for personal productivity, learning, and knowledge organization.

The system's autonomous AI agent, multi-engine search capabilities, and comprehensive data management create a unique platform that adapts to user needs and grows with their learning journey. With its cross-platform availability and extensible architecture, LOS is positioned to become a central hub for personal knowledge management and AI-assisted productivity.

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Application Version: 0.1.0*
