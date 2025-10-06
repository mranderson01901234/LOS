/**
 * LOS Chat CRUD Test Suite
 * 
 * This file contains test cases to verify the CRUD functionality
 * works correctly with the chat AI.
 */

import { executeTool, resetRateLimits } from './toolExecutor';
import { CHAT_TOOLS } from './chatTools';

// Test cases for CRUD operations
export const CRUD_TEST_CASES = [
  // Document Management Tests
  {
    name: "Create Note",
    tool: "create_note",
    args: {
      title: "Test Note",
      content: "This is a test note created by the AI",
      tags: ["test", "ai-generated"]
    },
    expectedSuccess: true
  },
  {
    name: "Create Bookmark",
    tool: "create_bookmark",
    args: {
      title: "Test Bookmark",
      url: "https://example.com",
      description: "A test bookmark"
    },
    expectedSuccess: true
  },
  {
    name: "Search Documents",
    tool: "search_documents",
    args: {
      query: "test",
      limit: 5
    },
    expectedSuccess: true
  },
  {
    name: "List Documents",
    tool: "list_documents",
    args: {
      limit: 10
    },
    expectedSuccess: true
  },
  
  // Fact Management Tests
  {
    name: "Add Fact",
    tool: "add_fact",
    args: {
      category: "preference",
      subject: "test_user",
      fact_text: "Likes testing AI functionality",
      context: "Added during CRUD testing"
    },
    expectedSuccess: true
  },
  {
    name: "Search Facts",
    tool: "search_facts",
    args: {
      query: "testing",
      limit: 5
    },
    expectedSuccess: true
  },
  {
    name: "List Facts",
    tool: "list_facts",
    args: {
      limit: 10
    },
    expectedSuccess: true
  },
  
  // Conversation Management Tests
  {
    name: "Get Chat History",
    tool: "get_chat_history",
    args: {
      limit: 5
    },
    expectedSuccess: true
  },
  
  // Interest Management Tests
  {
    name: "Add Interest",
    tool: "add_interest",
    args: {
      name: "AI Testing",
      category: "Technology",
      description: "Interest in testing AI systems",
      engagement_score: 75
    },
    expectedSuccess: true
  },
  {
    name: "List Interests",
    tool: "list_interests",
    args: {
      limit: 10
    },
    expectedSuccess: true
  },
  
  // Growth Metrics Tests
  {
    name: "Get Growth Status",
    tool: "get_growth_status",
    args: {},
    expectedSuccess: true
  },
  {
    name: "Get Milestones",
    tool: "get_milestones",
    args: {
      achieved_only: true
    },
    expectedSuccess: true
  },
  
  // Utility Tests
  {
    name: "Get User Stats",
    tool: "get_user_stats",
    args: {},
    expectedSuccess: true
  },
  
  // Security Tests (should fail without confirmation)
  {
    name: "Delete Document Without Confirmation",
    tool: "delete_document",
    args: {
      document_id: "test_id"
    },
    expectedSuccess: false
  },
  {
    name: "Delete Fact Without Confirmation",
    tool: "delete_fact",
    args: {
      fact_id: "test_id"
    },
    expectedSuccess: false
  }
];

// Run all test cases
export async function runCRUDTests(): Promise<{
  passed: number;
  failed: number;
  results: Array<{
    name: string;
    success: boolean;
    result: any;
    error?: string;
  }>;
}> {const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const testCase of CRUD_TEST_CASES) {try {
      // Reset rate limits for each test
      resetRateLimits();
      
      const result = await executeTool(testCase.tool, testCase.args);
      
      const success = result.success === testCase.expectedSuccess;
      
      if (success) {passed++;
      } else {failed++;
      }
      
      results.push({
        name: testCase.name,
        success,
        result,
        error: result.error
      });
      
    } catch (error) {failed++;
      
      results.push({
        name: testCase.name,
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }return { passed, failed, results };
}

// Example usage in browser console:
// import { runCRUDTests } from './src/services/crudTest';
// runCRUDTests().then(results =>);
