import { Link as LinkIcon, FileText, Trash2, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import type { Document } from '@/types/database';
import { deleteDocument } from '@/services/db';
import type { ProcessingProgress } from '@/services/documentProcessor';

export function DocumentCard({ 
  document, 
  onDelete, 
  isProcessing = false, 
  processingProgress 
}: { 
  document: Document; 
  onDelete: () => void;
  isProcessing?: boolean;
  processingProgress?: ProcessingProgress;
}) {
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(document.id);
      onDelete();
    }
  };

  const getProcessingStatus = () => {
    if (isProcessing) {
      return {
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: processingProgress 
          ? `Processing... ${Math.round(processingProgress.progress * 100)}%`
          : 'Processing...',
        color: 'text-blue-400'
      };
    }
    
    if (document.isProcessed) {
      return {
        icon: <CheckCircle className="w-3 h-3" />,
        text: `Searchable (${document.chunkCount || 0} chunks)`,
        color: 'text-green-400'
      };
    }
    
    if (document.processingError) {
      return {
        icon: <AlertCircle className="w-3 h-3" />,
        text: 'Processing failed',
        color: 'text-red-400'
      };
    }
    
    return {
      icon: <Clock className="w-3 h-3" />,
      text: 'Not processed',
      color: 'text-yellow-400'
    };
  };

  const status = getProcessingStatus();

  return (
    <div className="bg-bg-secondary rounded-lg p-4 hover:bg-bg-hover transition-colors border border-border-primary">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-accent-white">
            {document.type === 'url' && <LinkIcon className="w-5 h-5" />}
            {document.type === 'file' && <FileText className="w-5 h-5" />}
            {document.type === 'note' && <FileText className="w-5 h-5" />}
          </div>
          <span className="text-xs text-text-secondary uppercase tracking-wide">
            {document.type}
          </span>
        </div>
        <button 
          onClick={handleDelete}
          className="text-text-secondary hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-text-primary font-medium line-clamp-2">
          {document.title}
        </h3>
        
        <p className="text-text-secondary text-sm line-clamp-3">
          {document.content.substring(0, 150)}
          {document.content.length > 150 && '...'}
        </p>
        
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>
            {new Date(document.date_added).toLocaleDateString()}
          </span>
          {document.url && (
            <a 
              href={document.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent-white hover:text-gray-300 transition-colors"
            >
              View Original
            </a>
          )}
        </div>
        
        {/* Processing Status */}
        <div className="flex items-center gap-2 text-xs">
          <div className={`flex items-center gap-1 ${status.color}`}>
            {status.icon}
            <span>{status.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
