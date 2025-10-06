// Test script to verify conversation switching
// Run this in the browser console to test the database queries

async function testConversationSwitching() {
  console.log('🧪 Testing conversation switching...');
  
  try {
    // Import the database functions
    const { initDB } = await import('./src/services/db.ts');
    
    // Test 1: Get all conversations
    console.log('📋 Getting all conversations...');
    const conversations = await db.getAllConversations();
    console.log('📋 Found', conversations.length, 'conversations:', conversations.map(c => ({ id: c.id, title: c.title, message_count: c.message_count })));
    
    // Test 2: Get messages for each conversation
    for (const conv of conversations) {
      console.log(`📥 Getting messages for conversation ${conv.id}...`);
      const messages = await db.getMessagesByConversation(conv.id);
      console.log(`📥 Conversation ${conv.id} has ${messages.length} messages:`, messages.map(m => ({ id: m.id, role: m.role, content: m.content.substring(0, 30) + '...' })));
    }
    
    // Test 3: Test the hook functions
    console.log('🔧 Testing hook functions...');
    // This would need to be run in the React component context
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConversationSwitching();
