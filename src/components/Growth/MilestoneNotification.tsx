import React, { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';

interface MilestoneNotificationProps {
  milestone: {
    id: string;
    title: string;
    description: string;
    xpReward: number;
    category: 'conversation' | 'knowledge' | 'relationship' | 'learning';
  };
  onClose: () => void;
}

export function MilestoneNotification({ milestone, onClose }: MilestoneNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    setTimeout(() => setIsVisible(true), 100);
    
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'conversation': return '💬';
      case 'knowledge': return '📚';
      case 'relationship': return '❤️';
      case 'learning': return '🧠';
      default: return '🏆';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div 
        className={`bg-bg-secondary border border-border-primary rounded-xl p-4 shadow-premium-lg transform transition-all duration-300 ${
          isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Milestone content */}
        <div className="flex items-start gap-3">
          <div className="text-2xl">{getCategoryIcon(milestone.category)}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-accent-white" />
              <div className="font-medium text-text-primary text-sm">Achievement Unlocked!</div>
            </div>
            <div className="font-bold text-text-primary mb-1">{milestone.title}</div>
            <div className="text-xs text-text-secondary mb-2">{milestone.description}</div>
            <div className="text-xs text-accent-white font-medium">+{milestone.xpReward} XP</div>
          </div>
        </div>
      </div>
    </div>
  );
}
