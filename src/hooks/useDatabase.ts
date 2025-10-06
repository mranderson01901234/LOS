import * as db from '../services/db';

export function useDatabase() {
  return {
    conversations: {
      create: db.createConversation,
      get: db.getConversation,
      getAll: db.getAllConversations,
      update: db.updateConversation,
      delete: db.deleteConversation,
    },
    messages: {
      save: db.saveMessage,
      getByConversation: db.getMessagesByConversation,
      getLastN: db.getLastNMessages,
      delete: db.deleteMessage,
    },
    documents: {
      save: db.saveDocument,
      get: db.getDocument,
      getAll: db.getAllDocuments,
      delete: db.deleteDocument,
    },
    facts: {
      save: db.saveFact,
      get: db.getFact,
      getAll: db.getAllFacts,
      getByCategory: db.getFactsByCategory,
      update: db.updateFact,
    },
    interests: {
      save: db.saveInterest,
      getAll: db.getAllInterests,
      update: db.updateInterest,
    },
    growth: {
      get: db.getGrowthMetrics,
      update: db.updateGrowthMetrics,
    },
    settings: {
      get: db.getSetting,
      set: db.setSetting,
      getAll: db.getAllSettings,
    },
    utility: {
      clearAll: db.clearAllData,
      export: db.exportData,
      import: db.importData,
    },
  };
}

