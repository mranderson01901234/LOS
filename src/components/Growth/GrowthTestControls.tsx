import React from 'react';
import { useGrowthData } from '../../hooks/useGrowthData';
import { Plus, RotateCcw } from 'lucide-react';

// This component can be temporarily added to the Growth page for testing
export const GrowthTestControls: React.FC = () => {
  const { addConversation, updateStats, resetData } = useGrowthData();

  return (
    <div className="card p-8 mb-8">
      <h3 className="text-heading-3 mb-6 text-text-primary">Test Controls</h3>
      
      <div className="flex flex-wrap gap-4">
        <button
          onClick={addConversation}
          className="btn-primary flex items-center px-6 py-3"
        >
          <Plus className="w-4 h-4 mr-3" />
          Add Conversation
        </button>
        
        <button
          onClick={() => updateStats({ articlesSaved: Math.floor(Math.random() * 10) })}
          className="btn-primary flex items-center px-6 py-3"
        >
          <Plus className="w-4 h-4 mr-3" />
          Random Articles
        </button>
        
        <button
          onClick={() => updateStats({ factsLearned: Math.floor(Math.random() * 20) })}
          className="btn-primary flex items-center px-6 py-3"
        >
          <Plus className="w-4 h-4 mr-3" />
          Random Facts
        </button>
        
        <button
          onClick={() => updateStats({ daysActive: Math.floor(Math.random() * 30) })}
          className="btn-primary flex items-center px-6 py-3"
        >
          <Plus className="w-4 h-4 mr-3" />
          Random Days
        </button>
        
        <button
          onClick={resetData}
          className="btn-secondary flex items-center px-6 py-3 text-red-400 border-red-400 hover:bg-red-400 hover:text-bg-primary"
        >
          <RotateCcw className="w-4 h-4 mr-3" />
          Reset Data
        </button>
      </div>
    </div>
  );
};
