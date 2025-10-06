# Agent Deletion Debugging Guide

## The Problem
Your LOS agent is having trouble deleting notes from the library. The agent reported:
- `find_documents_to_delete` returned 0 documents
- `list_documents` encountered an error

## The Correct Workflow
The agent should follow this **two-step process**:

### Step 1: Find Documents to Delete
The agent should use `find_documents_to_delete` with these parameters:

```json
{
  "search_query": "note",
  "filter_type": "note", 
  "limit": 20
}
```

**OR** to find ALL notes regardless of content:

```json
{
  "search_query": "",
  "filter_type": "note",
  "limit": 20
}
```

### Step 2: Delete with Confirmation
After finding documents, the agent should use `delete_documents`:

```json
{
  "document_ids": ["id1", "id2", "id3", ...],
  "confirm": false,
  "reason": "user requested deletion of all notes"
}
```

This will show you a preview. Then when you confirm, the agent should call it again with `"confirm": true`.

## Common Issues & Solutions

### Issue 1: Wrong Search Query
**Problem**: Agent uses `search_query: "all notes"` or similar
**Solution**: Use `search_query: "note"` or `search_query: ""` (empty string)

### Issue 2: Missing Filter Type
**Problem**: Agent doesn't specify `filter_type: "note"`
**Solution**: Always include `filter_type: "note"` when looking for notes

### Issue 3: Database Connection Issues
**Problem**: `getAllDocuments()` fails
**Solution**: Check if the database is properly initialized

## Test Commands for Your Agent

Try these exact commands with your agent:

1. **"Find all notes in my library"**
   - Should trigger: `find_documents_to_delete` with `search_query: ""` and `filter_type: "note"`

2. **"Delete all my notes"**
   - Should trigger: `find_documents_to_delete` first, then `delete_documents` after confirmation

3. **"Show me what notes I have"**
   - Should trigger: `find_documents_to_delete` with `filter_type: "note"`

## Debugging Steps

1. **Check if documents exist**: Ask agent "List all documents" or "Show me my library"
2. **Test the find tool**: Ask "Find all notes" and see what it returns
3. **Check the search query**: Make sure agent uses `filter_type: "note"`
4. **Verify database**: Check if IndexedDB is working properly

## Expected Agent Response

When working correctly, the agent should respond like this:

```
I found 10 notes in your library:

1. "Meeting Notes" (note, added 2024-01-15)
   Preview: "Discussed project timeline and deliverables..."

2. "Ideas for Blog Post" (note, added 2024-01-20)
   Preview: "Key points about React hooks and best practices..."

[continues for all 10 notes]

Would you like me to delete these 10 notes? Please confirm by saying "yes" or "confirm".
```

## If Still Not Working

If the agent still can't find documents, the issue might be:

1. **Database not initialized** - Check browser console for IndexedDB errors
2. **Wrong database version** - Ensure database schema is up to date
3. **Agent tool registration** - Verify tools are properly registered
4. **Permission issues** - Check if agent has access to database functions

Try asking your agent: "What tools do you have available for managing documents?" to verify the tools are registered.
