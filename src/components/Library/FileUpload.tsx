import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Upload, X, FileText } from 'lucide-react';
import { extractTextFromPDF } from '@/services/pdfExtractor';
import { saveAndProcessDocument } from '@/services/documentProcessor';
import type { Document } from '@/types/database';

export function FileUpload({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  async function handleFileSelect(file: File) {
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      let content = '';
      
      // Handle different file types
      if (file.type === 'application/pdf') {
        content = await extractTextFromPDF(file);
      } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
        content = await file.text();
      } else {
        throw new Error('Unsupported file type. Please upload PDF, TXT, or MD files.');
      }

      const doc: Document = {
        id: uuidv4(),
        type: 'file',
        title: file.name,
        content: content,
        date_added: new Date().toISOString(),
        tags: [],
      };

      // Save and process document for RAG automatically (full mode with embeddings)
      await saveAndProcessDocument(doc);
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave() {
    setDragActive(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 text-text-primary flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload File
          </h2>
          <button 
            onClick={() => onSuccess()}
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-body text-text-secondary mb-4">
          Upload PDF, TXT, or MD files
        </p>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-accent-white bg-accent-white bg-opacity-10' 
              : 'border-border-primary hover:border-accent-white'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-primary mb-2">Drop your file here</p>
          <p className="text-text-secondary text-sm mb-4">or</p>
          
          <input
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileInput}
            disabled={isLoading}
            className="hidden"
            id="file-upload"
          />
          
          <label 
            htmlFor="file-upload"
            className="bg-accent-white text-bg-primary px-4 py-2 rounded-md hover:bg-gray-200 cursor-pointer disabled:opacity-50 transition-colors"
          >
            Choose File
          </label>
        </div>
        
        {error && (
          <div className="text-red-400 text-sm mt-4 p-2 bg-red-900 bg-opacity-20 rounded border border-red-800">
            {error}
          </div>
        )}
        
        {isLoading && (
          <div className="text-text-primary text-sm mt-4 p-2 bg-bg-elevated rounded border border-border-primary">
            Processing file...
          </div>
        )}
        
        <div className="flex justify-end mt-4">
          <button 
            onClick={() => onSuccess()}
            className="px-4 py-2 bg-bg-elevated text-text-primary rounded-md hover:bg-bg-hover border border-border-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
