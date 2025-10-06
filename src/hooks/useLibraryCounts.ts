import { useState, useEffect } from 'react';
import { getAllDocuments } from '@/services/db';

export interface LibraryCounts {
  all: number;
  articles: number;
  pdfs: number;
  notes: number;
  images: number;
  audio: number;
}

export function useLibraryCounts(): LibraryCounts {
  const [counts, setCounts] = useState<LibraryCounts>({
    all: 0,
    articles: 0,
    pdfs: 0,
    notes: 0,
    images: 0,
    audio: 0
  });

  useEffect(() => {
    async function fetchCounts() {
      try {
        const documents = await getAllDocuments();
        const counts: LibraryCounts = {
          all: documents.length,
          articles: documents.filter(d => d.type === 'url').length,
          pdfs: documents.filter(d => d.type === 'file' && d.title?.toLowerCase().includes('.pdf')).length,
          notes: documents.filter(d => d.type === 'note').length,
          images: documents.filter(d => d.type === 'file' && /\.(jpg|jpeg|png|gif|webp)$/i.test(d.title || '')).length,
          audio: documents.filter(d => d.type === 'file' && /\.(mp3|wav|ogg|m4a)$/i.test(d.title || '')).length
        };
        setCounts(counts);
      } catch (error) {
        console.error('Failed to fetch library counts:', error);
      }
    }

    fetchCounts();
  }, []);

  return counts;
}
