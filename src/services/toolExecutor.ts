/**
 * LOS Tool Executor - Handles execution of AI tool calls
 * 
 * This file contains the execution logic for all tools defined in chatTools.ts
 * It provides a secure interface between the AI and the database operations.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  // Document operations
  saveDocument,
  deleteDocument,
  updateDocument,
  getAllDocuments,
  getDocument,
  // Fact operations
  saveFact,
  deleteFact,
  updateFact,
  getAllFacts,
  getFact,
  getFactsByCategory,
  // Conversation operations
  getAllConversations,
  getConversation,
  deleteConversation,
  getMessagesByConversation,
  // Interest operations
  saveInterest,
  getAllInterests,
  // Growth operations
  getGrowthMetrics,
  getAllMilestones,
  // Utility operations
  exportData
} from './db';
import { semanticSearch } from './semanticSearch';
import { GrowthService } from './growthService';
import { TOOL_SECURITY_LEVELS, RATE_LIMITS } from './chatTools';

// Audit log for tracking AI actions
interface AuditLogEntry {
  timestamp: string;
  toolName: string;
  parameters: any;
  result: any;
  success: boolean;
  error?: string;
}

const auditLog: AuditLogEntry[] = [];

// Rate limiting state
let lastOperationTime = 0;
let operationsInCurrentMessage = 0;
let destructiveOperationsInCurrentMessage = 0;

// Reset rate limiting counters (call this at start of each message)
export function resetRateLimits(): void {
  operationsInCurrentMessage = 0;
  destructiveOperationsInCurrentMessage = 0;
}

// Check rate limits
function checkRateLimit(toolName: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  
  // Check cooldown period
  if (now - lastOperationTime < RATE_LIMITS.COOLDOWN_PERIOD_MS) {
    return { allowed: false, reason: 'Rate limit: too many operations too quickly' };
  }
  
  // Check max operations per message
  if (operationsInCurrentMessage >= RATE_LIMITS.MAX_OPERATIONS_PER_MESSAGE) {
    return { allowed: false, reason: 'Rate limit: too many operations in this message' };
  }
  
  // Check destructive operations limit
  if (TOOL_SECURITY_LEVELS.DESTRUCTIVE.includes(toolName)) {
    if (destructiveOperationsInCurrentMessage >= RATE_LIMITS.MAX_DESTRUCTIVE_OPERATIONS_PER_MESSAGE) {
      return { allowed: false, reason: 'Rate limit: too many destructive operations in this message' };
    }
  }
  
  return { allowed: true };
}

// Log audit entry
function logAuditEntry(toolName: string, parameters: any, result: any, success: boolean, error?: string): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    toolName,
    parameters,
    result,
    success,
    error
  };
  
  auditLog.push(entry);
  
  // Keep only last 1000 entries to prevent memory issues
  if (auditLog.length > 1000) {
    auditLog.splice(0, auditLog.length - 1000);
  }}

// Main tool execution function
export async function executeTool(toolName: string, args: any): Promise<any> {
  // Check rate limits
  const rateLimitCheck = checkRateLimit(toolName);
  if (!rateLimitCheck.allowed) {
    const error = { success: false, error: rateLimitCheck.reason };
    logAuditEntry(toolName, args, error, false, rateLimitCheck.reason);
    return error;
  }
  
  // Update rate limiting counters
  operationsInCurrentMessage++;
  lastOperationTime = Date.now();
  
  if (TOOL_SECURITY_LEVELS.DESTRUCTIVE.includes(toolName)) {
    destructiveOperationsInCurrentMessage++;
  }
  
  try {
    let result: any;
    
    switch (toolName) {
      // DOCUMENT MANAGEMENT
      case "create_note":
        result = await executeCreateNote(args);
        break;
        
      case "create_bookmark":
        result = await executeCreateBookmark(args);
        break;
        
      case "update_document":
        result = await executeUpdateDocument(args);
        break;
        
      case "delete_document":
        result = await executeDeleteDocument(args);
        break;
        
      case "search_documents":
        result = await executeSearchDocuments(args);
        break;
        
      case "list_documents":
        result = await executeListDocuments(args);
        break;
        
      // FACT MANAGEMENT
      case "add_fact":
        result = await executeAddFact(args);
        break;
        
      case "search_facts":
        result = await executeSearchFacts(args);
        break;
        
      case "list_facts":
        result = await executeListFacts(args);
        break;
        
      case "update_fact":
        result = await executeUpdateFact(args);
        break;
        
      case "delete_fact":
        result = await executeDeleteFact(args);
        break;
        
      // CONVERSATION MANAGEMENT
      case "get_chat_history":
        result = await executeGetChatHistory(args);
        break;
        
      case "search_conversations":
        result = await executeSearchConversations(args);
        break;
        
      case "delete_conversation":
        result = await executeDeleteConversation(args);
        break;
        
      // INTEREST MANAGEMENT
      case "add_interest":
        result = await executeAddInterest(args);
        break;
        
      case "list_interests":
        result = await executeListInterests(args);
        break;
        
      // GROWTH METRICS
      case "get_growth_status":
        result = await executeGetGrowthStatus(args);
        break;
        
      case "get_milestones":
        result = await executeGetMilestones(args);
        break;
        
      // UTILITY
      case "get_user_stats":
        result = await executeGetUserStats(args);
        break;
        
      case "export_data":
        result = await executeExportData(args);
        break;
        
      case "create_summary":
        result = await executeCreateSummary(args);
        break;
        
      default:
        const error = { success: false, error: `Unknown tool: ${toolName}` };
        logAuditEntry(toolName, args, error, false, `Unknown tool: ${toolName}`);
        return error;
    }
    
    logAuditEntry(toolName, args, result, true);
    return result;
    
  } catch (error) {
    const errorResult = { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
    logAuditEntry(toolName, args, errorResult, false, error instanceof Error ? error.message : 'Unknown error');
    return errorResult;
  }
}

// DOCUMENT MANAGEMENT IMPLEMENTATIONS
async function executeCreateNote(args: any): Promise<any> {
  const { title, content, tags = [] } = args;
  
  if (!title || !content) {
    return { success: false, error: 'Title and content are required' };
  }
  
  const docId = uuidv4();
  await saveDocument({
    id: docId,
    type: 'note',
    title,
    content,
    url: '',
    metadata: {
      source: 'chat_created',
      date_added: new Date().toISOString(),
      tags: Array.isArray(tags) ? tags : []
    },
    chunks: [] // Will be processed later by document processor
  });
  
  return { 
    success: true, 
    message: `Created note "${title}" with ID: ${docId}`,
    document_id: docId
  };
}

async function executeCreateBookmark(args: any): Promise<any> {
  const { title, url, description = '' } = args;
  
  if (!title || !url) {
    return { success: false, error: 'Title and URL are required' };
  }
  
  const docId = uuidv4();
  await saveDocument({
    id: docId,
    type: 'bookmark',
    title,
    content: description,
    url,
    metadata: {
      source: 'chat_created',
      date_added: new Date().toISOString(),
      tags: []
    },
    chunks: []
  });
  
  return { 
    success: true, 
    message: `Created bookmark "${title}" for ${url}`,
    document_id: docId
  };
}

async function executeUpdateDocument(args: any): Promise<any> {
  const { document_id, title, content, tags } = args;
  
  if (!document_id) {
    return { success: false, error: 'Document ID is required' };
  }
  
  const doc = await getDocument(document_id);
  if (!doc) {
    return { success: false, error: 'Document not found' };
  }
  
  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (tags !== undefined) {
    updates.metadata = {
      ...doc.metadata,
      tags: Array.isArray(tags) ? tags : []
    };
  }
  
  await updateDocument(document_id, updates);
  
  return { 
    success: true, 
    message: `Updated document "${doc.title}"`
  };
}

async function executeDeleteDocument(args: any): Promise<any> {
  const { document_id, confirmation } = args;
  
  if (!document_id) {
    return { success: false, error: 'Document ID is required' };
  }
  
  if (confirmation !== 'yes') {
    return { 
      success: false, 
      error: 'Deletion requires confirmation. Please confirm by setting confirmation to "yes"' 
    };
  }
  
  const doc = await getDocument(document_id);
  if (!doc) {
    return { success: false, error: 'Document not found' };
  }
  
  await deleteDocument(document_id);
  
  return { 
    success: true, 
    message: `Deleted document "${doc.title}"`
  };
}

async function executeSearchDocuments(args: any): Promise<any> {
  const { query, limit = 5, type = 'all' } = args;
  
  if (!query) {
    return { success: false, error: 'Search query is required' };
  }
  
  const results = await semanticSearch(query, limit);
  
  // Filter by type if specified
  const filteredResults = type === 'all' 
    ? results 
    : results.filter(r => r.documentType === type);
  
  return {
    success: true,
    results: filteredResults.map(r => ({
      id: r.chunk.id,
      document_id: r.documentId,
      title: r.documentTitle,
      type: r.documentType,
      snippet: r.chunk.text.substring(0, 200),
      similarity: r.similarityPercentage
    }))
  };
}

async function executeListDocuments(args: any): Promise<any> {
  const { filter_by_tag, filter_by_type = 'all', limit = 20 } = args;
  
  const allDocs = await getAllDocuments();
  
  let filtered = allDocs;
  
  // Filter by type
  if (filter_by_type !== 'all') {
    filtered = filtered.filter(d => d.type === filter_by_type);
  }
  
  // Filter by tag
  if (filter_by_tag) {
    filtered = filtered.filter(d => 
      d.metadata.tags?.includes(filter_by_tag)
    );
  }
  
  // Apply limit
  filtered = filtered.slice(0, limit);
  
  return {
    success: true,
    documents: filtered.map(d => ({
      id: d.id,
      title: d.title,
      type: d.type,
      url: d.url,
      tags: d.metadata.tags,
      date_added: d.metadata.date_added
    }))
  };
}

// FACT MANAGEMENT IMPLEMENTATIONS
async function executeAddFact(args: any): Promise<any> {
  const { category, subject, fact_text, context = '' } = args;
  
  if (!category || !subject || !fact_text) {
    return { success: false, error: 'Category, subject, and fact_text are required' };
  }
  
  const factId = uuidv4();
  await saveFact({
    id: factId,
    category,
    subject,
    fact_text,
    context,
    confidence: 1.0,
    source_id: 'chat_added',
    date_created: new Date().toISOString(),
    date_updated: new Date().toISOString(),
    status: 'active',
    relationships: []
  });
  
  return { 
    success: true, 
    message: `Added fact: ${fact_text}`,
    fact_id: factId
  };
}

async function executeSearchFacts(args: any): Promise<any> {
  const { query, category, subject, limit = 10 } = args;
  
  if (!query) {
    return { success: false, error: 'Search query is required' };
  }
  
  let facts = await getAllFacts();
  
  // Filter by category if specified
  if (category) {
    facts = facts.filter(f => f.category === category);
  }
  
  // Filter by subject if specified
  if (subject) {
    facts = facts.filter(f => f.subject.toLowerCase().includes(subject.toLowerCase()));
  }
  
  // Simple text search in fact_text and context
  const searchLower = query.toLowerCase();
  facts = facts.filter(f => 
    f.fact_text.toLowerCase().includes(searchLower) ||
    f.context.toLowerCase().includes(searchLower) ||
    f.subject.toLowerCase().includes(searchLower)
  );
  
  // Apply limit
  facts = facts.slice(0, limit);
  
  return {
    success: true,
    facts: facts.map(f => ({
      id: f.id,
      category: f.category,
      subject: f.subject,
      fact_text: f.fact_text,
      context: f.context,
      date_created: f.date_created
    }))
  };
}

async function executeListFacts(args: any): Promise<any> {
  const { category, limit = 20 } = args;
  
  let facts = await getAllFacts();
  
  // Filter by category if specified
  if (category) {
    facts = facts.filter(f => f.category === category);
  }
  
  // Apply limit
  facts = facts.slice(0, limit);
  
  return {
    success: true,
    facts: facts.map(f => ({
      id: f.id,
      category: f.category,
      subject: f.subject,
      fact_text: f.fact_text,
      context: f.context,
      date_created: f.date_created
    }))
  };
}

async function executeUpdateFact(args: any): Promise<any> {
  const { fact_id, fact_text, context } = args;
  
  if (!fact_id) {
    return { success: false, error: 'Fact ID is required' };
  }
  
  const fact = await getFact(fact_id);
  if (!fact) {
    return { success: false, error: 'Fact not found' };
  }
  
  const updates: any = {};
  if (fact_text !== undefined) updates.fact_text = fact_text;
  if (context !== undefined) updates.context = context;
  
  await updateFact(fact_id, updates);
  
  return { 
    success: true, 
    message: `Updated fact about ${fact.subject}`
  };
}

async function executeDeleteFact(args: any): Promise<any> {
  const { fact_id, confirmation } = args;
  
  if (!fact_id) {
    return { success: false, error: 'Fact ID is required' };
  }
  
  if (confirmation !== 'yes') {
    return { 
      success: false, 
      error: 'Deletion requires confirmation. Please confirm by setting confirmation to "yes"' 
    };
  }
  
  const fact = await getFact(fact_id);
  if (!fact) {
    return { success: false, error: 'Fact not found' };
  }
  
  await deleteFact(fact_id);
  
  return { 
    success: true, 
    message: `Deleted fact about ${fact.subject}`
  };
}

// CONVERSATION MANAGEMENT IMPLEMENTATIONS
async function executeGetChatHistory(args: any): Promise<any> {
  const { conversation_id, limit = 10 } = args;
  
  if (conversation_id) {
    const conversation = await getConversation(conversation_id);
    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }
    
    const messages = await getMessagesByConversation(conversation_id);
    
    return { 
      success: true, 
      conversation: {
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        message_count: messages.length,
        messages: messages.slice(-limit) // Last N messages
      }
    };
  } else {
    const conversations = await getAllConversations();
    const recent = conversations
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, limit);
    
    return { 
      success: true, 
      conversations: recent.map(c => ({
        id: c.id,
        title: c.title,
        created_at: c.created_at,
        updated_at: c.updated_at,
        message_count: 0 // Would need to count messages for each
      }))
    };
  }
}

async function executeSearchConversations(args: any): Promise<any> {
  const { query, limit = 5 } = args;
  
  if (!query) {
    return { success: false, error: 'Search query is required' };
  }
  
  const conversations = await getAllConversations();
  const searchLower = query.toLowerCase();
  
  // Simple search in conversation titles
  const matching = conversations.filter(c => 
    c.title.toLowerCase().includes(searchLower)
  );
  
  return {
    success: true,
    conversations: matching.slice(0, limit).map(c => ({
      id: c.id,
      title: c.title,
      created_at: c.created_at,
      updated_at: c.updated_at
    }))
  };
}

async function executeDeleteConversation(args: any): Promise<any> {
  const { conversation_id, confirmation } = args;
  
  if (!conversation_id) {
    return { success: false, error: 'Conversation ID is required' };
  }
  
  if (confirmation !== 'yes') {
    return { 
      success: false, 
      error: 'Deletion requires confirmation. Please confirm by setting confirmation to "yes"' 
    };
  }
  
  const conversation = await getConversation(conversation_id);
  if (!conversation) {
    return { success: false, error: 'Conversation not found' };
  }
  
  await deleteConversation(conversation_id);
  
  return { 
    success: true, 
    message: `Deleted conversation "${conversation.title}"`
  };
}

// INTEREST MANAGEMENT IMPLEMENTATIONS
async function executeAddInterest(args: any): Promise<any> {
  const { name, category, description = '', engagement_score = 50 } = args;
  
  if (!name || !category) {
    return { success: false, error: 'Name and category are required' };
  }
  
  const interestId = uuidv4();
  await saveInterest({
    id: interestId,
    name,
    category,
    description,
    engagement_score: Math.max(0, Math.min(100, engagement_score)),
    last_activity: new Date().toISOString(),
    tags: []
  });
  
  return { 
    success: true, 
    message: `Added interest "${name}" in category ${category}`,
    interest_id: interestId
  };
}

async function executeListInterests(args: any): Promise<any> {
  const { category, limit = 20 } = args;
  
  let interests = await getAllInterests();
  
  // Filter by category if specified
  if (category) {
    interests = interests.filter(i => i.category === category);
  }
  
  // Apply limit
  interests = interests.slice(0, limit);
  
  return {
    success: true,
    interests: interests.map(i => ({
      id: i.id,
      name: i.name,
      category: i.category,
      description: i.description,
      engagement_score: i.engagement_score,
      last_activity: i.last_activity
    }))
  };
}

// GROWTH METRICS IMPLEMENTATIONS
async function executeGetGrowthStatus(args: any): Promise<any> {
  const growthState = await GrowthService.getGrowthState();
  const stage = GrowthService.getStage(growthState.level);
  
  return {
    success: true,
    growth: {
      level: growthState.level,
      stage: stage.name,
      xp: growthState.xp,
      totalConversations: growthState.totalConversations,
      totalDocuments: growthState.totalDocuments,
      totalFacts: growthState.totalFacts,
      daysActive: growthState.daysActive,
      nextLevelXp: stage.nextLevelXp
    }
  };
}

async function executeGetMilestones(args: any): Promise<any> {
  const { category, achieved_only = true } = args;
  
  const milestones = await getAllMilestones();
  
  let filtered = milestones;
  
  // Filter by category if specified
  if (category) {
    filtered = filtered.filter(m => m.category === category);
  }
  
  // Filter by achieved status if specified
  if (achieved_only) {
    filtered = filtered.filter(m => m.achievedAt > 0);
  }
  
  return {
    success: true,
    milestones: filtered.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      category: m.category,
      xpReward: m.xpReward,
      achievedAt: m.achievedAt,
      achieved: m.achievedAt > 0
    }))
  };
}

// UTILITY IMPLEMENTATIONS
async function executeGetUserStats(args: any): Promise<any> {
  const documents = await getAllDocuments();
  const facts = await getAllFacts();
  const conversations = await getAllConversations();
  const interests = await getAllInterests();
  const growthState = await GrowthService.getGrowthState();
  
  return {
    success: true,
    stats: {
      documents: {
        total: documents.length,
        notes: documents.filter(d => d.type === 'note').length,
        bookmarks: documents.filter(d => d.type === 'bookmark').length
      },
      facts: {
        total: facts.length,
        byCategory: facts.reduce((acc, f) => {
          acc[f.category] = (acc[f.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      conversations: {
        total: conversations.length,
        totalMessages: 0 // Would need to count messages
      },
      interests: {
        total: interests.length,
        byCategory: interests.reduce((acc, i) => {
          acc[i.category] = (acc[i.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      growth: {
        level: growthState.level,
        xp: growthState.xp,
        daysActive: growthState.daysActive
      }
    }
  };
}

async function executeExportData(args: any): Promise<any> {
  try {
    const data = await exportData();
    return {
      success: true,
      message: 'Data exported successfully',
      data: JSON.parse(data) // Return parsed data for AI to work with
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to export data'
    };
  }
}

async function executeCreateSummary(args: any): Promise<any> {
  const { query, summary_title, summary_type = 'summary' } = args;
  
  if (!query || !summary_title) {
    return { success: false, error: 'Query and summary_title are required' };
  }
  
  try {
    // Search for documents to summarize
    const searchResults = await semanticSearch(query, 10);
    
    if (searchResults.length === 0) {
      return { 
        success: false, 
        error: `No documents found matching "${query}"` 
      };
    }
    
    // Create summary content
    const summaryContent = `# ${summary_title}

**Summary Type:** ${summary_type}
**Generated:** ${new Date().toLocaleDateString()}
**Source Documents:** ${searchResults.length} documents found

## Overview
This summary covers ${searchResults.length} documents related to "${query}".

## Key Documents
${searchResults.map((result, i) => `
### ${i + 1}. ${result.documentTitle}
- **Type:** ${result.documentType}
- **Relevance:** ${result.similarityPercentage}%
- **Content:** ${result.chunk.text.substring(0, 200)}...
`).join('')}

## Summary
Based on the ${searchResults.length} documents found, here are the key insights:

${searchResults.map((result, i) => `
**${result.documentTitle}** (${result.similarityPercentage}% relevant):
${result.chunk.text.substring(0, 300)}...
`).join('')}

---
*This summary was automatically generated from your knowledge base.*`;

    // Save the summary as a note
    const docId = uuidv4();
    await saveDocument({
      id: docId,
      type: 'note',
      title: summary_title,
      content: summaryContent,
      url: '',
      metadata: {
        source: 'ai_summary',
        date_added: new Date().toISOString(),
        tags: ['summary', summary_type, 'ai-generated'],
        summary_query: query,
        source_documents: searchResults.length
      },
      chunks: []
    });
    
    return { 
      success: true, 
      message: `Created ${summary_type} "${summary_title}" based on ${searchResults.length} documents`,
      document_id: docId,
      source_documents: searchResults.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Failed to create summary: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Get audit log for debugging
export function getAuditLog(): AuditLogEntry[] {
  return [...auditLog];
}

// Clear audit log
export function clearAuditLog(): void {
  auditLog.length = 0;
}
