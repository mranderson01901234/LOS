// Debug script to check current growth metrics
import { initDB } from './src/services/db.js';

async function checkGrowthMetrics() {
  try {
    const db = await initDB();
    const metrics = await db.get('growth_metrics', 'current');
    
    console.log('Current Growth Metrics:');
    console.log(JSON.stringify(metrics, null, 2));
    
    if (metrics) {
      console.log('\nCalculated Level:', metrics.currentLevel);
      console.log('Current XP:', metrics.currentXP);
      console.log('Total XP:', metrics.totalXP);
      console.log('Total Messages:', metrics.totalMessages);
      console.log('Total Documents:', metrics.totalDocuments);
    }
  } catch (error) {
    console.error('Error checking growth metrics:', error);
  }
}

checkGrowthMetrics();
