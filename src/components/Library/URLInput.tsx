import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Link as LinkIcon, X } from 'lucide-react';
import { saveAndProcessDocument } from '@/services/documentProcessor';
import type { Document } from '@/types/database';

export function URLInput({ onSuccess }: { onSuccess: (docId?: string) => void }) {
  const [url, setUrl] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useManualContent, setUseManualContent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError('');

    try {
      let content = '';
      let title = '';
      
      // If manual content is provided, use it
      if (useManualContent && manualContent.trim()) {
        content = manualContent.trim();
        title = content.split('\n')[0]?.trim() || new URL(url).hostname;
      } else {
        // Try Jina AI Reader first
        try {
          const jinaUrl = `https://r.jina.ai/${url}`;
          const response = await fetch(jinaUrl);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          content = await response.text();
          
          // Extract title from content (first line or URL)
          const lines = content.split('\n');
          title = lines[0]?.trim() || new URL(url).hostname;
          
        } catch (jinaError) {
          console.warn('Jina AI Reader failed:', jinaError);
          
          // Fallback: Create a basic document with URL info
          title = new URL(url).hostname;
          content = `URL: ${url}\n\nThis URL could not be automatically processed due to access restrictions (captcha, rate limiting, or other protection mechanisms).\n\nYou can manually add content by copying and pasting the article text into a note instead.`;
          
          // Show warning but don't fail completely
          setError('Could not automatically extract content (captcha/protection detected). A placeholder document was created instead. You can manually add content by creating a note.');
        }
      }

      // Create document
      const doc: Document = {
        id: uuidv4(),
        type: 'url',
        title: title.substring(0, 200),
        content: content,
        url: url,
        date_added: new Date().toISOString(),
        tags: [],
      };

      const docId = await saveAndProcessDocument(doc);
      
      setUrl('');
      setManualContent('');
      setUseManualContent(false);
      onSuccess(docId);
    } catch (err) {
      setError('Failed to process URL. Please check the URL is valid and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 text-text-primary flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Add URL
          </h2>
          <button 
            onClick={() => onSuccess()}
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-body text-text-secondary mb-4">
          Paste a URL to extract and save its content. Some websites may have protection that prevents automatic extraction.
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            disabled={isLoading}
            required
            className="w-full px-3 py-2 bg-bg-elevated border border-border-primary rounded-md text-text-primary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus mb-4"
          />
          
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
              <input
                type="checkbox"
                checked={useManualContent}
                onChange={(e) => setUseManualContent(e.target.checked)}
                className="rounded border-border-primary bg-bg-elevated text-accent-white focus:ring-border-focus"
              />
              Add content manually (if automatic extraction fails)
            </label>
            
            {useManualContent && (
              <textarea
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="Paste the article content here..."
                rows={6}
                className="w-full px-3 py-2 bg-bg-elevated border border-border-primary rounded-md text-text-primary placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus resize-none"
              />
            )}
          </div>
          
          {error && (
            <div className="text-yellow-400 text-sm mb-4 p-3 bg-yellow-900 bg-opacity-20 rounded border border-yellow-800">
              <div className="font-medium mb-1">[WARNING] Content Extraction Issue</div>
              <div>{error}</div>
              <div className="mt-2 text-xs text-yellow-300">
                💡 Tip: You can manually copy the article content and create a note instead.
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <button 
              type="submit" 
              disabled={isLoading || !url || (useManualContent && !manualContent)}
              className="flex-1 bg-accent-white text-bg-primary px-4 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : 'Add URL'}
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
