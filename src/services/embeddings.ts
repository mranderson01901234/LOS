import { pipeline, env } from '@xenova/transformers';

// Configure to run in browser
env.allowLocalModels = false;
env.allowRemoteModels = true;

let embedder: any = null;

// Initialize embedding model (do this once)
export async function initEmbeddings() {
  if (embedder) return embedder;
try {
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );return embedder;
  } catch (error) {
    console.error('[ERROR] Failed to load embedding model:', error);
    throw error;
  }
}

// Generate embedding for a single text
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = await initEmbeddings();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('[ERROR] Failed to generate embedding:', error);
    throw error;
  }
}

// Generate embeddings for multiple texts (batch processing)
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await generateEmbedding(texts[i]);
      embeddings.push(embedding);
      
      if ((i + 1) % 5 === 0) {}
    } catch (error) {
      console.error(`[ERROR] Failed to generate embedding for text ${i + 1}:`, error);
      throw error;
    }
  }return embeddings;
}

// Cosine similarity between two embeddings
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embeddings must have same length: ${a.length} vs ${b.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

// Calculate similarity score as percentage
export function similarityPercentage(similarity: number): number {
  return Math.round(similarity * 100);
}

// Text chunking utilities
export interface ChunkingOptions {
  maxChunkSize?: number;
  overlap?: number;
  splitBySentence?: boolean;
}

export function chunkText(text: string, options: ChunkingOptions = {}): string[] {
  const {
    maxChunkSize = 500,
    overlap = 50,
    splitBySentence = true
  } = options;

  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChunkSize;
    
    if (end >= text.length) {
      // Last chunk
      chunks.push(text.slice(start));
      break;
    }

    if (splitBySentence) {
      // Try to split at sentence boundary
      const chunk = text.slice(start, end);
      const lastSentenceEnd = Math.max(
        chunk.lastIndexOf('.'),
        chunk.lastIndexOf('!'),
        chunk.lastIndexOf('?')
      );
      
      if (lastSentenceEnd > maxChunkSize * 0.5) {
        // Split at sentence if it's not too far back
        end = start + lastSentenceEnd + 1;
      } else {
        // Split at word boundary
        const lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace > maxChunkSize * 0.7) {
          end = start + lastSpace;
        }
      }
    } else {
      // Split at word boundary
      const chunk = text.slice(start, end);
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > maxChunkSize * 0.7) {
        end = start + lastSpace;
      }
    }

    chunks.push(text.slice(start, end).trim());
    
    // Move start position with overlap
    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks.filter(chunk => chunk.length > 0);
}
