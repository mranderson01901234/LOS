/**
 * Essential Foundation Tests
 * 
 * Provides essential testing functionality for the LOS application
 * to ensure core components are working correctly.
 */

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  passCount: number;
  failCount: number;
  totalDuration: number;
}

export class TestRunner {
  /**
   * Run a single test
   */
  async runTest(test: { name: string; fn: () => Promise<void> }): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      await test.fn();
      const duration = Date.now() - startTime;
      
      return {
        name: test.name,
        passed: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        name: test.name,
        passed: false,
        duration,
        error: errorMessage
      };
    }
  }

  /**
   * Run multiple tests
   */
  async runTests(tests: Array<{ name: string; fn: () => Promise<void> }>): Promise<TestSuite> {
    const results: TestResult[] = [];
    let passCount = 0;
    let failCount = 0;
    let totalDuration = 0;

    for (const test of tests) {
      const result = await this.runTest(test);
      results.push(result);
      
      if (result.passed) {
        passCount++;
        console.log(`PASS: ${test.name} (${result.duration}ms)`);
      } else {
        failCount++;
        console.error(`FAIL: ${test.name} (${result.duration}ms) - ${result.error}`);
        
        // If it's a critical test, stop execution
        if (test.name.includes('CRITICAL')) {
          break;
        }
      }
      
      totalDuration += result.duration;
    }

    return {
      name: 'Essential Tests',
      tests: results,
      passCount,
      failCount,
      totalDuration
    };
  }

  /**
   * Get test summary
   */
  getSummary(suite: TestSuite): string {
    const passRate = ((suite.passCount / (suite.passCount + suite.failCount)) * 100).toFixed(1);
    return `${suite.name}: ${suite.passCount}/${suite.passCount + suite.failCount} tests passed (${passRate}%) in ${suite.totalDuration}ms`;
  }
}

/**
 * Essential Foundation Tests
 */
export class FoundationTests {
  private testRunner = new TestRunner();

  /**
   * Run all essential tests
   */
  async runAllTests(): Promise<TestSuite> {
    const tests = [
      {
        name: 'CRITICAL: Database Connection',
        fn: async () => {
          const { initDB } = await import('../db');
          const db = await initDB();
          if (!db) throw new Error('Database initialization failed');
        }
      },
      {
        name: 'CRITICAL: Conversation Creation',
        fn: async () => {
          const { createConversation } = await import('../db');
          const conv = await createConversation();
          if (!conv || !conv.id) throw new Error('Conversation creation failed');
        }
      },
      {
        name: 'CRITICAL: Document Storage',
        fn: async () => {
          const { storeDocument } = await import('../db');
          const doc = await storeDocument({
            title: 'Test Document',
            content: 'Test content',
            type: 'test',
            tags: ['test']
          });
          if (!doc || !doc.id) throw new Error('Document storage failed');
        }
      },
      {
        name: 'CRITICAL: Fact Storage',
        fn: async () => {
          const { storeFact } = await import('../db');
          const fact = await storeFact({
            content: 'Test fact',
            category: 'test',
            subject: 'test'
          });
          if (!fact || !fact.id) throw new Error('Fact storage failed');
        }
      },
      {
        name: 'Settings Management',
        fn: async () => {
          const { setSetting, getSetting } = await import('../db');
          await setSetting('test_key', 'test_value');
          const value = await getSetting('test_key');
          if (value !== 'test_value') throw new Error('Settings management failed');
        }
      },
      {
        name: 'Data Retrieval',
        fn: async () => {
          const { getAllConversations, getAllDocuments, getAllFacts } = await import('../db');
          const [conversations, documents, facts] = await Promise.all([
            getAllConversations(),
            getAllDocuments(),
            getAllFacts()
          ]);
          
          if (!Array.isArray(conversations) || !Array.isArray(documents) || !Array.isArray(facts)) {
            throw new Error('Data retrieval failed');
          }
        }
      },
      {
        name: 'Error Handling',
        fn: async () => {
          try {
            const { getSetting } = await import('../db');
            await getSetting('non_existent_key');
            // This should not throw an error
          } catch (error) {
            throw new Error('Error handling failed');
          }
        }
      }
    ];

    return await this.testRunner.runTests(tests);
  }

  /**
   * Run quick health check
   */
  async quickHealthCheck(): Promise<boolean> {
    try {
      const suite = await this.runAllTests();
      return suite.failCount === 0;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get test results summary
   */
  async getTestSummary(): Promise<string> {
    const suite = await this.runAllTests();
    return this.testRunner.getSummary(suite);
  }

  /**
   * Run specific test category
   */
  async runDatabaseTests(): Promise<TestSuite> {
    const tests = [
      {
        name: 'Database Initialization',
        fn: async () => {
          const { initDB } = await import('../db');
          const db = await initDB();
          if (!db) throw new Error('Database initialization failed');
        }
      },
      {
        name: 'Database Connection',
        fn: async () => {
          const { getAllConversations } = await import('../db');
          await getAllConversations();
        }
      }
    ];

    return await this.testRunner.runTests(tests);
  }

  /**
   * Run data integrity tests
   */
  async runDataIntegrityTests(): Promise<TestSuite> {
    const tests = [
      {
        name: 'Conversation Integrity',
        fn: async () => {
          const { getAllConversations } = await import('../db');
          const conversations = await getAllConversations();
          
          // Check for required fields
          conversations.forEach(conv => {
            if (!conv.id) throw new Error('Conversation missing ID');
            if (!conv.createdAt) throw new Error('Conversation missing createdAt');
          });
        }
      },
      {
        name: 'Document Integrity',
        fn: async () => {
          const { getAllDocuments } = await import('../db');
          const documents = await getAllDocuments();
          
          // Check for required fields
          documents.forEach(doc => {
            if (!doc.id) throw new Error('Document missing ID');
            if (!doc.title) throw new Error('Document missing title');
            if (!doc.type) throw new Error('Document missing type');
          });
        }
      },
      {
        name: 'Fact Integrity',
        fn: async () => {
          const { getAllFacts } = await import('../db');
          const facts = await getAllFacts();
          
          // Check for required fields
          facts.forEach(fact => {
            if (!fact.id) throw new Error('Fact missing ID');
            if (!fact.content) throw new Error('Fact missing content');
            if (!fact.category) throw new Error('Fact missing category');
          });
        }
      }
    ];

    return await this.testRunner.runTests(tests);
  }
}

// Export singleton instance
export const foundationTests = new FoundationTests();