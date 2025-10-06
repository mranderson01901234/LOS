/**
 * Semantic Search Service
 * 
 * Provides semantic search capabilities using embeddings and vector similarity
 */

import { getAllDocuments, getAllDocumentChunks } from './db';
import { generateEmbedding, cosineSimilarity, similarityPercentage } from './embeddings';

export interface SearchResult {
  chunk: any;
  documentId: string;
  documentTitle: string;
  documentType: string;
  score: number;
  similarityPercentage: number;
}

/**
 * Simple text-based search for fallback
 */
export async function simpleTextSearch(
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  try {
    const chunks = await getAllDocumentChunks();
    const queryWords = query.toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      const text = chunk.text.toLowerCase();
      let matches = 0;

      // Count how many query words are in the chunk
      for (const word of queryWords) {
        if (text.includes(word)) {
          matches++;
        }
      }

      // Calculate relevance score (0-1)
      const relevanceScore = Math.min(matches / Math.max(queryWords.length, 1), 1);

      // Debug: Log matches for each chunk
      if (matches > 0) {
        console.log(`Chunk ${chunk.id} matched ${matches} terms (${Math.round(relevanceScore * 100)}%)`);
      }

      // Only include results with some relevance
      if (relevanceScore > 0.05) {
        results.push({
          chunk: chunk,
          documentId: chunk.documentId,
          documentTitle: chunk.documentTitle,
          documentType: chunk.documentType || 'unknown',
          score: relevanceScore,
          similarityPercentage: Math.round(relevanceScore * 100),
        });
      }
    }

    // Sort by relevance and return top K
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);

    if (topResults.length > 0) {
      console.log(`Found ${topResults.length} relevant chunks for query: "${query}"`);
    }

    return topResults;
  } catch (error) {
    console.error('Simple text search failed:', error);
    throw error;
  }
}

/**
 * Semantic search using embeddings and vector similarity
 */
export async function semanticSearch(
  query: string,
  topK: number = 5,
  minSimilarity: number = 0.03
): Promise<SearchResult[]> {
  try {
    // Try semantic search first, fall back to simple search if embeddings fail
    try {
      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(query);
      
      // Get all document chunks
      const allChunks = await getAllDocumentChunks();
      
      if (allChunks.length === 0) {
        console.warn('No document chunks found');
        return [];
      }

      // Enhanced query expansion for better matching
      const expandedQueries = expandQuery(query);
      
      // Calculate similarity for all chunks with multiple query variations
      const results: SearchResult[] = [];

      for (const chunk of allChunks) {
        if (!chunk.embedding || chunk.embedding.length === 0) continue;

        let bestSimilarity = 0;

        // Test similarity against original query
        const originalSimilarity = cosineSimilarity(queryEmbedding, chunk.embedding);
        bestSimilarity = Math.max(bestSimilarity, originalSimilarity);

        // Test similarity against expanded queries
        for (const expandedQuery of expandedQueries) {
          try {
            const expandedEmbedding = await generateEmbedding(expandedQuery);
            const expandedSimilarity = cosineSimilarity(expandedEmbedding, chunk.embedding);
            bestSimilarity = Math.max(bestSimilarity, expandedSimilarity);
          } catch (error) {
            // Skip if embedding generation fails for expanded query
            continue;
          }
        }

        // Apply content-based boosting
        const contentBoost = calculateContentBoost(query, chunk.text, chunk.documentTitle);
        const finalScore = bestSimilarity + contentBoost;

        // Debug: Show similarity for relevant chunks
        if (finalScore >= minSimilarity || chunk.documentTitle.toLowerCase().includes(query.toLowerCase())) {
          console.log(`Chunk ${chunk.id} similarity: ${Math.round(finalScore * 100)}% - "${chunk.text.substring(0, 50)}..."`);
        }

        // Only include results above minimum similarity threshold
        if (finalScore >= minSimilarity) {
          results.push({
            chunk: chunk,
            documentId: chunk.documentId,
            documentTitle: chunk.documentTitle,
            documentType: chunk.documentType || 'unknown',
            score: finalScore,
            similarityPercentage: Math.round(finalScore * 100),
          });
        }
      }

      // Sort by score and return top K
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, topK);

    } catch (error) {
      console.warn('Semantic search failed, falling back to simple text search:', error);
      return await simpleTextSearch(query, topK);
    }

  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}

/**
 * Expand query with synonyms and related terms
 */
function expandQuery(query: string): string[] {
  const expansions: string[] = [];
  const queryLower = query.toLowerCase();

  // Common synonyms
  const synonymMap: Record<string, string[]> = {
    'find': ['search', 'locate', 'discover'],
    'show': ['display', 'list', 'present'],
    'about': ['regarding', 'concerning', 'related to'],
    'how': ['what is the way', 'steps to', 'method for'],
  };

  // Add synonym-based expansions
  Object.entries(synonymMap).forEach(([word, synonyms]) => {
    if (queryLower.includes(word)) {
      synonyms.forEach(synonym => {
        const expandedQuery = queryLower.replace(word, synonym);
        if (expandedQuery !== queryLower) {
          expansions.push(expandedQuery);
        }
      });
    }
  });

  // Add question reformulations
  if (queryLower.includes('biography') || queryLower.includes('about')) {
    const cleanQuery = queryLower.replace(/biography|about/gi, '').trim();
    expansions.push(`information about ${cleanQuery}`);
    expansions.push(`details about ${cleanQuery}`);
  }

  return expansions.slice(0, 3); // Limit to 3 expansions
}

/**
 * Calculate content-based boost for search results
 */
function calculateContentBoost(query: string, content: string, title: string): number {
  let boost = 0;

  // Title match boost
  if (title.toLowerCase().includes(query.toLowerCase())) {
    boost += 0.15;
  }

  // Exact phrase match boost
  if (content.toLowerCase().includes(query.toLowerCase())) {
    boost += 0.1;
  }

  // Named entity boost (if query looks like a name)
  const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
  const namesInContent = content.match(namePattern) || [];
  const namesInQuery = query.match(namePattern) || [];

  for (const queryName of namesInQuery) {
    for (const contentName of namesInContent) {
      if (queryName.toLowerCase() === contentName.toLowerCase()) {
        boost += 0.25;
        break;
      }
    }
  }

  return Math.min(boost, 0.3); // Cap boost at 0.3
}

/**
 * Search with different strategies
 */
export async function semanticSearchWithStrategy(
  query: string,
  strategy: 'exact' | 'broad' | 'balanced' = 'balanced',
  topK: number = 5
): Promise<SearchResult[]> {
  let minSimilarity: number;
  let searchTopK: number;

  switch (strategy) {
    case 'exact':
      minSimilarity = 0.3;
      searchTopK = topK;
      break;
    case 'broad':
      minSimilarity = 0.05;
      searchTopK = topK * 2;
      break;
    case 'balanced':
    default:
      minSimilarity = 0.1;
      searchTopK = topK;
      break;
  }

  const results = await semanticSearch(query, searchTopK, minSimilarity);
  return results.slice(0, topK);
}

/**
 * Search across specific document types
 */
export async function semanticSearchByType(
  query: string,
  documentTypes: string[],
  topK: number = 5
): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const documents = await getAllDocuments();

    // Filter by document types
    const filteredDocs = documents.filter(d =>
      documentTypes.includes(d.type) && d.chunks && d.chunks.length > 0
    );

    if (filteredDocs.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const doc of filteredDocs) {
      for (const chunk of doc.chunks || []) {
        if (!chunk.embedding) continue;

        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

        if (similarity >= 0.1) {
          results.push({
            chunk: chunk,
            documentId: doc.id,
            documentTitle: doc.title,
            documentType: doc.type,
            score: similarity,
            similarityPercentage: similarityPercentage(similarity),
          });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  } catch (error) {
    console.error('Type-specific search failed:', error);
    throw error;
  }
}

/**
 * Get search statistics
 */
export async function getSearchStats(): Promise<{
  totalDocuments: number;
  processedDocuments: number;
  totalChunks: number;
  averageChunksPerDocument: number;
}> {
  const allChunks = await getAllDocumentChunks();
  const uniqueDocuments = new Set(allChunks.map(chunk => chunk.documentId));

  return {
    totalDocuments: uniqueDocuments.size,
    processedDocuments: uniqueDocuments.size,
    totalChunks: allChunks.length,
    averageChunksPerDocument: uniqueDocuments.size > 0 ? allChunks.length / uniqueDocuments.size : 0,
  };
}