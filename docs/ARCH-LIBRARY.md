# LOS Library Architecture Documentation

## Overview

The LOS Library autonomy system transforms the application from a reactive AI assistant into a proactive AI partner that anticipates needs and executes actions autonomously while maintaining complete user control and transparency.

## Core Architecture Components

### 1. Event Bus System (`src/services/eventBus.ts`)

**Purpose**: Centralized event orchestration for all Library autonomy features.

**Key Features**:
- Event routing and subscription management
- Event persistence for audit trails
- Integration with existing performance monitoring
- Type-safe event definitions

**Event Types**:
```typescript
export type AppEvent =
  | { kind: 'library.item.created'; at: number; itemId: string; payload: LibraryPayload }
  | { kind: 'workflow.proposed'; at: number; planId: string; ruleId: string }
  | { kind: 'workflow.executed'; at: number; planId: string; receiptId: string }
  | { kind: 'workflow.failed'; at: number; planId: string; error: string };
```

**Integration Points**:
- Library save operations emit `library.item.created`
- Rules engine subscribes to events for evaluation
- Check-In system displays event history

### 2. Background Queue Manager (`src/services/queueManager.ts`)

**Purpose**: Persistent background task execution with retry mechanisms.

**Key Features**:
- Persistent queue using existing IndexedDB infrastructure
- Task states: queued/running/success/fail
- Exponential backoff retry logic
- Integration with performance monitoring for metrics

**Queue States**:
- `queued`: Task waiting for execution
- `running`: Task currently executing
- `success`: Task completed successfully
- `fail`: Task failed (will retry based on policy)

**Integration Points**:
- Auto-enrichment tasks queued on document ingestion
- Shadow execution previews generated in background
- Policy enforcement checks queued for evaluation

### 3. Check-In System (`src/components/CheckIn/`)

**Purpose**: Centralized activity feed and proposal management interface.

**Key Features**:
- Activity tracking for all Library operations
- Proposal system with preview and approval workflow
- Run/Undo functionality for executed actions
- Cost and performance metrics dashboard

**UI Sections**:
- **Yesterday**: Summary of previous day's activities
- **Proposals**: Pending actions awaiting approval
- **Recent Actions**: Timeline of recent system activities

**Integration Points**:
- Displays events from Event Bus
- Shows proposals from Rules engine
- Manages receipts from Shadow execution
- Connects to performance monitoring for metrics

### 4. Rules Engine (`src/services/rulesEngine.ts`)

**Purpose**: Intelligent decision-making system with Observe/Ask/Auto modes.

**Key Features**:
- Rule-based automation with three modes:
  - `observe`: Log actions without execution
  - `ask`: Create proposals for user approval
  - `auto`: Execute actions automatically
- Rule evaluation based on event triggers
- Statistics tracking for rule performance

**Rule Structure**:
```typescript
export interface Rule {
  id: string;
  trigger: { 
    on: 'library.item.created'; 
    when?: Record<string, unknown> 
  };
  actions: { tool: string; args?: unknown }[];
  mode: RuleMode;
  stats: { proposed: number; accepted: number };
}
```

**Default Rules**:
- URL ingestion → propose summarize + tag
- PDF ingestion → propose extract + summarize
- Text ingestion → propose categorize + link related

**Integration Points**:
- Subscribes to Event Bus for trigger evaluation
- Uses existing `executeAgentTool` for action execution
- Creates proposals in Check-In system

### 5. Shadow Execution System (`src/services/shadowExecutor.ts`)

**Purpose**: Safe preview and rollback system for autonomous actions.

**Key Features**:
- Dry-run execution with sandbox adapters
- Cost and time estimation
- Receipt generation for executed actions
- Rollback capabilities for undo operations

**Shadow Mode**:
- No actual writes to database
- No external API calls
- Returns deltas and estimated costs
- Preview shown in Check-In proposals

**Receipt System**:
```typescript
interface Receipt {
  id: string;
  plan: ExecutionPlan;
  writes: WriteOperation[];
  externalCalls: ApiCall[];
  cost: CostEstimate;
  timestamp: number;
}
```

**Integration Points**:
- Extends existing `executeAgentTool` with shadow mode
- Generates receipts for audit trails
- Enables rollback functionality in Check-In

### 6. Policy Engine (`src/services/policyEngine.ts`)

**Purpose**: Security guardrails and resource management.

**Key Features**:
- Domain allowlists for web operations
- Token usage caps per day
- Time limits per day
- Filesystem access scopes
- Policy violation handling

**Policy Types**:
- **Resource Limits**: Token caps, time limits
- **Security Policies**: Domain allowlists, file access
- **Cost Controls**: Daily spending limits
- **Safety Policies**: Destructive operation restrictions

**Integration Points**:
- Policy checks at tool execution boundary
- Violations create Check-In warnings
- Uses existing `TOOL_SECURITY_LEVELS` infrastructure

### 7. Auto Enrichment Pipeline (`src/services/documentEnricher.ts`)

**Purpose**: Automatic document processing and enhancement.

**Key Features**:
- Extract → Summarize → Topics/Entities → Embed+Index → Link Related
- LLM-based enrichment using secure backend calls
- Integration with existing semantic search
- Background processing with progress tracking

**Enrichment Steps**:
1. **Extract**: Content extraction from various formats
2. **Summarize**: AI-generated summaries with key quotes
3. **Topics/Entities**: Automatic categorization and entity extraction
4. **Embed+Index**: Vector embeddings for semantic search
5. **Link Related**: Connect to similar documents

**Integration Points**:
- Extends existing `documentProcessor.ts`
- Triggered by Rules engine
- Uses existing embedding and search infrastructure

### 8. Audio Ingestion System (`src/components/Audio/`)

**Purpose**: Voice note recording and transcription (feature-flagged).

**Key Features**:
- Web Audio API recording interface
- Transcription via secure backend or Whisper CLI
- Integration with enrichment pipeline
- Feature-flagged for gradual rollout

**Audio Processing**:
- Record → Transcribe → Summarize → Actions
- Rule: `library.item.created` with `payload.type === 'audio'`
- Integration with existing document processing

## Security Architecture

### API Key Security
- **Current Issue**: Keys exposed via `dangerouslyAllowBrowser: true`
- **Solution**: Move to Tauri backend with secure storage
- **Implementation**: `src-tauri/src/secrets.rs` with encrypted storage

### Content Security Policy
- **Current Issue**: CSP disabled (`"csp": null`)
- **Solution**: Implement proper CSP headers
- **Implementation**: Update `src-tauri/tauri.conf.json`

### Encryption at Rest
- **Implementation**: Extend existing `src/services/db.ts` with encryption wrapper
- **Key Management**: Use `invoke('get_secret', 'DB_KEY')` for encryption keys
- **Migration**: Existing documents migrated to encrypted storage

## Integration with Existing Systems

### Feature Flag Integration
- Uses existing `src/services/foundation/featureFlags.ts`
- All new features behind feature flags for safe rollout
- Gradual enablement with rollout percentages

### Performance Monitoring
- Extends existing `src/services/foundation/performanceMonitor.ts`
- Cost tracking for AI operations
- Performance metrics for all new services

### Database Integration
- Builds on existing IndexedDB infrastructure
- Extends `src/services/db.ts` patterns
- Maintains existing data models

### UI Integration
- Follows existing component patterns in `src/components/`
- Uses existing Tailwind CSS design system
- Maintains current color scheme and styling

## Implementation Phases

### Phase 0: Infrastructure ✅
- Feature flags added
- Scripts updated
- Architecture documentation created

### Phase 1: Security Remediation
- Move API keys to Tauri backend
- Implement CSP
- Add encryption at rest

### Phase 2: Event System
- Event Bus implementation
- Background Queue Manager
- Integration with existing services

### Phase 3: Check-In System
- Activity tracking
- Proposal management UI
- Integration with Event Bus

### Phase 4: Rules Engine
- Rule evaluation system
- Default rule configurations
- Integration with Check-In

### Phase 5: Shadow Execution
- Dry-run execution system
- Receipt tracking
- Rollback capabilities

### Phase 6: Policy Engine
- Security guardrails
- Resource management
- Policy enforcement

### Phase 7: Auto Enrichment
- Document processing pipeline
- AI-powered enhancement
- Background processing

### Phase 8: Audio Ingestion
- Voice recording interface
- Transcription service
- Feature-flagged rollout

### Phase 9: Extension Communication
- Native messaging implementation
- Reliable extension integration
- Error handling and retries

### Phase 10: Observability
- Enhanced cost tracking
- Structured logging
- Performance dashboards

## Success Metrics

### Functional Metrics
- [ ] Check-In shows all system activities
- [ ] Rules engine evaluates triggers correctly
- [ ] Shadow execution provides accurate previews
- [ ] Policy engine blocks violations
- [ ] Auto enrichment processes documents
- [ ] Rollback functionality works reliably

### Performance Metrics
- [ ] End-to-end ingestion time < 5 seconds
- [ ] Background processing doesn't block UI
- [ ] Cost tracking accuracy > 95%
- [ ] Policy enforcement response time < 100ms

### Security Metrics
- [ ] No API keys in client bundle
- [ ] CSP active and functional
- [ ] Encrypted storage working
- [ ] All operations audited

## Future Extensions

### Advanced Features
- Machine learning for rule optimization
- Cross-platform mobile support
- Team collaboration features
- Advanced analytics and insights

### Integration Opportunities
- Calendar integration for time-based rules
- Email integration for document ingestion
- Social media monitoring
- IoT device integration

This architecture provides a solid foundation for Library autonomy while maintaining security, performance, and user control throughout the implementation process.
