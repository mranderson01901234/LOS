/**
 * LOS Chat Tools - Comprehensive CRUD Access for AI
 * 
 * This file defines all the tools/functions that the chat AI can use
 * to manipulate the user's data through OpenAI's function calling feature.
 */

export const CHAT_TOOLS = [
  // DOCUMENT MANAGEMENT TOOLS
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a new note or document in the user's knowledge base",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title of the note"
          },
          content: {
            type: "string",
            description: "Content of the note"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags to categorize the note (optional)"
          }
        },
        required: ["title", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_bookmark",
      description: "Create a bookmark by saving a URL with title and description",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title of the bookmark"
          },
          url: {
            type: "string",
            description: "URL to bookmark"
          },
          description: {
            type: "string",
            description: "Description of the bookmark (optional)"
          }
        },
        required: ["title", "url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_document",
      description: "Update an existing document's content, title, or metadata",
      parameters: {
        type: "object",
        properties: {
          document_id: {
            type: "string",
            description: "ID of document to update"
          },
          title: {
            type: "string",
            description: "New title (optional)"
          },
          content: {
            type: "string",
            description: "New content (optional)"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "New tags (optional)"
          }
        },
        required: ["document_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_document",
      description: "Delete a document or note from the knowledge base",
      parameters: {
        type: "object",
        properties: {
          document_id: {
            type: "string",
            description: "ID of the document to delete"
          },
          confirmation: {
            type: "string",
            description: "Must be 'yes' to confirm deletion"
          }
        },
        required: ["document_id", "confirmation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_documents",
      description: "Search through all saved documents and notes using semantic search",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 5)"
          },
          type: {
            type: "string",
            enum: ["note", "bookmark", "all"],
            description: "Type of documents to search (default: all)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_documents",
      description: "Get a list of all documents in the knowledge base",
      parameters: {
        type: "object",
        properties: {
          filter_by_tag: {
            type: "string",
            description: "Filter by specific tag (optional)"
          },
          filter_by_type: {
            type: "string",
            enum: ["note", "bookmark", "all"],
            description: "Filter by document type (default: all)"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 20)"
          }
        }
      }
    }
  },

  // FACT MANAGEMENT TOOLS
  {
    type: "function",
    function: {
      name: "add_fact",
      description: "Store a new fact about the user",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["equipment", "preference", "goal", "event", "skill", "person", "place", "other"],
            description: "Category of the fact"
          },
          subject: {
            type: "string",
            description: "Subject of the fact (e.g., 'photography_equipment', 'john_doe')"
          },
          fact_text: {
            type: "string",
            description: "The actual fact"
          },
          context: {
            type: "string",
            description: "Additional context (optional)"
          }
        },
        required: ["category", "subject", "fact_text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_facts",
      description: "Search through user facts by category, subject, or content",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          category: {
            type: "string",
            description: "Filter by category (optional)"
          },
          subject: {
            type: "string",
            description: "Filter by subject (optional)"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 10)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_facts",
      description: "Get a list of all facts about the user",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by category (optional)"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 20)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_fact",
      description: "Update an existing fact",
      parameters: {
        type: "object",
        properties: {
          fact_id: {
            type: "string",
            description: "ID of the fact to update"
          },
          fact_text: {
            type: "string",
            description: "New fact text (optional)"
          },
          context: {
            type: "string",
            description: "New context (optional)"
          }
        },
        required: ["fact_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_fact",
      description: "Delete a fact about the user",
      parameters: {
        type: "object",
        properties: {
          fact_id: {
            type: "string",
            description: "ID of the fact to delete"
          },
          confirmation: {
            type: "string",
            description: "Must be 'yes' to confirm deletion"
          }
        },
        required: ["fact_id", "confirmation"]
      }
    }
  },

  // CONVERSATION MANAGEMENT TOOLS
  {
    type: "function",
    function: {
      name: "get_chat_history",
      description: "Retrieve past conversation history",
      parameters: {
        type: "object",
        properties: {
          conversation_id: {
            type: "string",
            description: "Specific conversation ID (optional)"
          },
          limit: {
            type: "number",
            description: "Number of conversations to retrieve (default: 10)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_conversations",
      description: "Search through conversation history",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 5)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_conversation",
      description: "Delete a conversation and all its messages",
      parameters: {
        type: "object",
        properties: {
          conversation_id: {
            type: "string",
            description: "ID of the conversation to delete"
          },
          confirmation: {
            type: "string",
            description: "Must be 'yes' to confirm deletion"
          }
        },
        required: ["conversation_id", "confirmation"]
      }
    }
  },

  // INTEREST MANAGEMENT TOOLS
  {
    type: "function",
    function: {
      name: "add_interest",
      description: "Add or update a user interest",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the interest"
          },
          category: {
            type: "string",
            description: "Category of the interest"
          },
          description: {
            type: "string",
            description: "Description of the interest (optional)"
          },
          engagement_score: {
            type: "number",
            description: "Engagement score (0-100, optional)"
          }
        },
        required: ["name", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_interests",
      description: "Get a list of all user interests",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by category (optional)"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 20)"
          }
        }
      }
    }
  },

  // GROWTH METRICS TOOLS
  {
    type: "function",
    function: {
      name: "get_growth_status",
      description: "Get current user growth metrics and level information",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_milestones",
      description: "Get user milestones and achievements",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by milestone category (optional)"
          },
          achieved_only: {
            type: "boolean",
            description: "Show only achieved milestones (default: true)"
          }
        }
      }
    }
  },

  // UTILITY TOOLS
  {
    type: "function",
    function: {
      name: "get_user_stats",
      description: "Get comprehensive user statistics",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "export_data",
      description: "Export all user data as JSON",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_summary",
      description: "Create a comprehensive summary of multiple documents and save it as a note",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query to find documents to summarize"
          },
          summary_title: {
            type: "string",
            description: "Title for the summary note"
          },
          summary_type: {
            type: "string",
            enum: ["report", "overview", "analysis", "summary"],
            description: "Type of summary to create"
          }
        },
        required: ["query", "summary_title"]
      }
    }
  }
];

// Tool categories for organization
export const TOOL_CATEGORIES = {
  DOCUMENTS: [
    'create_note',
    'create_bookmark', 
    'update_document',
    'delete_document',
    'search_documents',
    'list_documents'
  ],
  FACTS: [
    'add_fact',
    'search_facts',
    'list_facts',
    'update_fact',
    'delete_fact'
  ],
  CONVERSATIONS: [
    'get_chat_history',
    'search_conversations',
    'delete_conversation'
  ],
  INTERESTS: [
    'add_interest',
    'list_interests'
  ],
  GROWTH: [
    'get_growth_status',
    'get_milestones'
  ],
  UTILITY: [
    'get_user_stats',
    'export_data',
    'create_summary'
  ]
};

// Security levels for different operations
export const TOOL_SECURITY_LEVELS = {
  READ: ['search_documents', 'list_documents', 'search_facts', 'list_facts', 'get_chat_history', 'search_conversations', 'list_interests', 'get_growth_status', 'get_milestones', 'get_user_stats', 'export_data', 'create_summary'],
  WRITE: ['create_note', 'create_bookmark', 'add_fact', 'add_interest', 'update_document', 'update_fact'],
  DESTRUCTIVE: ['delete_document', 'delete_fact', 'delete_conversation']
};

// Rate limiting configuration
export const RATE_LIMITS = {
  MAX_OPERATIONS_PER_MESSAGE: 10,
  MAX_DESTRUCTIVE_OPERATIONS_PER_MESSAGE: 3,
  COOLDOWN_PERIOD_MS: 1000 // 1 second between operations
};
