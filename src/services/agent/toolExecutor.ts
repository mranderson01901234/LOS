import {
  getAllDocuments,
  saveDocument,
  updateDocument,
  deleteDocument,
  getAllFacts,
  saveFact,
  getAllConversations,
  getConversation
} from '../db';
import { semanticSearch } from '../semanticSearch';
import { GrowthService } from '../growthService';
import { getTopInterests } from '../interestService';
import { v4 as uuidv4 } from 'uuid';
import { ProactiveAssistant } from '../proactiveAssistant';
import { UIAutomationLayer } from '../uiAutomation';

export async function executeAgentTool(toolName: string, toolInput: any): Promise<any> {
  try {
    switch (toolName) {

      case "search_documents": {
        const results = await semanticSearch(
          toolInput.query,
          toolInput.limit || 5
        );

        let filtered = results;
        if (toolInput.filter_tags?.length > 0) {
          filtered = results.filter(r =>
            toolInput.filter_tags.some((tag: string) =>
              r.documentTitle?.toLowerCase().includes(tag.toLowerCase())
            )
          );
        }

        return {
          success: true,
          results: filtered.map(r => ({
            id: r.documentId,
            title: r.documentTitle,
            snippet: r.chunk.text.substring(0, 300),
            similarity: r.similarity,
            url: r.documentUrl
          })),
          count: filtered.length
        };
      }

      case "get_document_content": {
        const docs = await getAllDocuments();
        const doc = docs.find(d => d.id === toolInput.document_id);

        if (!doc) {
          return { success: false, error: "Document not found" };
        }

        return {
          success: true,
          document: {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            tags: doc.tags,
            date_added: doc.date_added,
            url: doc.url
          }
        };
      }

      case "list_documents": {
        const docs = await getAllDocuments();
        let filtered = docs;

        if (toolInput.filter_tags?.length > 0) {
          filtered = docs.filter(d =>
            toolInput.filter_tags.some((tag: string) =>
              d.tags?.includes(tag)
            )
          );
        }

        if (toolInput.sort_by === 'date_added') {
          filtered.sort((a, b) =>
            new Date(b.date_added).getTime() -
            new Date(a.date_added).getTime()
          );
        } else if (toolInput.sort_by === 'title') {
          filtered.sort((a, b) => a.title.localeCompare(b.title));
        }

        if (toolInput.limit) {
          filtered = filtered.slice(0, toolInput.limit);
        }

        return {
          success: true,
          documents: filtered.map(d => ({
            id: d.id,
            title: d.title,
            type: d.type,
            tags: d.tags || [],
            date_added: d.date_added,
            url: d.url
          })),
          count: filtered.length
        };
      }

      case "create_document": {
        const docId = uuidv4();
        await saveDocument({
          id: docId,
          type: 'note',
          title: toolInput.title,
          content: toolInput.content,
          url: '',
          date_added: new Date().toISOString(),
          tags: toolInput.tags || [],
          isProcessed: false
        });

        return {
          success: true,
          message: `Created document "${toolInput.title}"`,
          document_id: docId
        };
      }

      case "update_document": {
        const docs = await getAllDocuments();
        const doc = docs.find(d => d.id === toolInput.document_id);

        if (!doc) {
          return { success: false, error: "Document not found" };
        }

        await updateDocument(toolInput.document_id, {
          ...doc,
          title: toolInput.title || doc.title,
          content: toolInput.content || doc.content,
          tags: toolInput.tags || doc.tags
        });

        return {
          success: true,
          message: `Updated document "${doc.title}"`
        };
      }

      case "find_documents_to_delete": {
        const docs = await getAllDocuments();
        let filteredDocs = docs;

        // Filter by search query
        if (toolInput.search_query) {
          const query = toolInput.search_query.toLowerCase();
          filteredDocs = filteredDocs.filter(doc =>
            doc.title.toLowerCase().includes(query) ||
            doc.content.toLowerCase().includes(query) ||
            (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query)))
          );
        }

        // Filter by tags
        if (toolInput.filter_tags && toolInput.filter_tags.length > 0) {
          filteredDocs = filteredDocs.filter(doc =>
            doc.tags && toolInput.filter_tags.some((tag: string) =>
              doc.tags!.includes(tag)
            )
          );
        }

        // Filter by type
        if (toolInput.filter_type && toolInput.filter_type !== 'all') {
          filteredDocs = filteredDocs.filter(doc => doc.type === toolInput.filter_type);
        }

        // Limit results
        const limit = toolInput.limit || 10;
        filteredDocs = filteredDocs.slice(0, limit);

        return {
          success: true,
          documents: filteredDocs.map(doc => ({
            id: doc.id,
            title: doc.title,
            type: doc.type,
            date_added: doc.date_added,
            tags: doc.tags || [],
            preview: doc.content.substring(0, 150) + (doc.content.length > 150 ? '...' : ''),
            url: doc.url
          })),
          count: filteredDocs.length,
          message: `Found ${filteredDocs.length} document(s) matching your criteria`
        };
      }

      case "delete_documents": {
        if (!toolInput.confirm) {
          // Show user what will be deleted before asking for confirmation
          const docs = await getAllDocuments();
          const documentsToDelete = docs.filter(doc =>
            toolInput.document_ids.includes(doc.id)
          );

          if (documentsToDelete.length === 0) {
            return {
              success: false,
              error: "No documents found with the provided IDs"
            };
          }

          return {
            success: false,
            requires_confirmation: true,
            documents_to_delete: documentsToDelete.map(doc => ({
              id: doc.id,
              title: doc.title,
              type: doc.type,
              date_added: doc.date_added,
              tags: doc.tags || [],
              preview: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : '')
            })),
            message: `I found ${documentsToDelete.length} document(s) to delete. Please confirm by saying "yes" or "confirm" to proceed with deletion.`,
            reason: toolInput.reason || 'user requested'
          };
        }

        // User has confirmed, proceed with deletion
        const docs = await getAllDocuments();
        const documentsToDelete = docs.filter(doc =>
          toolInput.document_ids.includes(doc.id)
        );

        const deletedTitles: string[] = [];
        const errors: string[] = [];

        for (const id of toolInput.document_ids) {
          try {
            const doc = documentsToDelete.find(d => d.id === id);
            if (doc) {
              await deleteDocument(id);
              deletedTitles.push(doc.title);
            } else {
              errors.push(`Document with ID ${id} not found`);
            }
          } catch (error) {
            errors.push(`Failed to delete document ${id}: ${error}`);
          }
        }

        return {
          success: true,
          deleted_count: deletedTitles.length,
          deleted_titles: deletedTitles,
          errors: errors.length > 0 ? errors : undefined,
          message: `Successfully deleted ${deletedTitles.length} document(s): ${deletedTitles.join(', ')}`
        };
      }

      case "search_facts": {
        const facts = await getAllFacts();
        const query = toolInput.query.toLowerCase();

        let filtered = facts.filter(f => f.status === 'active');

        if (toolInput.category && toolInput.category !== 'all') {
          filtered = filtered.filter(f => f.category === toolInput.category);
        }

        filtered = filtered.filter(f =>
          f.fact_text.toLowerCase().includes(query) ||
          f.subject.toLowerCase().includes(query)
        );

        return {
          success: true,
          facts: filtered.map(f => ({
            id: f.id,
            category: f.category,
            subject: f.subject,
            fact_text: f.fact_text,
            context: f.context,
            confidence: f.confidence
          })),
          count: filtered.length
        };
      }

      case "add_facts": {
        const addedFacts = [];

        for (const fact of toolInput.facts) {
          const factId = uuidv4();
          await saveFact({
            id: factId,
            category: fact.category,
            subject: fact.subject,
            fact_text: fact.fact_text,
            context: fact.context || '',
            confidence: 0.9,
            source_id: 'agent_added',
            date_created: new Date().toISOString(),
            date_updated: new Date().toISOString(),
            status: 'active',
            relationships: []
          });
          addedFacts.push(factId);
        }

        return {
          success: true,
          message: `Added ${addedFacts.length} fact(s)`,
          fact_ids: addedFacts
        };
      }

      case "get_user_context": {
        const context: any = {};

        if (toolInput.include_growth !== false) {
          const growth = await GrowthService.getGrowthState();
          const stage = GrowthService.getStage(growth.level);
          context.growth = {
            level: growth.level,
            stage,
            conversations: growth.conversationCount,
            documents: growth.documentCount,
            facts: growth.factCount,
            days_active: growth.daysActive
          };
        }

        if (toolInput.include_interests !== false) {
          const interests = await getTopInterests(5);
          context.interests = interests.map(i => ({
            name: i.name,
            engagement_score: i.engagement_score,
            content_count: i.content_count
          }));
        }

        if (toolInput.include_facts !== false) {
          const facts = await getAllFacts();
          const activeFacts = facts
            .filter(f => f.status === 'active')
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10);
          context.key_facts = activeFacts.map(f => ({
            category: f.category,
            subject: f.subject,
            fact_text: f.fact_text
          }));
        }

        return {
          success: true,
          context
        };
      }

      case "analyze_content_patterns": {
        const docs = await getAllDocuments();

        // Simple pattern analysis
        const analysis: any = {};

        if (toolInput.analysis_type === 'topics') {
          const tagCounts: Record<string, number> = {};
          docs.forEach(d => {
            d.metadata.tags?.forEach((tag: string) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          });

          analysis.top_topics = Object.entries(tagCounts)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
        }

        if (toolInput.analysis_type === 'timeline') {
          const byMonth: Record<string, number> = {};
          docs.forEach(d => {
            const month = new Date(d.metadata.date_added)
              .toISOString()
              .slice(0, 7);
            byMonth[month] = (byMonth[month] || 0) + 1;
          });

          analysis.timeline = Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({ month, count }));
        }

        return {
          success: true,
          analysis
        };
      }

      case "search_conversations": {
        const conversations = await getAllConversations();
        const query = toolInput.query.toLowerCase();

        const matches = conversations
          .filter(c =>
            c.messages.some(m =>
              m.content.toLowerCase().includes(query)
            )
          )
          .slice(-(toolInput.limit || 5));

        return {
          success: true,
          conversations: matches.map(c => ({
            id: c.id,
            created_at: c.created_at,
            message_count: c.messages.length,
            preview: c.messages[0]?.content.substring(0, 150)
          })),
          count: matches.length
        };
      }

      case "create_study_plan": {
        // This would be more sophisticated in production
        // For now, return a structured plan

        const docs = await semanticSearch(toolInput.topic, 20);

        return {
          success: true,
          plan: {
            topic: toolInput.topic,
            duration: toolInput.duration || '1 month',
            level: toolInput.current_level || 'intermediate',
            resources_found: docs.length,
            phases: [
              {
                week: 1,
                focus: `Introduction to ${toolInput.topic}`,
                resources: docs.slice(0, 5).map(d => d.documentTitle)
              },
              {
                week: 2,
                focus: `Core concepts`,
                resources: docs.slice(5, 10).map(d => d.documentTitle)
              },
              {
                week: 3,
                focus: `Advanced topics`,
                resources: docs.slice(10, 15).map(d => d.documentTitle)
              },
              {
                week: 4,
                focus: `Practice and application`,
                resources: docs.slice(15, 20).map(d => d.documentTitle)
              }
            ]
          }
        };
      }

      case "inspect_library_structure": {
        const docs = await getAllDocuments();

        // Collect ALL tags
        const allTags = new Set<string>();
        const tagDocs: Record<string, string[]> = {};

        docs.forEach(doc => {
          doc.tags?.forEach(tag => {
            allTags.add(tag);
            if (!tagDocs[tag]) tagDocs[tag] = [];
            tagDocs[tag].push(doc.title);
          });
        });

        const tagAnalysis = Array.from(allTags).map(tag => ({
          tag,
          count: tagDocs[tag].length,
          sample_docs: tagDocs[tag].slice(0, 3)
        })).sort((a, b) => b.count - a.count);

        // Sample documents
        const sampleCount = toolInput.include_samples || 20;
        const samples = docs.slice(0, sampleCount).map(d => ({
          title: d.title,
          type: d.type,
          tags: d.tags || [],
          source: d.interest_category || 'uncategorized',
          date: d.date_added
        }));

        return {
          success: true,
          analysis: {
            total_documents: docs.length,
            all_tags: toolInput.include_all_tags ? tagAnalysis : tagAnalysis.slice(0, 20),
            unique_tags: allTags.size,
            sample_documents: samples,
            types: Object.entries(
              docs.reduce((acc, d) => {
                acc[d.type] = (acc[d.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
          }
        };
      }

      case "search_memory": {
        const { MemoryManager } = await import('../memory/memoryManager');
        const memoryManager = new MemoryManager();

        const results = await memoryManager.searchMemories(
          toolInput.query,
          toolInput.timeframe
        );

        return {
          success: true,
          matches: results.map(c => ({
            date: new Date(c.created_at).toLocaleDateString(),
            summary: c.metadata?.compressed
              ? c.messages[0]?.content
              : c.messages.slice(0, 3).map((m: any) =>
                  `${m.role}: ${m.content.substring(0, 150)}...`
                ).join('\n')
          })),
          count: results.length
        };
      }

      case "get_proactive_suggestions": {
        const limit = toolInput.limit || 5;
        const suggestions = await ProactiveAssistant.generateSuggestions();
        
        return {
          success: true,
          suggestions: suggestions.slice(0, limit).map(s => ({
            id: s.id,
            type: s.type,
            title: s.title,
            description: s.description,
            priority: s.priority,
            estimatedTime: s.estimatedTime,
            actionRequired: s.actionRequired
          })),
          count: suggestions.length,
          message: `Generated ${suggestions.length} proactive suggestions`
        };
      }

      case "execute_suggestion": {
        const suggestions = await ProactiveAssistant.generateSuggestions();
        const suggestion = suggestions.find(s => s.id === toolInput.suggestion_id);
        
        if (!suggestion) {
          return {
            success: false,
            error: `Suggestion with ID "${toolInput.suggestion_id}" not found`
          };
        }
        
        const result = await ProactiveAssistant.executeSuggestion(suggestion);
        
        return {
          success: result.success,
          message: result.message,
          data: result.data,
          suggestion: {
            id: suggestion.id,
            title: suggestion.title,
            type: suggestion.type
          }
        };
      }

      case "navigate_to_route": {
        const result = await UIAutomationLayer.navigateToRoute(toolInput.route);
        
        return {
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error
        };
      }

      case "open_library_with_filter": {
        const result = await UIAutomationLayer.openLibraryWithFilter(toolInput.filter);
        
        return {
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error
        };
      }

      case "show_notification": {
        const result = await UIAutomationLayer.showNotification(
          toolInput.title,
          toolInput.message,
          toolInput.type || 'info'
        );
        
        return {
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error
        };
      }

      case "search_library": {
        const result = await UIAutomationLayer.searchLibrary(toolInput.query);
        
        return {
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error
        };
      }

      case "search_web": {
        // WEB SEARCH TOOL CALLED
        const { searchWeb } = await import('../webSearch');
        
        try {
          const numResults = Math.min(toolInput.num_results || 5, 10);
          const results = await searchWeb(toolInput.query, numResults);
          
          return {
            success: true,
            message: `Found ${results.length} web search results for "${toolInput.query}"`,
            data: {
              query: toolInput.query,
              results: results.map(result => ({
                title: result.title,
                url: result.url,
                description: result.description
              })),
              count: results.length
            }
          };
        } catch (error: any) {
          console.error('🔍 Web search error:', error);
          return {
            success: false,
            error: `Web search failed: ${error.message}`
          };
        }
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Tool execution failed: ${error.message}`
    };
  }
}

