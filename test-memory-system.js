// Test script for LOS Memory System + Pre-Router
// Run this in the browser console to test functionality

import { MemoryManager } from './src/services/memory/memoryManager';
import { PreRouter } from './src/services/agent/preRouter';
import { ClaudeAgent } from './src/services/agent/agent';

async function testMemorySystem() {
  console.log('🧠 Testing Memory System...');
  
  const memoryManager = new MemoryManager();
  
  try {
    // Test hot memory building
    console.log('Building hot memory...');
    const hotMemory = await memoryManager.buildHotMemory();
    console.log('✅ Hot memory built:', hotMemory.substring(0, 200) + '...');
    
    // Test memory search
    console.log('Testing memory search...');
    const searchResults = await memoryManager.searchMemories('photography', 'recent');
    console.log('✅ Memory search results:', searchResults.length, 'matches');
    
  } catch (error) {
    console.error('❌ Memory system test failed:', error);
  }
}

async function testPreRouter() {
  console.log('🚦 Testing Pre-Router...');
  
  const preRouter = new PreRouter();
  
  const testQueries = [
    'hi',
    'hello there',
    'thanks!',
    'what time is it',
    '5 + 3',
    'ok cool',
    'what is the weather in Paris',
    'who is the president',
    'complex analysis of my documents'
  ];
  
  for (const query of testQueries) {
    const result = await preRouter.checkTrivial(query);
    console.log(`Query: "${query}" -> ${result.shouldRoute ? 'ROUTE TO AGENT' : 'PRE-ROUTED'} (${result.reason})`);
    if (!result.shouldRoute) {
      console.log(`  Response: "${result.response}"`);
    }
  }
}

async function testAgentIntegration() {
  console.log('🤖 Testing Agent Integration...');
  
  const agent = new ClaudeAgent();
  
  try {
    // Test pre-routed query
    const preRouteResult = await agent.execute('hi', []);
    console.log('✅ Pre-routed query result:', preRouteResult.metadata?.model_used, 'Cost:', preRouteResult.metadata?.estimated_cost);
    
    // Test agent query
    const agentResult = await agent.execute('What do you know about me?', []);
    console.log('✅ Agent query result:', agentResult.metadata?.model_used, 'Cost:', agentResult.metadata?.estimated_cost);
    
  } catch (error) {
    console.error('❌ Agent integration test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting LOS Memory System Tests...\n');
  
  await testPreRouter();
  console.log('\n');
  
  await testMemorySystem();
  console.log('\n');
  
  await testAgentIntegration();
  console.log('\n');
  
  console.log('✅ All tests completed!');
}

// Export for manual testing
window.testLOSMemory = {
  testMemorySystem,
  testPreRouter,
  testAgentIntegration,
  runAllTests
};

console.log('🧪 LOS Memory System test functions loaded. Run window.testLOSMemory.runAllTests() to test everything.');
