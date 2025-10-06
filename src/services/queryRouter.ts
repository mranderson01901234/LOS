import { semanticSearch } from './semanticSearch';
import { getSetting } from './db';

export interface RouteDecision {
  useLocal: boolean;
  useWeb: boolean;
  reason: string;
}

// Decide whether to use local knowledge, web search, or both
export async function routeQuery(query: string): Promise<RouteDecision> {
  // ALWAYS check for simple conversations first, regardless of web search setting
  const noWebSearch = [
    /^hello$/i,
    /^hi$/i,
    /^hey$/i,
    /^good morning$/i,
    /^good afternoon$/i,
    /^good evening$/i,
    /^how are you$/i,
    /^how's it going$/i,
    /^what's up$/i,
    /^thanks$/i,
    /^thank you$/i,
    /^bye$/i,
    /^goodbye$/i,
    /^see you$/i,
    /^nice to meet you$/i,
    /^pleasure$/i,
    /^you're welcome$/i,
    /^no problem$/i,
    /^sure$/i,
    /^okay$/i,
    /^ok$/i,
    /^yes$/i,
    /^no$/i,
    /^maybe$/i,
    /^i don't know$/i,
    /^i'm not sure$/i,
    /^that's interesting$/i,
    /^that's cool$/i,
    /^that's great$/i,
    /^awesome$/i,
    /^amazing$/i,
    /^wow$/i,
    /^really\?$/i,
    /^tell me about yourself$/i,
    /^what can you do$/i,
    /^what are your capabilities$/i,
    /^help me$/i,
    /^can you help$/i,
  ];

  if (noWebSearch.some(pattern => pattern.test(query))) {
    return { useLocal: false, useWeb: false, reason: 'Simple conversation - no search needed' };
  }

  // Web search is now enabled by default with smart routing
  const webSearchEnabled = await getSetting('web_search_enabled');
  
  if (!webSearchEnabled) {
    return { useLocal: true, useWeb: false, reason: 'Web search disabled' };
  }

  // Patterns that REQUIRE web search
  const webRequired = [
    /weather/i,
    /news/i,
    /current/i,
    /latest/i,
    /today/i,
    /now/i,
    /recent/i,
    /stock price/i,
    /what is happening/i,
    /what's happening/i,
    /breaking/i,
    /update/i,
    /live/i,
    /real-time/i,
    /search for/i,
    /search the web/i,
    /google/i,
    /look up/i,
    /research.*web/i,
    /web.*research/i,
    /can you research/i,
    /research.*on the web/i,
    /bleeding edge/i,
    /cutting edge/i,
    /latest developments/i,
    /current trends/i,
  ];
  
  if (webRequired.some(pattern => pattern.test(query))) {
    return { useLocal: false, useWeb: true, reason: 'Requires current information' };
  }

  // Patterns that prefer LOCAL knowledge
  const localPreferred = [
    /what did i save/i,
    /my notes/i,
    /my documents/i,
    /in my library/i,
    /from my files/i,
    /what have i/i,
    /summarize my/i,
    /my saved/i,
    /my uploaded/i,
    /my content/i,
  ];
  
  if (localPreferred.some(pattern => pattern.test(query))) {
    return { useLocal: true, useWeb: false, reason: 'Personal knowledge query' };
  }

  // For everything else: Try local first, use web as fallback
  try {const localResults = await semanticSearch(query, 5); // Increased from 3 to 5 for better coverage// Enhanced threshold logic - be more permissive for biographical queries
    const isBiographicalQuery = /biography|about|who is|personal|background|profile/i.test(query);
    const threshold = isBiographicalQuery ? 0.15 : 0.25; // Lower threshold for biographical queries
    
    if (localResults.length > 0 && localResults[0].score > threshold) {
      // Good local results found}%)`);
      return { useLocal: true, useWeb: false, reason: 'Found in local knowledge' };
    } else if (localResults.length > 0) {
      // Some results found but below threshold - use hybrid approachreturn { useLocal: true, useWeb: true, reason: 'Hybrid search - some local results found' };
    } else {
      // No local results, search webreturn { useLocal: false, useWeb: true, reason: 'No local results' };
    }
  } catch (error) {
    // If local search fails, fall back to webreturn { useLocal: false, useWeb: true, reason: 'Local search failed' };
  }
}

// Enhanced routing that can use both sources
export async function routeQueryHybrid(query: string): Promise<RouteDecision> {
  // ALWAYS check for simple conversations first, regardless of web search setting
  const noWebSearch = [
    /^hello$/i,
    /^hi$/i,
    /^hey$/i,
    /^good morning$/i,
    /^good afternoon$/i,
    /^good evening$/i,
    /^how are you$/i,
    /^how's it going$/i,
    /^what's up$/i,
    /^thanks$/i,
    /^thank you$/i,
    /^bye$/i,
    /^goodbye$/i,
    /^see you$/i,
    /^nice to meet you$/i,
    /^pleasure$/i,
    /^you're welcome$/i,
    /^no problem$/i,
    /^sure$/i,
    /^okay$/i,
    /^ok$/i,
    /^yes$/i,
    /^no$/i,
    /^maybe$/i,
    /^i don't know$/i,
    /^i'm not sure$/i,
    /^that's interesting$/i,
    /^that's cool$/i,
    /^that's great$/i,
    /^awesome$/i,
    /^amazing$/i,
    /^wow$/i,
    /^really\?$/i,
    /^tell me about yourself$/i,
    /^what can you do$/i,
    /^what are your capabilities$/i,
    /^help me$/i,
    /^can you help$/i,
  ];

  if (noWebSearch.some(pattern => pattern.test(query))) {
    return { useLocal: false, useWeb: false, reason: 'Simple conversation - no search needed' };
  }

  // Web search is now enabled by default with smart routing
  const webSearchEnabled = await getSetting('web_search_enabled');
  
  if (!webSearchEnabled) {
    return { useLocal: true, useWeb: false, reason: 'Web search disabled' };
  }

  // Patterns that REQUIRE web search
  const webRequired = [
    /weather/i,
    /news/i,
    /current/i,
    /latest/i,
    /today/i,
    /now/i,
    /recent/i,
    /stock price/i,
    /what is happening/i,
    /what's happening/i,
    /breaking/i,
    /update/i,
    /live/i,
    /real-time/i,
    /search for/i,
    /search the web/i,
    /google/i,
    /look up/i,
    /research.*web/i,
    /web.*research/i,
    /can you research/i,
    /research.*on the web/i,
    /bleeding edge/i,
    /cutting edge/i,
    /latest developments/i,
    /current trends/i,
  ];
  
  if (webRequired.some(pattern => pattern.test(query))) {
    return { useLocal: false, useWeb: true, reason: 'Requires current information' };
  }

  // Patterns that prefer LOCAL knowledge
  const localPreferred = [
    /what did i save/i,
    /my notes/i,
    /my documents/i,
    /in my library/i,
    /from my files/i,
    /what have i/i,
    /summarize my/i,
    /my saved/i,
    /my uploaded/i,
    /my content/i,
  ];
  
  if (localPreferred.some(pattern => pattern.test(query))) {
    return { useLocal: true, useWeb: false, reason: 'Personal knowledge query' };
  }

  // For general queries: try both local and web
  try {
    const localResults = await semanticSearch(query, 3);
    
    if (localResults.length > 0 && localResults[0].score > 0.5) {
      // Good local results found, but also search web for additional context
      return { useLocal: true, useWeb: true, reason: 'Found local knowledge, adding web context' };
    } else {
      // Local results weak, search web
      return { useLocal: false, useWeb: true, reason: 'No good local results' };
    }
  } catch (error) {
    // If local search fails, fall back to web
    return { useLocal: false, useWeb: true, reason: 'Local search failed' };
  }
}