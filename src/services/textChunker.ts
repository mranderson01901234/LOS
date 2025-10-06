/**
 * Text Chunking Service
 * 
 * Splits text into chunks for embedding and semantic search
 */

export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  if (!text || text.length === 0) {
    return chunks;
  }

  // If text is smaller than chunk size, return as single chunk
  if (text.length <= chunkSize) {
    return [{
      text: text,
      startIndex: 0,
      endIndex: text.length
    }];
  }

  let currentPosition = 0;

  while (currentPosition < text.length) {
    const endPosition = Math.min(currentPosition + chunkSize, text.length);
    const chunkText = text.substring(currentPosition, endPosition);

    chunks.push({
      text: chunkText,
      startIndex: currentPosition,
      endIndex: endPosition
    });

    // Move position forward, accounting for overlap
    currentPosition += chunkSize - overlap;

    // If we're near the end and would create a very small chunk, extend the last chunk instead
    if (currentPosition + chunkSize / 2 >= text.length && currentPosition < text.length) {
      const finalChunkText = text.substring(currentPosition);
      if (finalChunkText.trim().length > 0) {
        chunks.push({
          text: finalChunkText,
          startIndex: currentPosition,
          endIndex: text.length
        });
      }
      break;
    }
  }

  return chunks;
}

/**
 * Split text by paragraphs (better for maintaining context)
 */
export function chunkByParagraphs(text: string, maxChunkSize: number = 800): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  if (!text || text.length === 0) {
    return chunks;
  }

  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  let currentStartIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    if (!paragraph) continue;

    // If adding this paragraph would exceed max chunk size, save current chunk
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      const endIndex = currentStartIndex + currentChunk.length;
      chunks.push({
        text: currentChunk.trim(),
        startIndex: currentStartIndex,
        endIndex: endIndex
      });
      
      currentStartIndex = endIndex;
      currentChunk = '';
    }

    currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
  }

  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      startIndex: currentStartIndex,
      endIndex: currentStartIndex + currentChunk.length
    });
  }

  return chunks;
}

/**
 * Get optimal chunk size based on text length
 */
export function getOptimalChunkSize(textLength: number): { chunkSize: number; overlap: number } {
  if (textLength < 1000) {
    return { chunkSize: 300, overlap: 50 };
  } else if (textLength < 5000) {
    return { chunkSize: 500, overlap: 100 };
  } else if (textLength < 20000) {
    return { chunkSize: 800, overlap: 150 };
  } else {
    return { chunkSize: 1000, overlap: 200 };
  }
}