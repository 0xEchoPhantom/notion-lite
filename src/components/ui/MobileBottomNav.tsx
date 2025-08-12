'use client';

import React from 'react';
import { Inbox, CheckSquare, Plus, FileText, MoreHorizontal } from 'lucide-react';

interface MobileBottomNavProps {
  activeView: 'inbox' | 'tasks' | 'notes' | 'smart' | string;
  onNavigate: (view: string) => void;
  onQuickAdd?: () => void;
  onMenuToggle?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onNavigate,
  onQuickAdd,
  onMenuToggle
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
      <div className="grid grid-cols-5 gap-0">
        <button
          onClick={() => onNavigate('inbox')}
          className={`flex flex-col items-center justify-center py-2 px-1 min-h-[56px] transition-colors ${
            activeView === 'inbox' 
              ? 'text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Inbox className="w-5 h-5 mb-1" />
          <span className="text-xs">Inbox</span>
        </button>

        <button
          onClick={() => onNavigate('smart')}
          className={`flex flex-col items-center justify-center py-2 px-1 min-h-[56px] transition-colors ${
            activeView === 'smart' 
              ? 'text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CheckSquare className="w-5 h-5 mb-1" />
          <span className="text-xs">Tasks</span>
        </button>

        <button
          onClick={onQuickAdd}
          className="flex flex-col items-center justify-center py-2 px-1 min-h-[56px] text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => onNavigate('notes')}
          className={`flex flex-col items-center justify-center py-2 px-1 min-h-[56px] transition-colors ${
            activeView === 'notes' 
              ? 'text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-5 h-5 mb-1" />
          <span className="text-xs">Notes</span>
        </button>

        <button
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center py-2 px-1 min-h-[56px] text-gray-500 hover:text-gray-700 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5 mb-1" />
          <span className="text-xs">Menu</span>
        </button>
      </div>
    </div>
  );
};