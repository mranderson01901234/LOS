// OpenAI API Key Verification Script
// Run this in the browser console to test the API key

async function verifyOpenAI() {
  try {
    console.log('🔍 Verifying OpenAI API configuration...');
    
    // Check if API key is stored
    const { getSetting } = await import('./src/services/db.ts');
    const apiKey = await getSetting('openai_api_key');
    
    if (!apiKey) {
      console.error('❌ No OpenAI API key found in database');
      return false;
    }
    
    console.log('✅ OpenAI API key found:', apiKey.substring(0, 10) + '...');
    
    // Test the API key with a simple request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
        max_tokens: 10,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ OpenAI API key is valid and working!');
      console.log('📝 Test response:', data.choices[0].message.content);
      return true;
    } else {
      const errorData = await response.json();
      console.error('❌ OpenAI API key test failed:', errorData.error?.message || 'Unknown error');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verifying OpenAI API:', error);
    return false;
  }
}

// Run verification
verifyOpenAI().then(success => {
  if (success) {
    console.log('🎉 OpenAI API is ready to use!');
  } else {
    console.log('⚠️ OpenAI API needs configuration');
  }
});
