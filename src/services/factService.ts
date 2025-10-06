import { getAllFacts, type Fact } from './db';

export async function getRelevantFacts(query: string, limit: number = 5): Promise<Fact[]> {
  const allFacts = await getAllFacts();
  if (allFacts.length === 0) return [];
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ').filter(w => w.length > 3);
  
  const scored = allFacts
    .filter(f => f.status === 'active')
    .map(fact => {
      let score = 0;
      const factText = `${fact.subject} ${fact.fact_text} ${fact.context || ''}`.toLowerCase();
      
      // Exact subject match
      if (queryLower.includes(fact.subject.toLowerCase())) {
        score += 10;
      }
      
      // Word overlap scoring
      queryWords.forEach(word => {
        if (factText.includes(word)) {
          score += 2;
        }
      });
      
      // Boost by confidence
      score *= fact.confidence;
      
      return { fact, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return scored.map(item => item.fact);
}

export async function getAllUserFacts(limit: number = 10): Promise<Fact[]> {
  const allFacts = await getAllFacts();
  return allFacts
    .filter(f => f.status === 'active')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

export function formatFactsForPrompt(facts: Fact[]): string {
  if (facts.length === 0) return '';
  
  const groupedFacts = facts.reduce((acc, fact) => {
    const category = fact.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(fact);
    return acc;
  }, {} as Record<string, Fact[]>);
  
  let output = '\n\nWHAT YOU KNOW ABOUT YOUR USER:\n';
  
  Object.entries(groupedFacts).forEach(([category, categoryFacts]) => {
    output += `\n${category.toUpperCase()}:\n`;
    categoryFacts.forEach(fact => {
      output += `- ${fact.subject}: ${fact.fact_text}`;
      if (fact.context) output += ` (${fact.context})`;
      output += '\n';
    });
  });
  
  return output;
}
