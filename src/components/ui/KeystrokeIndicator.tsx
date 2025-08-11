/**
 * Visual indicator for keystroke operation states
 * Shows when Enter/Backspace operations are being processed or locked
 */

import React from 'react';

interface KeystrokeIndicatorProps {
  isCreating: boolean;
  isDeleting: boolean;
  isLocked: boolean;
  className?: string;
}

export const KeystrokeIndicator: React.FC<KeystrokeIndicatorProps> = ({
  isCreating,
  isDeleting,
  isLocked,
  className = '',
}) => {
  if (!isCreating && !isDeleting && !isLocked) {
    return null;
  }

  const getIndicatorContent = () => {
    if (isCreating) {
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-xs">Creating...</span>
        </div>
      );
    }

    if (isDeleting) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <div className="animate-pulse h-3 w-3 bg-red-600 rounded-full"></div>
          <span className="text-xs">Deleting...</span>
        </div>
      );
    }

    if (isLocked) {
      return (
        <div className="flex items-center gap-1 text-amber-600">
          <div className="animate-bounce h-3 w-3 bg-amber-600 rounded-full"></div>
          <span className="text-xs">Processing...</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 
        px-3 py-2 
        bg-white 
        border border-gray-200 
        rounded-lg 
        shadow-lg 
        transition-all duration-200
        ${className}
      `}
    >
      {getIndicatorContent()}
    </div>
  );
};

/**
 * Hook to show keystroke operation indicators
 */
export const useKeystrokeIndicator = () => {
  return {
    KeystrokeIndicator,
  };
};