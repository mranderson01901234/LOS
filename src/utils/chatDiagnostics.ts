/**
 * Chat Diagnostics
 * 
 * Provides diagnostic tools for testing and validating the chat system
 */

import { 
  initDB, 
  clearAllData, 
  createConversation, 
  saveMessage, 
  getMessagesByConversation, 
  getAllConversations 
} from '../services/db';

export interface DiagnosticResult {
  passed: string[];
  failed: string[];
  duration: number;
}

/**
 * Run comprehensive chat diagnostics
 */
export async function runChatDiagnostics(): Promise<DiagnosticResult> {
  const results: DiagnosticResult = {
    passed: [],
    failed: [],
    duration: 0
  };

  const startTime = Date.now();

  try {
    // TEST 1: Database Initialization
    const db = await initDB();
    results.passed.push('DB Init');

    // TEST 2: Clear existing data for clean test
    await clearAllData();
    results.passed.push('DB Clear');

    // TEST 3: Create Conversation A
    const convA = await createConversation();
    if (!convA.id) {
      throw new Error('Conversation A has no ID');
    }
    results.passed.push('Create Conv A');

    // TEST 4: Add messages to Conversation A
    const msgA1 = {
      id: crypto.randomUUID(),
      conversation_id: convA.id,
      role: 'user' as const,
      content: 'Message 1 in Conversation A',
      timestamp: new Date().toISOString(),
    };
    const msgA2 = {
      id: crypto.randomUUID(),
      conversation_id: convA.id,
      role: 'assistant' as const,
      content: 'Response 1 in Conversation A',
      timestamp: new Date().toISOString(),
    };
    
    await saveMessage(msgA1);
    await saveMessage(msgA2);
    results.passed.push('Add messages to Conv A');

    // TEST 5: Retrieve Conversation A messages
    const retrievedA = await getMessagesByConversation(convA.id);
    if (retrievedA.length !== 2) {
      results.failed.push(`Conv A messages - expected 2, got ${retrievedA.length}`);
    } else {
      results.passed.push('Retrieve Conv A messages');
    }

    // TEST 6: Create Conversation B
    const convB = await createConversation();
    if (convB.id === convA.id) {
      results.failed.push('Conv B has same ID as Conv A!');
      throw new Error('Duplicate conversation IDs');
    }
    results.passed.push('Create Conv B');

    // TEST 7: Add messages to Conversation B
    const msgB1 = {
      id: crypto.randomUUID(),
      conversation_id: convB.id,
      role: 'user' as const,
      content: 'Message 1 in Conversation B',
      timestamp: new Date().toISOString(),
    };
    const msgB2 = {
      id: crypto.randomUUID(),
      conversation_id: convB.id,
      role: 'assistant' as const,
      content: 'Response 1 in Conversation B',
      timestamp: new Date().toISOString(),
    };
    
    await saveMessage(msgB1);
    await saveMessage(msgB2);
    results.passed.push('Add messages to Conv B');

    // TEST 8: Retrieve Conversation B messages
    const retrievedB = await getMessagesByConversation(convB.id);
    if (retrievedB.length !== 2) {
      results.failed.push(`Conv B messages - expected 2, got ${retrievedB.length}`);
    } else {
      results.passed.push('Retrieve Conv B messages');
    }

    // TEST 9: List all conversations
    const allConvs = await getAllConversations();
    if (allConvs.length !== 2) {
      results.failed.push(`All convs - expected 2, got ${allConvs.length}`);
    } else {
      results.passed.push('List all conversations');
    }

    // TEST 10: Verify message isolation
    const convAMessages = await getMessagesByConversation(convA.id);
    const hasConvBMessages = convAMessages.some(m => m.conversation_id === convB.id);
    if (hasConvBMessages) {
      results.failed.push('Conv A has Conv B messages!');
    } else {
      results.passed.push('Message isolation');
    }

  } catch (error) {
    console.error('Diagnostic test failed:', error);
    results.failed.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  results.duration = Date.now() - startTime;
  return results;
}

/**
 * Run complete diagnostic and print results
 */
export async function runCompleteDiagnostic(): Promise<void> {
  const results = await runChatDiagnostics();
  printDiagnosticResults(results);
}

/**
 * Print diagnostic results to console
 */
export function printDiagnosticResults(results: DiagnosticResult): void {
  console.log('\n=== CHAT DIAGNOSTICS RESULTS ===');
  console.log(`Duration: ${results.duration}ms`);
  console.log(`\nPassed (${results.passed.length}):`);
  results.passed.forEach(test => console.log(`  ✅ ${test}`));
  
  if (results.failed.length > 0) {
    console.log(`\nFailed (${results.failed.length}):`);
    results.failed.forEach(test => console.log(`  ❌ ${test}`));
  }
  
  console.log('\n================================\n');
}