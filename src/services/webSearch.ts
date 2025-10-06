import { getSetting, setSetting } from './db';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  content?: string;
  snippet?: string;
}

interface TauriSearchResponse {
  results: SearchResult[];
  total_results: number;
  search_time: number;
}

// Simple in-memory cache for search results
const searchCache = new Map<string, { results: SearchResult[], timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

// Search the web using Tauri backend commands with fallback to free APIs
export async function searchWeb(query: string, numResults: number = 5): Promise<SearchResult[]> {
  const cacheKey = `${query}-${numResults}`;
  const cached = searchCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {return cached.results;
  }

  try {
    // Try premium search providers first (via Tauri backend) if available
    const braveApiKey = await getSetting('brave_search_api_key');
    const googleApiKey = await getSetting('google_search_api_key');
    
    // Try Brave Search API directly (works in both Tauri and web)
    if (braveApiKey) {try {
        const braveResponse = await searchBraveDirect(query, braveApiKey, numResults);
        
        if (braveResponse.results.length > 0) {// Cache the results
          searchCache.set(cacheKey, { results: braveResponse.results, timestamp: Date.now() });
          
          // Track usage
          await updateSearchUsage();
          
          return braveResponse.results;
        }
      } catch (error) {
        console.warn('Brave Search failed:', error);
      }
    }
    
    // Try Google Search API directly (works in both Tauri and web)
    if (googleApiKey) {try {
        const googleResponse = await searchGoogleDirect(query, googleApiKey, numResults);
        
        if (googleResponse.results.length > 0) {// Cache the results
          searchCache.set(cacheKey, { results: googleResponse.results, timestamp: Date.now() });
          
          // Track usage
          await updateSearchUsage();
          
          return googleResponse.results;
        }
      } catch (error) {
        console.warn('Google Search failed:', error);
      }
    }
    
    // Fallback to free APIs if no premium API keys or all premium APIs failed// Clean and simplify the query for better API results
    const cleanQuery = query
      .replace(/can you search/i, '')
      .replace(/search for/i, '')
      .replace(/search/i, '')
      .replace(/for me/i, '')
      .replace(/please/i, '')
      .replace(/google for/i, '')
      .replace(/brave for/i, '')
      .trim();// Try multiple free search engines in parallel
    const searchPromises = [
      searchWikipedia(cleanQuery),
      searchDuckDuckGo(cleanQuery),
      searchFreeGoogle(cleanQuery),
      searchFreeBing(cleanQuery)
    ];
    
    const searchResults = await Promise.allSettled(searchPromises);
    
    // Collect all successful results
    const allResults: SearchResult[] = [];
    
    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allResults.push(...result.value);
      }
    }
    
    // Remove duplicates based on URL
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );
    
    if (uniqueResults.length > 0) {// Cache the results
      searchCache.set(cacheKey, { results: uniqueResults.slice(0, numResults), timestamp: Date.now() });
      
      // Track usage
      await updateSearchUsage();
      
      return uniqueResults.slice(0, numResults);
    }
    
    // Ultimate fallback: Return a helpful message
    console.warn('All search APIs failed, returning helpful fallback');
    const fallbackResults: SearchResult[] = [{
      title: `Search: ${cleanQuery}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`,
      description: `I couldn't find specific results for "${cleanQuery}" through the available APIs. You can search for this directly on Google or other search engines.`
    }];
    
    // Cache the fallback results
    searchCache.set(cacheKey, { results: fallbackResults, timestamp: Date.now() });
    
    return fallbackResults;
    
  } catch (error) {
    console.error('Web search failed:', error);
    return [{
      title: 'Search Error',
      url: '',
      description: 'Unable to perform web search at this time. Please try again later.'
    }];
  }
}

// Fetch full content from a URL (for deeper context)
export async function fetchUrlContent(url: string): Promise<string> {
  try {// Try to fetch content directly with CORS handling
    const response = await fetch(url, {
      mode: 'cors',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (response.ok) {
      const content = await response.text();
      return content.substring(0, 5000); // Limit to 5000 chars
    }
    
    return '';
  } catch (error) {
    console.warn('Failed to fetch URL (CORS or other error):', error);
    // Return empty string instead of throwing - this prevents CORS errors from breaking the chat
    return '';
  }
}

// Track search usage
async function updateSearchUsage(): Promise<void> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usageKey = `search_usage_${currentMonth}`;
    
    const currentCount = await getSetting(usageKey) || 0;
    await setSetting(usageKey, currentCount + 1);
  } catch (error) {
    console.error('Failed to update search usage:', error);
  }
}

// Get current month's search count
export async function getSearchUsage(): Promise<number> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usageKey = `search_usage_${currentMonth}`;
    return await getSetting(usageKey) || 0;
  } catch (error) {
    console.error('Failed to get search usage:', error);
    return 0;
  }
}

// Direct Brave Search API call (for web version)
async function searchBraveDirect(query: string, apiKey: string, numResults: number): Promise<TauriSearchResponse> {
  // Add query parameters
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', numResults.toString());

  const braveResponse = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Subscription-Token': apiKey,
      'Accept': 'application/json',
    }
  });

  if (!braveResponse.ok) {
    throw new Error(`Brave Search API error: ${braveResponse.status}`);
  }

  const data = await braveResponse.json();
  
  const results: SearchResult[] = (data.web?.results || []).map((item: any) => ({
    title: item.title || '',
    url: item.url || '',
    description: item.description || '',
    snippet: item.description || ''
  }));

  return {
    results,
    total_results: data.web?.results?.length || results.length,
    search_time: 0
  };
}

// Direct Google Search API call (for web version)
async function searchGoogleDirect(query: string, apiKey: string, numResults: number): Promise<TauriSearchResponse> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: numResults
    })
  });

  if (!response.ok) {
    throw new Error(`Google Search API error: ${response.status}`);
  }

  const data = await response.json();
  
  const results: SearchResult[] = (data.organic || []).map((item: any) => ({
    title: item.title || '',
    url: item.link || '',
    description: item.snippet || '',
    snippet: item.snippet || ''
  }));

  return {
    results,
    total_results: data.searchInformation?.totalResults || results.length,
    search_time: data.searchInformation?.searchTime || 0
  };
}

// Free search engine implementations
async function searchWikipedia(query: string): Promise<SearchResult[]> {
  try {// Extract key terms from the query for Wikipedia - try different combinations
    const terms = query.split(' ').filter(term => term.length > 2);
    const wikiQueries = [
      terms.slice(0, 3).join(' '),  // First 3 words
      terms.slice(0, 2).join(' '),  // First 2 words  
      terms[0],                      // First word only
      query                          // Full cleaned query
    ].filter(q => q.length > 0);
    
    for (const wikiQuery of wikiQueries) {const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`);
      
      if (wikiResponse.ok) {
        const wikiData = await wikiResponse.json();
        
        if (wikiData.extract) {
          return [{
            title: wikiData.title || wikiQuery,
            url: wikiData.content_urls?.desktop?.page || '',
            description: wikiData.extract
          }];
        }
      }
    }
    
    return [];
  } catch (error) {
    console.warn('Wikipedia search failed:', error);
    return [];
  }
}

async function searchFreeGoogle(query: string): Promise<SearchResult[]> {
  try {// Use a free Google search proxy
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.google.com/search?q=${query}`)}`);
    
    if (response.ok) {
      const data = await response.json();
      // This is a basic implementation - in practice, you'd need to parse HTML
      // For now, return a placeholder that indicates Google search was attempted
      return [{
        title: `Google Search: ${query}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        description: `Search results for "${query}" on Google`
      }];
    }
    
    return [];
  } catch (error) {
    console.warn('Free Google search failed:', error);
    return [];
  }
}

async function searchFreeBing(query: string): Promise<SearchResult[]> {
  try {// Use a free Bing search proxy
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.bing.com/search?q=${query}`)}`);
    
    if (response.ok) {
      const data = await response.json();
      // This is a basic implementation - in practice, you'd need to parse HTML
      return [{
        title: `Bing Search: ${query}`,
        url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
        description: `Search results for "${query}" on Bing`
      }];
    }
    
    return [];
  } catch (error) {
    console.warn('Free Bing search failed:', error);
    return [];
  }
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {// DuckDuckGo Instant Answer API (no API key required)
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    
    if (response.ok) {
      const data = await response.json();
      const results: SearchResult[] = [];
      
      // Add abstract if available
      if (data.Abstract) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '',
          description: data.Abstract
        });
      }
      
      // Add related topics
      if (data.RelatedTopics) {
        data.RelatedTopics.slice(0, 3).forEach((topic: any) => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text,
              url: topic.FirstURL,
              description: topic.Text
            });
          }
        });
      }
      
      return results;
    }
    
    return [];
  } catch (error) {
    console.warn('DuckDuckGo search failed:', error);
    return [];
  }
}


// Clear search cache
export function clearSearchCache(): void {
  searchCache.clear();
}