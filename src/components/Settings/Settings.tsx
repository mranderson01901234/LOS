import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { toast } from 'react-hot-toast';
import { Trash2, Download, Upload, AlertTriangle, RefreshCw, Globe } from 'lucide-react';
import { getModels, checkPreferredModel } from '../../services/ollama';
import { getSearchUsage } from '../../services/webSearch';
import { getSetting, setSetting } from '../../services/db';

const Settings: React.FC = () => {
  const { settings, updatePersonality, updateAI, updateStorage, updateOllama, clearAllData, isLoading } = useSettings();
  const [showClearModal, setShowClearModal] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [braveApiKey, setBraveApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [searchUsage, setSearchUsage] = useState(0);
  const [searchProvider, setSearchProvider] = useState('free');

  const handlePersonalityChange = (field: keyof typeof settings.personality, value: string) => {
    updatePersonality({ [field]: value });
    toast.success('Settings saved');
  };

  const handleModelChange = (model: string) => {
    updateOllama({ model });
    toast.success('Model updated');
  };

  const refreshModels = async () => {
    setIsRefreshingModels(true);
    try {
      const models = await getModels();
      updateOllama({ availableModels: models });
      
      if (models.length === 0) {
        toast.error('No models found. Install Ollama and pull a model.');
      } else {
        toast.success(`Found ${models.length} models`);
      }
    } catch (error) {
      toast.error('Failed to refresh models');
    } finally {
      setIsRefreshingModels(false);
    }
  };

  // Load models and web search settings on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await getModels();
        updateOllama({ availableModels: models });
        
        // Check if current model is still available
        if (settings.ollama.model && !models.includes(settings.ollama.model)) {
          const preferred = await checkPreferredModel();
          if (preferred.available) {
            updateOllama({ model: preferred.model });
            if (preferred.suggestion) {
              toast(preferred.suggestion, { duration: 5000 });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    const loadWebSearchSettings = async () => {
      try {
        const braveKey = await getSetting('brave_search_api_key');
        const googleKey = await getSetting('google_search_api_key');
        const openaiKey = await getSetting('openai_api_key');
        const enabled = await getSetting('web_search_enabled');
        const provider = await getSetting('search_provider') || 'free';
        const usage = await getSearchUsage();
        
        if (braveKey) setBraveApiKey(braveKey);
        if (googleKey) setGoogleApiKey(googleKey);
        if (openaiKey) setOpenaiApiKey(openaiKey);
        if (enabled) setWebSearchEnabled(enabled);
        setSearchProvider(provider);
        setSearchUsage(usage);
      } catch (error) {
        console.error('Failed to load web search settings:', error);
      }
    };
    
    loadModels();
    loadWebSearchSettings();
  }, []);

  const handleClearData = () => {
    clearAllData();
    setShowClearModal(false);
    toast.success('All data cleared');
  };

  const handleExportData = () => {
    toast('Coming soon', { icon: '📦' });
  };

  const handleImportData = () => {
    toast('Coming soon', { icon: '📦' });
  };

  const formatStorageSize = (sizeInMB: number) => {
    if (sizeInMB < 1024) {
      return `${sizeInMB} MB`;
    }
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  };

  const storagePercentage = (settings.storage.used / settings.storage.total) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-secondary mx-auto mb-4"></div>
          <p className="text-text-tertiary">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-heading-1 mb-3">Settings</h1>
        <p className="text-body text-text-secondary">Customize your LOS experience</p>
      </div>
      
      <div className="space-y-8">
        {/* Personality Configuration */}
        <div className="card p-8">
          <h2 className="text-heading-3 mb-6">Personality Configuration</h2>
          
          <div className="space-y-8">
            {/* Communication Style */}
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-3">
                Communication Style
              </label>
              <select
                value={settings.personality.communicationStyle}
                onChange={(e) => handlePersonalityChange('communicationStyle', e.target.value)}
                className="input-primary w-full"
              >
                <option value="straightforward">Straightforward</option>
                <option value="warm">Warm & Conversational</option>
                <option value="witty">Witty & Playful</option>
                <option value="academic">Academic</option>
              </select>
            </div>

            {/* Interaction Preference */}
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-4">
                Interaction Preference
              </label>
              <div className="space-y-3">
                {[
                  { value: 'proactive', label: 'Proactive' },
                  { value: 'reactive', label: 'Reactive' },
                  { value: 'balanced', label: 'Balanced' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="interactionPreference"
                      value={option.value}
                      checked={settings.personality.interactionPreference === option.value}
                      onChange={(e) => handlePersonalityChange('interactionPreference', e.target.value)}
                      className="mr-4 text-border-focus focus:ring-border-focus"
                    />
                    <span className="text-text-primary group-hover:text-text-primary transition-colors">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Provider Selection */}
        <div className="card p-8">
          <h2 className="text-heading-3 mb-6">AI Provider</h2>
          
          <div className="space-y-6">
            {/* AI Provider Selection */}
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-3">
                Preferred AI Provider
              </label>
              <select
                value={settings.ai.provider}
                onChange={(e) => {
                  updateAI({ provider: e.target.value as 'openai' | 'ollama' | 'auto' });
                  toast.success('AI provider updated');
                }}
                className="input-primary w-full"
              >
                <option value="openai">OpenAI (Recommended)</option>
                <option value="ollama">Ollama (Free, Local)</option>
                <option value="auto">Auto (Smart Selection)</option>
              </select>
              <p className="text-caption text-text-tertiary mt-2">
                Choose your preferred AI provider. OpenAI provides the best quality responses, while Ollama runs locally for free.
              </p>
            </div>

            {/* Provider Status */}
            <div className="bg-bg-elevated rounded-lg p-6">
              <h3 className="text-heading-4 mb-4">Provider Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">OpenAI</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    openaiApiKey ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
                  }`}>
                    {openaiApiKey ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Ollama</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    settings.ollama.availableModels.length > 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
                  }`}>
                    {settings.ollama.availableModels.length > 0 ? 'Available' : 'Not Available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ollama Model Configuration */}
        <div className="card p-8">
          <h2 className="text-heading-3 mb-6">AI Model Configuration</h2>
          
          <div className="space-y-6">
            {/* Model Selection */}
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-3">
                Ollama Model
              </label>
              <div className="flex space-x-3">
                <select
                  value={settings.ollama.model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="input-primary flex-1"
                >
                  {settings.ollama.availableModels.length > 0 ? (
                    settings.ollama.availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))
                  ) : (
                    <option value="">No models available</option>
                  )}
                </select>
                <button
                  onClick={refreshModels}
                  disabled={isRefreshingModels}
                  className="btn-secondary flex items-center px-4 py-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingModels ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-caption text-text-tertiary mt-2">
                Recommended: llama3.1:8b-instruct-q8_0 for best conversational experience
              </p>
            </div>

            {/* Model Setup Instructions */}
            <div className="bg-bg-elevated rounded-lg p-6">
              <h3 className="text-heading-4 mb-4">Recommended Model Setup</h3>
              <p className="text-text-secondary mb-4">
                For best conversational experience, install an instruct model:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-text-primary">Recommended:</div>
                    <code className="text-sm bg-bg-primary px-2 py-1 rounded">ollama pull llama3.1:8b-instruct-q8_0</code>
                    <div className="text-caption text-text-tertiary">~4.7GB - Best balance of speed and quality</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-text-primary">Fast alternative:</div>
                    <code className="text-sm bg-bg-primary px-2 py-1 rounded">ollama pull mistral:7b-instruct</code>
                    <div className="text-caption text-text-tertiary">~4.1GB - Excellent conversational abilities</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-text-primary">Premium (requires 32GB+ RAM):</div>
                    <code className="text-sm bg-bg-primary px-2 py-1 rounded">ollama pull llama3.1:70b-instruct-q4_0</code>
                    <div className="text-caption text-text-tertiary">~40GB - Best quality, slower</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Web Search Configuration */}
        <div className="card p-8">
          <h2 className="text-heading-3 mb-6 flex items-center">
            <Globe className="w-5 h-5 mr-3 text-text-secondary" />
            Web Search
          </h2>
          
          <div className="space-y-6">
            {/* Search Provider Selection */}
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-3">
                Search Provider
              </label>
              <select
                value={searchProvider}
                onChange={async (e) => {
                  setSearchProvider(e.target.value);
                  await setSetting('search_provider', e.target.value);
                  toast.success('Search provider updated');
                }}
                className="input-primary w-full"
              >
                <option value="free">Free APIs (DuckDuckGo + Wikipedia)</option>
                <option value="brave">Brave Search API</option>
                <option value="google">Google Search API (Serper.dev)</option>
                <option value="auto">Auto (Try premium, fallback to free)</option>
              </select>
              <p className="text-caption text-text-tertiary mt-2">
                Choose your preferred search provider. Premium APIs provide better results but require API keys.
              </p>
            </div>

            {/* Premium API Notice */}
            {(searchProvider === 'brave' || searchProvider === 'google' || searchProvider === 'auto') && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-yellow-400 mb-2">Premium APIs Require Rust Update</div>
                    <div className="text-caption text-text-tertiary mb-3">
                      Premium search APIs (Brave Search & Google Search) require Rust 1.80+ to work properly. 
                      Currently using Rust 1.75.0. The app will fallback to free APIs until Rust is updated.
                    </div>
                    <div className="text-xs text-text-tertiary">
                      To enable premium APIs: <code className="bg-bg-primary px-2 py-1 rounded">rustup update</code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Brave Search API Key */}
            {searchProvider === 'brave' || searchProvider === 'auto' ? (
              <div>
                <label className="block text-caption font-medium text-text-secondary mb-3">
                  Brave Search API Key
                </label>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={braveApiKey}
                    onChange={(e) => setBraveApiKey(e.target.value)}
                    placeholder="Enter your Brave Search API key"
                    className="input-primary w-full"
                  />
                  <button
                    onClick={async () => {
                      await setSetting('brave_search_api_key', braveApiKey);
                      toast.success('Brave API key saved');
                    }}
                    className="btn-secondary px-4 py-2"
                  >
                    Save API Key
                  </button>
                  <div className="bg-bg-elevated rounded-lg p-4 border border-border-primary">
                    <p className="text-text-primary font-medium mb-2">Brave Search API</p>
                    <p className="text-caption text-text-tertiary mb-3">
                      Get your API key from <a href="https://brave.com/search/api/" target="_blank" rel="noopener noreferrer" className="text-border-focus hover:underline">brave.com/search/api</a>
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-text-secondary">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span>Free tier: 2000 queries/month</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Google Search API Key */}
            {searchProvider === 'google' || searchProvider === 'auto' ? (
              <div>
                <label className="block text-caption font-medium text-text-secondary mb-3">
                  Google Search API Key (Serper.dev)
                </label>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    placeholder="Enter your Serper.dev API key"
                    className="input-primary w-full"
                  />
                  <button
                    onClick={async () => {
                      await setSetting('google_search_api_key', googleApiKey);
                      toast.success('Google API key saved');
                    }}
                    className="btn-secondary px-4 py-2"
                  >
                    Save API Key
                  </button>
                  <div className="bg-bg-elevated rounded-lg p-4 border border-border-primary">
                    <p className="text-text-primary font-medium mb-2">Serper.dev (Google Search)</p>
                    <p className="text-caption text-text-tertiary mb-3">
                      Get your API key from <a href="https://serper.dev/" target="_blank" rel="noopener noreferrer" className="text-border-focus hover:underline">serper.dev</a>
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-text-secondary">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span>Free tier: $50 credit</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* OpenAI API Key */}
            <div>
              <label className="block text-caption font-medium text-text-secondary mb-3">
                OpenAI API Key
              </label>
              <div className="space-y-3">
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="Enter your OpenAI API key"
                  className="input-primary w-full"
                />
                <button
                  onClick={async () => {
                    await setSetting('openai_api_key', openaiApiKey);
                    toast.success('OpenAI API key saved');
                  }}
                  className="btn-secondary px-4 py-2"
                >
                  Save API Key
                </button>
                <div className="bg-bg-elevated rounded-lg p-4 border border-border-primary">
                  <p className="text-text-primary font-medium mb-2">OpenAI GPT-4o-mini</p>
                  <p className="text-caption text-text-tertiary mb-3">
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-border-focus hover:underline">OpenAI Platform</a>
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-text-secondary">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    <span>Cost-effective model with excellent performance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enable Web Search */}
            <div>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={webSearchEnabled}
                  onChange={async (e) => {
                    setWebSearchEnabled(e.target.checked);
                    await setSetting('web_search_enabled', e.target.checked);
                    toast.success(e.target.checked ? 'Web search enabled' : 'Web search disabled');
                  }}
                  className="mr-4 text-border-focus focus:ring-border-focus"
                />
                <span className="text-text-primary group-hover:text-text-primary transition-colors">
                  Web search (Always enabled)
                </span>
              </label>
              <p className="text-caption text-text-tertiary mt-2 ml-8">
                LOS uses smart routing to search the web when needed for current information and real-time data. This setting controls the toggle but web search is enabled by default.
              </p>
            </div>

            {/* Usage Stats */}
            {webSearchEnabled && (
              <div className="bg-bg-elevated rounded-lg p-6">
                <h3 className="text-heading-4 mb-4">Usage Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-text-primary font-medium">Searches this month:</span>
                    <span className="text-text-secondary">{searchUsage}</span>
                  </div>
                  
                  <div className="w-full bg-bg-primary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                  
                  <p className="text-caption text-text-tertiary">
                    {searchProvider === 'free' ? 'Unlimited searches with free APIs' : 'Track usage with premium APIs'}
                  </p>
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            <div className="bg-bg-elevated rounded-lg p-6">
              <h3 className="text-heading-4 mb-4">How It Works</h3>
              <div className="space-y-3">
                {searchProvider === 'free' ? (
                  <>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-text-primary">DuckDuckGo Instant Answers:</div>
                        <div className="text-caption text-text-tertiary">
                          Provides instant answers for factual queries, weather, definitions, etc.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-text-primary">Wikipedia API:</div>
                        <div className="text-caption text-text-tertiary">
                          Fallback for detailed information on topics and concepts
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-text-primary">Premium Search APIs:</div>
                        <div className="text-caption text-text-tertiary">
                          High-quality search results with better accuracy and more comprehensive data
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-text-primary">Automatic Fallback:</div>
                        <div className="text-caption text-text-tertiary">
                          If premium APIs fail, automatically falls back to free APIs
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-text-primary">No Setup Required for Free:</div>
                    <div className="text-caption text-text-tertiary">
                      Free APIs work immediately. Premium APIs require API keys for better results.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="card p-8">
          <h2 className="text-heading-3 mb-6">Storage</h2>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-text-primary font-medium">
                {formatStorageSize(settings.storage.used)} / {formatStorageSize(settings.storage.total)}
              </span>
              <span className="text-caption">
                {storagePercentage.toFixed(1)}% used
              </span>
            </div>
            
            <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-text-secondary to-text-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              ></div>
            </div>
            
            <button
              onClick={() => setShowClearModal(true)}
              className="btn-secondary flex items-center px-6 py-3 text-red-400 border-red-400 hover:bg-red-400 hover:text-bg-primary transition-all duration-200"
            >
              <Trash2 className="w-4 h-4 mr-3" />
              Clear all data
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="card p-8">
          <h2 className="text-heading-3 mb-6">Data Management</h2>
          
          <div className="flex space-x-4">
            <button
              onClick={handleExportData}
              className="btn-secondary flex items-center"
            >
              <Download className="w-4 h-4 mr-3" />
              Export data
            </button>
            
            <button
              onClick={handleImportData}
              className="btn-secondary flex items-center"
            >
              <Upload className="w-4 h-4 mr-3" />
              Import data
            </button>
          </div>
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-bg-primary bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card-elevated p-8 max-w-md mx-4 glass">
            <div className="flex items-center mb-6">
              <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
              <h3 className="text-heading-3">Clear All Data</h3>
            </div>
            
            <p className="text-text-secondary mb-8 leading-relaxed">
              This action will permanently delete all your data except settings. This cannot be undone.
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowClearModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
