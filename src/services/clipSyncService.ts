import { initDB, saveDocument } from './db';
import { processDocumentForRAG } from './documentProcessor';
import type { Document } from '../types/database';

interface ClipData {
  id: number;
  type: string;
  title: string;
  url?: string;
  content?: string;
  image_url?: string;
  description?: string;
  author?: string;
  timestamp: number;
  created_at: string;
}

export class ClipSyncService {
  private static instance: ClipSyncService;
  private indexedDb: any = null;
  private isInitialized = false;
  private syncInterval: NodeJS.Timeout | null = null;

  static getInstance(): ClipSyncService {
    if (!ClipSyncService.instance) {
      ClipSyncService.instance = new ClipSyncService();
    }
    return ClipSyncService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize IndexedDB
      this.indexedDb = await initDB();
      
      this.isInitialized = true;// Sync existing clips using Tauri command
      await this.syncAllClips();
      
      // Reprocess any clips that don't have embeddings
      await this.reprocessClipsWithoutEmbeddings();
      
    } catch (error) {
      console.error('[ERROR] Failed to initialize ClipSyncService:', error);
      throw error;
    }
  }

  async syncAllClips(): Promise<void> {
    if (!this.indexedDb) {
      console.warn('[WARNING] ClipSyncService not initialized');
      return;
    }

    try {// Use Tauri command to get clips from SQLite
      const clips = await this.getClipsFromSQLite();let syncedCount = 0;
      for (const clip of clips) {
        try {
          await this.syncClipToIndexedDB(clip);
          syncedCount++;
        } catch (error) {
          console.error(`[ERROR] Failed to sync clip ${clip.id}:`, error);
        }
      }} catch (error) {
      console.error('[ERROR] Failed to sync clips:', error);
    }
  }

  async syncNewClipsOnly(): Promise<void> {
    if (!this.indexedDb) {
      console.warn('[WARNING] ClipSyncService not initialized');
      return;
    }

    try {
      // Get clips from SQLite
      const clips = await this.getClipsFromSQLite();
      
      // Get existing synced clips from IndexedDB
      const existingDocs = await this.indexedDb.getAll('documents');
      const syncedClipTitles = new Set(
        existingDocs
          .filter((doc: Document) => doc.tags?.includes('clipped'))
          .map((doc: Document) => doc.title)
      );
      
      // Filter for new clips only (by title and URL)
      const newClips = clips.filter(clip => {
        const existingClip = existingDocs.find((doc: Document) => 
          doc.tags?.includes('clipped') && 
          doc.title === clip.title &&
          doc.url === clip.url
        );
        return !existingClip;
      });
      
      if (newClips.length > 0) {let syncedCount = 0;
        for (const clip of newClips) {
          try {
            await this.syncClipToIndexedDB(clip);
            syncedCount++;
          } catch (error) {
            console.error(`[ERROR] Failed to sync new clip ${clip.id}:`, error);
          }
        }}
      
    } catch (error) {
      console.error('[ERROR] Failed to sync new clips:', error);
    }
  }

  private async getClipsFromSQLite(): Promise<ClipData[]> {
    // Check if we're running in a Tauri environment
    const isTauriEnv = typeof window !== 'undefined' && window.__TAURI__;
    
    if (isTauriEnv) {
      try {
        // Try to use Tauri command to read SQLite data
        const tauriApi = await import('@tauri-apps/api/core');
        if (tauriApi && tauriApi.invoke) {
          const clips = await tauriApi.invoke('get_all_clips') as ClipData[];
          return clips || [];
        } else {
          throw new Error('Tauri invoke not available');
        }
      } catch (error) {
        console.warn('[WARNING] Failed to get clips from SQLite via Tauri, trying fallback method:', error);
      }
    } else {}
    
    // Fallback: try to read from a JSON file if available
    try {
      const response = await fetch('/clips.json');
      if (response.ok) {
        const clips = await response.json();return clips || [];
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (fetchError) {
      console.warn('[WARNING] Fallback method also failed:', fetchError);
    }
    
    return [];
  }

  private async syncClipToIndexedDB(clip: ClipData): Promise<void> {
    try {
      // Check if clip already exists in IndexedDB
      const existingDocs = await this.indexedDb.getAll('documents');
      const existingClip = existingDocs.find((doc: Document) => 
        doc.tags?.includes('clipped') && 
        doc.title === clip.title &&
        doc.url === clip.url
      );

      if (existingClip) {return;
      }

      // Convert SQLite clip to IndexedDB document
      const document: Document = {
        id: `clip_${clip.id}_${Date.now()}`,
        type: clip.type === 'image' ? 'url' : (clip.type === 'note' ? 'note' : 'url'),
        title: clip.title,
        content: clip.content || clip.image_url || '',
        url: clip.url || undefined,
        date_added: new Date(clip.timestamp).toISOString(),
        interest_category: 'web-clip',
        tags: ['clipped', 'browser-extension', clip.type],
        isProcessed: false
      };

      // Save to IndexedDB
      await this.indexedDb.put('documents', document);// Process for RAG if has content
      if (clip.content && clip.content.length > 0) {try {
          await processDocumentForRAG(document.id, clip.content, { skipEmbeddings: false });
        } catch (error) {
          console.warn(`[WARNING] RAG processing failed for clip ${clip.title}:`, error);
        }
      }

    } catch (error) {
      console.error(`[ERROR] Failed to sync clip ${clip.id}:`, error);
      throw error;
    }
  }

  async watchForNewClips(): Promise<void> {// Watch for new clips only (not existing ones)
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncNewClipsOnly();
      } catch (error) {
        console.error('[ERROR] Error during new clip sync:', error);
      }
    }, 5000); // Check every 5 seconds for new clips
  }

  stopWatching(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;}
  }

  async reprocessClipsWithoutEmbeddings(): Promise<void> {
    if (!this.indexedDb) {
      console.warn('[WARNING] ClipSyncService not initialized');
      return;
    }

    try {// Get all documents with 'clipped' tag
      const allDocs = await this.indexedDb.getAll('documents');
      const clippedDocs = allDocs.filter((doc: Document) => 
        doc.tags?.includes('clipped')
      );let reprocessedCount = 0;
      
      for (const doc of clippedDocs) {
        try {
          // Check if document has chunks with embeddings
          const chunks = await this.indexedDb.getAllFromIndex('documentChunks', 'documentId', doc.id);
          const hasEmbeddings = chunks.some((c: any) => 
            Array.isArray(c.embedding) && c.embedding.length > 0
          );
          
          if (!hasEmbeddings && doc.content && doc.content.length > 0) {// Delete existing chunks without embeddings
            for (const chunk of chunks) {
              if (chunk.id) {
                await this.indexedDb.delete('documentChunks', chunk.id);
              }
            }
            
            // Reprocess with embeddings
            await processDocumentForRAG(doc.id, doc.content, { skipEmbeddings: false });
            reprocessedCount++;}
          
        } catch (error) {
          console.error(`[ERROR] Failed to reprocess clip "${doc.title}":`, error);
        }
      }} catch (error) {
      console.error('[ERROR] Clip reprocessing failed:', error);
    }
  }

  async getClipStats(): Promise<{ sqliteCount: number; indexedDBCount: number }> {
    try {
      const sqliteClips = await this.getClipsFromSQLite();
      const indexedDBDocs = await this.indexedDb.getAll('documents');
      const clippedDocs = indexedDBDocs.filter((doc: Document) => 
        doc.tags?.includes('clipped')
      );

      return {
        sqliteCount: sqliteClips.length,
        indexedDBCount: clippedDocs.length
      };
    } catch (error) {
      console.error('[ERROR] Failed to get clip stats:', error);
      return { sqliteCount: 0, indexedDBCount: 0 };
    }
  }
}

// Export singleton instance
export const clipSyncService = ClipSyncService.getInstance();