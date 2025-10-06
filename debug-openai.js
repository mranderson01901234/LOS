// Debug script to check OpenAI configuration
import { initDB } from './src/services/db.js';

async function debugOpenAI() {
  try {
    const db = await initDB();
    
    // Check if the setting exists
    const openaiKey = await db.get('settings', 'openai_api_key');
    console.log('OpenAI API Key from DB:', openaiKey);
    
    // Check all settings
    const allSettings = await db.getAll('settings');
    console.log('All settings:', allSettings);
    
    // Check if the key is valid
    if (openaiKey && openaiKey.value) {
      console.log('✅ OpenAI API key is configured:', openaiKey.value.substring(0, 10) + '...');
    } else {
      console.log('❌ OpenAI API key is NOT configured');
    }
  } catch (error) {
    console.error('Error checking OpenAI config:', error);
  }
}

debugOpenAI();
