import { saveDocumentChunks, getDocument, saveDocument, getChunksByDocument, deleteDocumentChunk, updateDocument } from './db';
import { chunkText } from './embeddings';
import { generateEmbedding } from './embeddings';
import { GrowthService } from './growthService';
import type { Document, DocumentChunk } from '../types/database';

export interface ProcessingProgress {
  documentId: string;
  progress: number; // 0-1
  chunksProcessed: number;
  totalChunks: number;
}

export interface ProcessingOptions {
  maxChunkSize?: number;
  overlap?: number;
  splitBySentence?: boolean;
  skipEmbeddings?: boolean; // Fast mode - skip embedding generation
}

/**
 * Process a document for RAG by chunking and generating embeddings
 */
export async function processDocumentForRAG(
  documentId: string,
  content: string,
  options: ProcessingOptions = {}
): Promise<void> {
  const {
    maxChunkSize = 500,
    overlap = 50,
    splitBySentence = true,
    skipEmbeddings = false
  } = options;

  try {// 1. Get document metadata
    const doc = await getDocument(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    // 2. Chunk the content...`);
    const chunks = await chunkText(content, {
      maxChunkSize,
      overlap,
      splitBySentence
    });// 3. Process chunks (with or without embeddings)
    const chunkRecords: DocumentChunk[] = [];
    
    if (skipEmbeddings) {// Fast mode: create chunks without embeddings
      for (let i = 0; i < chunks.length; i++) {
        chunkRecords.push({
          id: `chunk_${documentId}_${i}_${Date.now()}`,
          documentId,
          documentTitle: doc.title,
          chunkIndex: i,
          text: chunks[i],
          embedding: [], // Empty embedding array
          createdAt: Date.now()
        });

        // Progress callback
        if (window.onProcessingProgress) {
          window.onProcessingProgress({
            documentId,
            progress: (i + 1) / chunks.length,
            chunksProcessed: i + 1,
            totalChunks: chunks.length
          });
        }
      }
    } else {// Full mode: generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {const embedding = await generateEmbedding(chunks[i]);
        
        chunkRecords.push({
          id: `chunk_${documentId}_${i}_${Date.now()}`,
          documentId,
          documentTitle: doc.title,
          chunkIndex: i,
          text: chunks[i],
          embedding,
          createdAt: Date.now()
        });

        // Progress callback
        if (window.onProcessingProgress) {
          window.onProcessingProgress({
            documentId,
            progress: (i + 1) / chunks.length,
            chunksProcessed: i + 1,
            totalChunks: chunks.length
          });
        }
      }
    }

    // 4. Store chunks in IndexedDBawait saveDocumentChunks(chunkRecords);

    // 5. Mark document as processed
    await updateDocument(documentId, {
      isProcessed: true,
      processedAt: Date.now(),
      chunkCount: chunks.length
    });} catch (error) {
    console.error('[ERROR] Document processing failed:', error);
    
    // Mark as failed
    await updateDocument(documentId, {
      isProcessed: false,
      processingError: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}

/**
 * Save document and automatically process it for RAG (fast mode)
 */
export async function saveAndProcessDocumentFast(doc: Document): Promise<string> {
  try {
    // 1. Save document first
    await saveDocument(doc);
    
    // 2. Process in background with fast mode (no embeddings)
    processDocumentForRAG(doc.id, doc.content, { skipEmbeddings: true }).catch(err => {
      console.error('[ERROR] Background processing failed:', err);
    });
    
    return doc.id;
  } catch (error) {
    console.error('[ERROR] Error saving and processing document:', error);
    throw error;
  }
}

/**
 * Save document and automatically process it for RAG (full mode with embeddings)
 */
export async function saveAndProcessDocument(doc: Document): Promise<string> {
  try {
    // 1. Save document first
    await saveDocument(doc);
    
    // 2. Track document for growth
    await GrowthService.trackDocument();
    
    // 3. Process in background (don't block UI)
    processDocumentForRAG(doc.id, doc.content).catch(err => {
      console.error('[ERROR] Background processing failed:', err);
    });
    
    return doc.id;
  } catch (error) {
    console.error('[ERROR] Error saving and processing document:', error);
    throw error;
  }
}

/**
 * Reprocess a document (useful for retry after failure)
 */
export async function reprocessDocument(documentId: string): Promise<void> {
  try {
    const doc = await getDocument(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    // Clear existing chunks
    const existingChunks = await getChunksByDocument(documentId);
    for (const chunk of existingChunks) {
      await deleteDocumentChunk(chunk.id!);
    }

    // Process again
    await processDocumentForRAG(documentId, doc.content);} catch (error) {
    console.error('[ERROR] Error reprocessing document:', error);
    throw error;
  }
}

/**
 * Get processing status for a document
 */
export async function getDocumentProcessingStatus(documentId: string): Promise<{
  isProcessed: boolean;
  processedAt?: number;
  chunkCount?: number;
  processingError?: string;
}> {
  try {
    const doc = await getDocument(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    return {
      isProcessed: doc.isProcessed || false,
      processedAt: doc.processedAt,
      chunkCount: doc.chunkCount,
      processingError: doc.processingError
    };
  } catch (error) {
    console.error('[ERROR] Error getting processing status:', error);
    return {
      isProcessed: false,
      processingError: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Automatically reprocess all file documents that don't have embeddings
 */
export async function reprocessAllFileDocuments(): Promise<void> {
  try {const { getAllDocuments, getChunksByDocument, deleteDocumentChunk } = await import('./db');
    
    // Get all file documents
    const documents = await getAllDocuments();
    const fileDocs = documents.filter(doc => doc.type === 'file');if (fileDocs.length === 0) {return;
    }
    
    let processedCount = 0;
    
    for (const doc of fileDocs) {
      try {
        // Check if document has chunks with embeddings
        const chunks = await getChunksByDocument(doc.id);
        const hasEmbeddings = chunks.some(c => 
          Array.isArray(c.embedding) && c.embedding.length > 0
        );
        
        if (!hasEmbeddings) {// Delete existing chunks without embeddings
          for (const chunk of chunks) {
            if (chunk.id) {
              await deleteDocumentChunk(chunk.id);
            }
          }
          
          // Reprocess with embeddings
          await processDocumentForRAG(doc.id, doc.content);
          processedCount++;}
        
      } catch (error) {
        console.error(`[ERROR] Failed to reprocess "${doc.title}":`, error);
      }
    }} catch (error) {
    console.error('[ERROR] File reprocessing failed:', error);
  }
}

// Global progress callback type
declare global {
  interface Window {
    onProcessingProgress?: (progress: ProcessingProgress) => void;
  }
}