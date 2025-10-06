import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface LevelUpModalProps {
  oldLevel: number;
  newLevel: number;
  stage: {
    name: string;
    description: string;
    icon: string;
  };
  onClose: () => void;
}

export function LevelUpModal({ oldLevel, newLevel, stage, onClose }: LevelUpModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className={`bg-bg-secondary border border-border-primary rounded-3xl p-8 max-w-md w-full mx-4 text-center transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Celebration content */}
        <div className="text-8xl mb-6 animate-bounce">🎉</div>
        
        <h2 className="text-3xl font-bold text-text-primary mb-2">Level Up!</h2>
        
        <p className="text-text-secondary mb-6">
          You've reached <span className="font-bold text-accent-white">Level {newLevel}</span>
        </p>
        
        {/* Stage transition */}
        <div className="bg-bg-elevated border border-border-primary rounded-xl p-6 mb-6">
          <div className="text-4xl mb-3">{stage.icon}</div>
          <div className="text-sm text-text-tertiary mb-1">New Stage</div>
          <div className="text-xl font-bold text-text-primary mb-2">{stage.name}</div>
          <div className="text-sm text-text-secondary">{stage.description}</div>
        </div>
        
        <button
          onClick={handleClose}
          className="px-8 py-3 bg-accent-white text-bg-primary rounded-xl hover:bg-accent-glow transition-colors font-medium"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
