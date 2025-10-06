import { useState, useEffect } from 'react';

export interface Settings {
  personality: {
    communicationStyle: 'straightforward' | 'warm' | 'witty' | 'academic';
    interactionPreference: 'proactive' | 'reactive' | 'balanced';
  };
  ai: {
    provider: 'openai' | 'ollama' | 'auto';
  };
  ollama: {
    model: string;
    availableModels: string[];
  };
  storage: {
    used: number; // in MB
    total: number; // in MB
  };
}

const defaultSettings: Settings = {
  personality: {
    communicationStyle: 'straightforward',
    interactionPreference: 'balanced',
  },
  ai: {
    provider: 'openai', // Force OpenAI usage
  },
  ollama: {
    model: 'llama3.1:8b-instruct-q8_0',
    availableModels: [],
  },
  storage: {
    used: 0,
    total: 1024, // 1 GB in MB
  },
};

const STORAGE_KEY = 'los-app-settings';

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  }, [settings, isLoading]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const updatePersonality = (updates: Partial<Settings['personality']>) => {
    setSettings(prev => ({
      ...prev,
      personality: { ...prev.personality, ...updates }
    }));
  };

  const updateStorage = (updates: Partial<Settings['storage']>) => {
    setSettings(prev => ({
      ...prev,
      storage: { ...prev.storage, ...updates }
    }));
  };

  const updateAI = (updates: Partial<Settings['ai']>) => {
    setSettings(prev => ({
      ...prev,
      ai: { ...prev.ai, ...updates }
    }));
  };

  const updateOllama = (updates: Partial<Settings['ollama']>) => {
    setSettings(prev => ({
      ...prev,
      ollama: { ...prev.ollama, ...updates }
    }));
  };

  const clearAllData = () => {
    // Clear localStorage data (except settings)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== STORAGE_KEY) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Reset storage usage
    updateStorage({ used: 0 });
  };

  return {
    settings,
    isLoading,
    updateSettings,
    updatePersonality,
    updateAI,
    updateStorage,
    updateOllama,
    clearAllData,
  };
};
