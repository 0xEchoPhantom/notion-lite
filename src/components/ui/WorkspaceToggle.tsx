'use client';

import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceMode } from '@/types/workspace';

export function WorkspaceToggle() {
  const { currentMode, switchMode, isLoading, gtdWorkspace } = useWorkspace();

  if (isLoading || !gtdWorkspace) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const handleModeChange = (mode: WorkspaceMode) => {
    switchMode(mode);
  };

  // Inline toggle only; container styling is handled by the parent topbar
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-600">Workspace:</span>
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        <button
          onClick={() => handleModeChange('gtd')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 ${
            currentMode === 'gtd'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          🎯 GTD
        </button>
        {/* Notes mode disabled */}
      </div>
    </div>
  );
}
