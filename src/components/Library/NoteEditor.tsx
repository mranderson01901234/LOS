import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FileText, X } from 'lucide-react';
import { saveAndProcessDocument } from '@/services/documentProcessor';
import type { Document } from '@/types/database';

export function NoteEditor({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !content) return;

    setIsLoading(true);

    try {
      const doc: Document = {
        id: uuidv4(),
        type: 'note',
        title: title,
        content: content,
        date_added: new Date().toISOString(),
        tags: [],
      };

      // Save and process document for RAG automatically (full mode with embeddings)
      await saveAndProcessDocument(doc);
      
      setTitle('');
      setContent('');
      onSuccess();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            New Note
          </h2>
          <button 
            onClick={() => onSuccess()}
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            required
            className="w-full px-3 py-2 bg-bg-elevated border border-border-primary rounded-md text-text-primary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus mb-4"
          />
          
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here..."
            rows={10}
            required
            className="w-full px-3 py-2 bg-bg-elevated border border-border-primary rounded-md text-text-primary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus resize-none"
          />
          
          <div className="flex gap-2 mt-4">
            <button 
              type="submit" 
              disabled={isLoading || !title || !content}
              className="flex-1 bg-accent-white text-bg-primary px-4 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Note'}
            </button>
            <button 
              type="button"
              onClick={() => onSuccess()}
              className="px-4 py-2 bg-bg-elevated text-text-primary rounded-md hover:bg-bg-hover border border-border-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
