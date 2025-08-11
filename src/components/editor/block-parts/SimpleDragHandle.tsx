import React, { useState } from 'react';
import clsx from 'clsx';
import { Block } from '@/types/index';
import { GTD_PAGES } from '@/types/workspace';

interface SimpleDragHandleProps {
  block: Block;
  pageId: string;
  pageTitle?: string;
  isSelected: boolean;
  onSelect?: () => void;
  onMoveToGTDPage?: (blockId: string, targetPageId: string) => void;
}

export const SimpleDragHandle: React.FC<SimpleDragHandleProps> = ({ 
  block, 
  pageId, 
  isSelected, 
  onSelect,
  onMoveToGTDPage
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Filter out current page if it's a GTD page
  const availableGTDPages = GTD_PAGES.filter(page => page.id !== pageId);

  return (
    <div className="relative">
      <div
        className={clsx(
          'transition-all cursor-pointer',
          'flex items-center justify-center w-6 h-6',
          'hover:bg-gray-200 rounded flex-shrink-0 mr-1 active:bg-gray-300',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100',
          'text-gray-500 hover:text-gray-700'
        )}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        title="Block options"
      >
        <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" className="pointer-events-none">
          <circle cx="4" cy="4" r="2" />
          <circle cx="10" cy="4" r="2" />
          <circle cx="4" cy="9" r="2" />
          <circle cx="10" cy="9" r="2" />
          <circle cx="4" cy="14" r="2" />
          <circle cx="10" cy="14" r="2" />
        </svg>
      </div>
      
      {showMenu && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
          {/* GTD Page Options */}
          {availableGTDPages.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-100 bg-gray-50">
                Move to GTD Status
              </div>
              {availableGTDPages.map((page) => (
                <button
                  key={page.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToGTDPage?.(block.id, page.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 text-gray-800 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <span className="text-base">{page.emoji}</span>
                  <span className="font-medium">{page.title}</span>
                </button>
              ))}
              <div className="border-t border-gray-200 my-1"></div>
            </>
          )}
          
          {/* Other Actions */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-800 font-medium"
          >
            <span className="text-base">✏️</span>
            <span>Select</span>
          </button>
        </div>
      )}
      
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};