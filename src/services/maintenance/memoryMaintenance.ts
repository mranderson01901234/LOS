import { MemoryManager } from '../memory/memoryManager';

/**
 * Run this monthly via cron job or scheduled task
 * Compresses conversations older than 3 months
 * Cost: ~$0.50/month for 100 conversations
 */
export async function runMonthlyMemoryMaintenance(): Promise<void> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('No API key found for memory maintenance');
    return;
  }
  
  const memoryManager = new MemoryManager();const startTime = Date.now();
  
  try {
    await memoryManager.consolidateOldMemories(apiKey);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);} catch (error) {
    console.error('Memory maintenance failed:', error);
  }
}

/**
 * Manual trigger for testing
 */
export async function triggerMemoryMaintenance(): Promise<void> {await runMonthlyMemoryMaintenance();
}
