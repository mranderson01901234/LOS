import { listen } from '@tauri-apps/api/event';
import { saveDocument } from './db';
import { processDocumentForRAG } from './documentProcessor';
import type { Document } from '../types/database';

interface ClipData {
  type: 'article' | 'image' | 'url' | 'note';
  title: string;
  url?: string;
  content?: string;
  image_url?: string;
  description?: string;
  author?: string;
  timestamp: number;
}

export async function initializeClipHandler() {// Listen for clips from browser extension
  await listen('new-clip', async (event) => {
    const clip = event.payload as ClipData;
try {
      // Save to database based on type
      let docId: string;
      
      switch (clip.type) {
        case 'article':
        case 'url':
          const articleDoc: Document = {
            id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'url',
            title: clip.title,
            content: clip.content || '',
            url: clip.url,
            date_added: new Date(clip.timestamp).toISOString(),
            interest_category: 'web-clip',
            tags: ['clipped', 'browser-extension'],
            isProcessed: false
          };
          
          await saveDocument(articleDoc);
          docId = articleDoc.id;
          
          // Process for RAG if has content
          if (clip.content && clip.content.length > 0) {await processDocumentForRAG(docId, clip.content, { skipEmbeddings: true });
          }
          break;
          
        case 'image':
          // For images, we'll save the URL and metadata
          const imageDoc: Document = {
            id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'url',
            title: clip.title,
            content: clip.image_url || '',
            url: clip.url,
            date_added: new Date(clip.timestamp).toISOString(),
            interest_category: 'web-clip',
            tags: ['clipped', 'image', 'browser-extension'],
            isProcessed: false
          };
          
          await saveDocument(imageDoc);
          docId = imageDoc.id;
          break;
          
        case 'note':
          const noteDoc: Document = {
            id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'note',
            title: clip.title,
            content: clip.content || '',
            date_added: new Date(clip.timestamp).toISOString(),
            interest_category: 'web-clip',
            tags: ['clipped', 'note', 'browser-extension'],
            isProcessed: false
          };
          
          await saveDocument(noteDoc);
          docId = noteDoc.id;
          
          if (clip.content && clip.content.length > 0) {await processDocumentForRAG(docId, clip.content, { skipEmbeddings: true });
          }
          break;
          
        default:
          throw new Error(`Unknown clip type: ${clip.type}`);
      }// Show notification
      showNotification('Saved to LOS', clip.title);
      
      // Dispatch custom event for UI updates
      window.dispatchEvent(new CustomEvent('los-clip-saved', {
        detail: { docId, clip }
      }));
      
    } catch (error) {
      console.error('[ERROR] Failed to save clip:', error);
      showNotification('Save failed', 'Could not save content to LOS');
    }
  });}

function showNotification(title: string, body: string) {
  // Try to show browser notification
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { 
        body,
        icon: '/tauri.svg'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { 
            body,
            icon: '/tauri.svg'
          });
        }
      });
    }
  }
  
  // Also show in-app notification (if we have a notification system)
}

// Export for manual testing
export { ClipData };
