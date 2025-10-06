import { getAllInterests, type Interest } from './db';

export async function getTopInterests(limit: number = 5): Promise<Interest[]> {
  const interests = await getAllInterests();
  return interests
    .sort((a, b) => b.engagement_score - a.engagement_score)
    .slice(0, limit);
}

export async function getInterestsForPrompt(): Promise<string> {
  const interests = await getTopInterests(5);
  if (interests.length === 0) return '';
  
  const expertiseLevel = (score: number): string => {
    if (score > 0.8) return 'expert level';
    if (score > 0.6) return 'advanced';
    if (score > 0.4) return 'intermediate';
    return 'beginner/exploring';
  };
  
  let output = '\n\nYOUR USER\'S INTERESTS:\n';
  interests.forEach(interest => {
    output += `- ${interest.name} (${expertiseLevel(interest.engagement_score)}) - ${interest.content_count} items saved\n`;
  });
  
  return output;
}
