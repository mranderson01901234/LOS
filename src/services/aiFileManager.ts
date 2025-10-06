import { v4 as uuidv4 } from 'uuid';
import { saveDocument, deleteDocument, getAllDocuments, getDocument, updateDocument } from './db';
import { processDocumentForRAG } from './documentProcessor';
import type { Document } from '../types/database';

export interface AIFileOperation {
  type: 'create' | 'update' | 'delete' | 'list';
  success: boolean;
  message: string;
  document?: Document;
  documents?: Document[];
}

/**
 * AI File Manager - Gives the LOS AI full access to manage files in the Library
 */
export class AIFileManager {
  
  /**
   * Create a new document in the Library
   */
  static async createDocument(
    type: 'note' | 'url' | 'file',
    title: string,
    content: string,
    url?: string,
    tags?: string[]
  ): Promise<AIFileOperation> {
    try {const document: Document = {
        id: uuidv4(),
        type,
        title,
        content,
        url,
        date_added: new Date().toISOString(),
        tags: tags || [],
        isProcessed: false
      };
      
      // Save the document
      await saveDocument(document);
      
      // Notify Library component to refresh
      window.dispatchEvent(new CustomEvent('documentCreated', { detail: document }));
      
      // Process for RAG automatically
      try {
        await processDocumentForRAG(document.id, content, { skipEmbeddings: false });} catch (processingError) {
        console.warn(`[WARNING] Document created but processing failed:`, processingError);
      }
      
      return {
        type: 'create',
        success: true,
        message: `Successfully created ${type} document: "${title}"`,
        document
      };
      
    } catch (error) {
      console.error(`[ERROR] AI failed to create document:`, error);
      return {
        type: 'create',
        success: false,
        message: `Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Update an existing document
   */
  static async updateDocument(
    documentId: string,
    updates: {
      title?: string;
      content?: string;
      url?: string;
      tags?: string[];
    }
  ): Promise<AIFileOperation> {
    try {const existingDoc = await getDocument(documentId);
      if (!existingDoc) {
        return {
          type: 'update',
          success: false,
          message: `Document with ID ${documentId} not found`
        };
      }
      
      // Update the document
      await updateDocument(documentId, updates);
      
      // Notify Library component to refresh
      window.dispatchEvent(new CustomEvent('documentUpdated', { detail: { id: documentId, updates } }));
      
      // If content changed, reprocess for RAG
      if (updates.content && updates.content !== existingDoc.content) {
        try {
          await processDocumentForRAG(documentId, updates.content, { skipEmbeddings: false });} catch (processingError) {
          console.warn(`[WARNING] Document updated but reprocessing failed:`, processingError);
        }
      }
      
      const updatedDoc = await getDocument(documentId);
      
      return {
        type: 'update',
        success: true,
        message: `Successfully updated document: "${updatedDoc?.title || documentId}"`,
        document: updatedDoc
      };
      
    } catch (error) {
      console.error(`[ERROR] AI failed to update document:`, error);
      return {
        type: 'update',
        success: false,
        message: `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Delete a document from the Library
   */
  static async deleteDocument(documentId: string): Promise<AIFileOperation> {
    try {const existingDoc = await getDocument(documentId);
      if (!existingDoc) {
        return {
          type: 'delete',
          success: false,
          message: `Document with ID ${documentId} not found`
        };
      }
      
      // Delete the document (this also deletes all chunks)
      await deleteDocument(documentId);
      
      // Notify Library component to refresh
      window.dispatchEvent(new CustomEvent('documentDeleted', { detail: { id: documentId, title: existingDoc.title } }));
      
      return {
        type: 'delete',
        success: true,
        message: `Successfully deleted document: "${existingDoc.title}"`
      };
      
    } catch (error) {
      console.error(`[ERROR] AI failed to delete document:`, error);
      return {
        type: 'delete',
        success: false,
        message: `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * List all documents in the Library
   */
  static async listDocuments(): Promise<AIFileOperation> {
    try {const documents = await getAllDocuments();
      
      return {
        type: 'list',
        success: true,
        message: `Found ${documents.length} documents in Library`,
        documents
      };
      
    } catch (error) {
      console.error(`[ERROR] AI failed to list documents:`, error);
      return {
        type: 'list',
        success: false,
        message: `Failed to list documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Search for documents by title or content using semantic search
   */
  static async searchDocuments(query: string): Promise<AIFileOperation> {
    try {if (!query || query.trim() === '') {
        return {
          type: 'list',
          success: false,
          message: 'Search query cannot be empty'
        };
      }
      
      // Use semantic search for better results
      const { semanticSearch } = await import('./semanticSearch');
      const searchResults = await semanticSearch(query, 10);
      
      // Convert search results to documents format
      const documents = searchResults.map(result => ({
        id: result.documentId,
        title: result.documentTitle,
        content: result.chunk.text,
        type: result.documentType,
        url: result.documentUrl || '',
        similarity: result.similarityPercentage
      }));
      
      return {
        type: 'list',
        success: true,
        message: `Found ${documents.length} documents matching "${query}"`,
        documents: documents
      };
      
    } catch (error) {
      console.error(`[ERROR] AI failed to search documents:`, error);
      
      // Fallback to simple text search if semantic search fails
      try {
        const allDocuments = await getAllDocuments();
        const queryLower = query.toLowerCase();
        
        const matchingDocs = allDocuments.filter(doc => 
          doc.title.toLowerCase().includes(queryLower) ||
          doc.content.toLowerCase().includes(queryLower) ||
          doc.metadata?.tags?.some(tag => tag.toLowerCase().includes(queryLower))
        );
        
        return {
          type: 'list',
          success: true,
          message: `Found ${matchingDocs.length} documents matching "${query}" (fallback search)`,
          documents: matchingDocs
        };
      } catch (fallbackError) {
        return {
          type: 'list',
          success: false,
          message: `Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  }
  
  /**
   * Create a note with AI-generated content
   */
  static async createNote(
    title: string,
    content: string,
    tags?: string[]
  ): Promise<AIFileOperation> {
    return this.createDocument('note', title, content, undefined, tags);
  }
  
  /**
   * Create a URL bookmark
   */
  static async createUrlBookmark(
    title: string,
    url: string,
    description?: string,
    tags?: string[]
  ): Promise<AIFileOperation> {
    const content = description || `Bookmark for: ${title}\nURL: ${url}`;
    return this.createDocument('url', title, content, url, tags);
  }
  
  /**
   * Delete documents by title pattern
   */
  static async deleteDocumentsByTitle(titlePattern: string): Promise<AIFileOperation> {
    try {const allDocuments = await getAllDocuments();
      const patternLower = titlePattern.toLowerCase();
      
      const matchingDocs = allDocuments.filter(doc => 
        doc.title.toLowerCase().includes(patternLower)
      );
      
      if (matchingDocs.length === 0) {
        return {
          type: 'delete',
          success: true,
          message: `No documents found matching "${titlePattern}"`
        };
      }
      
      let deletedCount = 0;
      const errors: string[] = [];
      
      for (const doc of matchingDocs) {
        try {
          await deleteDocument(doc.id);
          deletedCount++;
        } catch (error) {
          errors.push(`Failed to delete "${doc.title}": ${error}`);
        }
      }
      
      const message = errors.length > 0 
        ? `Deleted ${deletedCount} documents. Errors: ${errors.join(', ')}`
        : `Successfully deleted ${deletedCount} documents matching "${titlePattern}"`;
      
      return {
        type: 'delete',
        success: errors.length === 0,
        message
      };
      
    } catch (error) {
      console.error(`[ERROR] AI failed to delete documents by title:`, error);
      return {
        type: 'delete',
        success: false,
        message: `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

/**
 * Parse AI file management commands from chat messages
 */
export function parseFileCommand(message: string): {
  command: string;
  params: Record<string, string>;
} | null {
  const lowerMessage = message.toLowerCase();
  
  // Create note commands - more flexible patterns
  if (lowerMessage.includes('create note') || 
      lowerMessage.includes('make note') || 
      lowerMessage.includes('add note') ||
      lowerMessage.includes('write note') ||
      lowerMessage.includes('new note') ||
      lowerMessage.includes('create a note') ||
      lowerMessage.includes('make a note') ||
      lowerMessage.includes('add a note') ||
      lowerMessage.includes('write a note') ||
      lowerMessage.includes('save note') ||
      lowerMessage.includes('save a note') ||
      lowerMessage.includes('note about') ||
      lowerMessage.includes('note on') ||
      lowerMessage.includes('note regarding') ||
      lowerMessage.includes('remember this') ||
      lowerMessage.includes('save this') ||
      lowerMessage.includes('keep this') ||
      lowerMessage.includes('jot down') ||
      lowerMessage.includes('write down')) {
    
    // Try to extract title and content with multiple patterns
    let title = 'AI Generated Note';
    let content = 'Note created by AI';
    
    // Pattern 1: "Create a note titled 'X' with content 'Y'"
    const titleMatch1 = message.match(/(?:title|named?|called?):\s*["']?([^"'\n]+)["']?/i);
    const contentMatch1 = message.match(/(?:content|text|says?|about):\s*["']?([^"'\n]+)["']?/i);
    
    // Pattern 2: "Create a note about X"
    const aboutMatch = message.match(/note\s+(?:about|on|regarding)\s+["']?([^"'\n]+)["']?/i);
    
    // Pattern 3: "Create a note called X"
    const calledMatch = message.match(/note\s+(?:called|named|titled)\s+["']?([^"'\n]+)["']?/i);
    
    if (titleMatch1) title = titleMatch1[1].trim();
    if (contentMatch1) content = contentMatch1[1].trim();
    if (aboutMatch) {
      title = `Note about ${aboutMatch[1].trim()}`;
      content = aboutMatch[1].trim();
    }
    if (calledMatch) title = calledMatch[1].trim();
    
    // If no specific content found, use the rest of the message as content
    if (content === 'Note created by AI' && !contentMatch1) {
      const words = message.split(' ');
      const noteIndex = words.findIndex(w => w.toLowerCase() === 'note');
      if (noteIndex !== -1) {
        content = words.slice(noteIndex + 1).join(' ').trim();
        if (content.length > 0) {
          title = content.length > 30 ? content.substring(0, 30) + '...' : content;
        }
      }
    }
    
    // Clean up content - remove common filler words
    if (content.includes('about') && content.length < 20) {
      content = content.replace(/about\s+/i, '').trim();
    }
    
    // If content is still too short, use the whole message as context
    if (content.length < 10) {
      content = message;
      title = message.length > 30 ? message.substring(0, 30) + '...' : message;
    }
    
    return {
      command: 'create_note',
      params: {
        title,
        content
      }
    };
  }
  
  // Create URL bookmark commands
  if (lowerMessage.includes('bookmark') || 
      lowerMessage.includes('save url') ||
      lowerMessage.includes('add url')) {
    const urlMatch = message.match(/(?:https?:\/\/[^\s]+)/i);
    const titleMatch = message.match(/(?:title|named?):\s*["']?([^"'\n]+)["']?/i);
    
    return {
      command: 'create_bookmark',
      params: {
        url: urlMatch?.[0] || '',
        title: titleMatch?.[1]?.trim() || 'Bookmark'
      }
    };
  }
  
  // Delete commands
  if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
    const titleMatch = message.match(/(?:title|named?):\s*["']?([^"'\n]+)["']?/i);
    const idMatch = message.match(/id:\s*([a-f0-9-]+)/i);
    
    return {
      command: 'delete',
      params: {
        title: titleMatch?.[1]?.trim() || '',
        id: idMatch?.[1]?.trim() || ''
      }
    };
  }
  
  // List commands
  if (lowerMessage.includes('list') || 
      lowerMessage.includes('show') || 
      lowerMessage.includes('all documents') ||
      lowerMessage.includes('all notes')) {
    return {
      command: 'list',
      params: {}
    };
  }
  
  // Search commands
  if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
    // Try multiple patterns to extract the search query
    let query = '';
    
    // Pattern 1: "search for X" or "find X"
    const searchForMatch = message.match(/(?:search|find)\s+(?:for\s+)?["']?([^"'\n]+)["']?/i);
    if (searchForMatch) {
      query = searchForMatch[1].trim();
    }
    
    // Pattern 2: "query: X" (explicit format)
    if (!query) {
      const queryMatch = message.match(/(?:for|query):\s*["']?([^"'\n]+)["']?/i);
      if (queryMatch) {
        query = queryMatch[1].trim();
      }
    }
    
    // Pattern 3: "about X" or "containing X"
    if (!query) {
      const aboutMatch = message.match(/(?:about|containing|with)\s+["']?([^"'\n]+)["']?/i);
      if (aboutMatch) {
        query = aboutMatch[1].trim();
      }
    }
    
    // Pattern 4: Extract from "all my notes about X" or "all documents about X"
    if (!query) {
      const allNotesMatch = message.match(/(?:all\s+)?(?:my\s+)?(?:notes?|documents?)\s+(?:about|containing|with)\s+["']?([^"'\n]+)["']?/i);
      if (allNotesMatch) {
        query = allNotesMatch[1].trim();
      }
    }
    
    return {
      command: 'search',
      params: {
        query: query || ''
      }
    };
  }
  
  return null;
}
