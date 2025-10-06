import { AgentTool } from './types';

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "search_documents",
    description: "Search through all saved documents using semantic search. Returns relevant documents with similarity scores.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query - can be question or keywords"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 5, max 20)"
        },
        filter_tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional: filter by specific tags"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_document_content",
    description: "Get the full content of a specific document by ID. Use this when you need to read the entire document.",
    input_schema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "The ID of the document to retrieve"
        }
      },
      required: ["document_id"]
    }
  },
  {
    name: "list_documents",
    description: "List all documents with metadata. Can filter by tags or date range.",
    input_schema: {
      type: "object",
      properties: {
        filter_tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags"
        },
        limit: {
          type: "number",
          description: "Max results"
        },
        sort_by: {
          type: "string",
          enum: ["date_added", "title"],
          description: "Sort order"
        }
      }
    }
  },
  {
    name: "inspect_library_structure",
    description: "Get detailed breakdown of what's actually in the library - all tags, types, sources, and sample content. Use this before making organization suggestions.",
    input_schema: {
      type: "object",
      properties: {
        include_all_tags: {
          type: "boolean",
          description: "Include complete list of all tags (not just top 10)"
        },
        include_samples: {
          type: "number",
          description: "Number of sample documents to include (default 20)"
        }
      }
    }
  },
  {
    name: "create_document",
    description: "Create a new document/note in the knowledge base.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Document title"
        },
        content: {
          type: "string",
          description: "Full document content"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization"
        }
      },
      required: ["title", "content"]
    }
  },
  {
    name: "update_document",
    description: "Update an existing document's title, content, or tags.",
    input_schema: {
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
  },
  {
    name: "find_documents_to_delete",
    description: "Find documents that match criteria for potential deletion. Use this to help users identify what they want to delete before actually deleting.",
    input_schema: {
      type: "object",
      properties: {
        search_query: {
          type: "string",
          description: "Search query to find documents (e.g., 'photography tips', 'old bookmarks')"
        },
        filter_tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by specific tags"
        },
        filter_type: {
          type: "string",
          enum: ["url", "file", "note", "conversation", "all"],
          description: "Filter by document type"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 10)"
        }
      },
      required: ["search_query"]
    }
  },
  {
    name: "delete_documents",
    description: "Delete one or more documents after showing user what will be deleted and getting confirmation. ALWAYS show the user what documents will be deleted before asking for confirmation.",
    input_schema: {
      type: "object",
      properties: {
        document_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of document IDs to delete"
        },
        confirm: {
          type: "boolean",
          description: "Must be true to execute deletion. Only set to true after user has explicitly confirmed they want to delete the documents."
        },
        reason: {
          type: "string",
          description: "Optional reason for deletion (e.g., 'duplicate', 'outdated', 'user requested')"
        }
      },
      required: ["document_ids", "confirm"]
    }
  },
  {
    name: "search_facts",
    description: "Search through stored facts about the user.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query"
        },
        category: {
          type: "string",
          enum: ["equipment", "preference", "goal", "event", "skill", "all"],
          description: "Filter by category"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "add_facts",
    description: "Add one or more facts about the user to the knowledge base.",
    input_schema: {
      type: "object",
      properties: {
        facts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["equipment", "preference", "goal", "event", "skill"]
              },
              subject: { type: "string" },
              fact_text: { type: "string" },
              context: { type: "string" }
            },
            required: ["category", "subject", "fact_text"]
          },
          description: "Array of facts to add"
        }
      },
      required: ["facts"]
    }
  },
  {
    name: "get_user_context",
    description: "Get comprehensive user context including growth level, interests, and key facts.",
    input_schema: {
      type: "object",
      properties: {
        include_growth: {
          type: "boolean",
          description: "Include growth metrics"
        },
        include_interests: {
          type: "boolean",
          description: "Include interest analysis"
        },
        include_facts: {
          type: "boolean",
          description: "Include user facts"
        }
      }
    }
  },
  {
    name: "analyze_content_patterns",
    description: "Analyze patterns in the user's saved content to understand their interests, knowledge gaps, and learning trajectory. Use this to provide personalized recommendations and identify areas where web search could provide valuable new information. Essential for understanding user context before providing recommendations.",
    input_schema: {
      type: "object",
      properties: {
        analysis_type: {
          type: "string",
          enum: ["topics", "timeline", "connections", "gaps"],
          description: "Type of analysis to perform"
        },
        scope: {
          type: "string",
          description: "Limit analysis (e.g., 'photography', 'last_month')"
        }
      },
      required: ["analysis_type"]
    }
  },
  {
    name: "search_conversations",
    description: "Search through past conversation history.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to search for in conversations"
        },
        limit: {
          type: "number",
          description: "Max results"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "create_study_plan",
    description: "Generate a structured learning plan based on saved content and user goals.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Topic to create plan for"
        },
        duration: {
          type: "string",
          description: "Timeline (e.g., '2 weeks', '1 month')"
        },
        current_level: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description: "User's current level"
        }
      },
      required: ["topic"]
    }
  },
  {
    name: "search_memory",
    description: "Search through conversation history across all time periods, including archived conversations. Use when user asks 'remember when' or references past discussions.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to search for in past conversations"
        },
        timeframe: {
          type: "string",
          enum: ["recent", "all"],
          description: "Search recent (last month) or all conversations including archived"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_proactive_suggestions",
    description: "Get proactive suggestions for improving the user's knowledge base and learning experience. Use this to offer helpful recommendations.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of suggestions to return (default 5)"
        }
      }
    }
  },
  {
    name: "execute_suggestion",
    description: "Execute a proactive suggestion to help the user. Use this when the user wants to act on a suggestion.",
    input_schema: {
      type: "object",
      properties: {
        suggestion_id: {
          type: "string",
          description: "The ID of the suggestion to execute"
        }
      },
      required: ["suggestion_id"]
    }
  },
  {
    name: "navigate_to_route",
    description: "Navigate to a specific route in the application (e.g., '/library', '/settings', '/chat').",
    input_schema: {
      type: "object",
      properties: {
        route: {
          type: "string",
          description: "The route to navigate to (e.g., '/library', '/settings')"
        }
      },
      required: ["route"]
    }
  },
  {
    name: "open_library_with_filter",
    description: "Open the Library with a specific filter applied (by type, tags, or search query).",
    input_schema: {
      type: "object",
      properties: {
        filter: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["note", "url", "file", "conversation"],
              description: "Filter by document type"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by specific tags"
            },
            search: {
              type: "string",
              description: "Search query to filter documents"
            }
          }
        }
      },
      required: ["filter"]
    }
  },
  {
    name: "show_notification",
    description: "Show a notification to the user with a title and message.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Notification title"
        },
        message: {
          type: "string",
          description: "Notification message"
        },
        type: {
          type: "string",
          enum: ["info", "success", "warning", "error"],
          description: "Notification type (default: info)"
        }
      },
      required: ["title", "message"]
    }
  },
  {
    name: "search_library",
    description: "Perform a search in the Library interface.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "search_web",
    description: "Search the web for current information, research, news, and up-to-date data. This is your primary tool for accessing real-time information. Use this tool automatically when users ask about current events, recent developments, or any topic requiring up-to-date information. Always combine web search results with analysis and actionable recommendations. Search strategically with multiple queries for comprehensive coverage.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for web search - be specific and targeted"
        },
        num_results: {
          type: "number",
          description: "Number of results to return (default 5, max 10)"
        }
      },
      required: ["query"]
    }
  }
];

