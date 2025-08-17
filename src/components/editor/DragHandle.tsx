import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import { Block } from '@/types/index';
import { useBlockDrag } from '@/contexts/BlockDragContext';
import { GTD_PAGES } from '@/types/workspace';

interface DragHandleProps {
  block: Block;
  pageId: string;
  pageTitle?: string;
  isSelected: boolean;
  onSelect?: () => void;
  onMoveToGTDPage?: (blockId: string, targetPageId: string) => void;
}

export const DragHandle: React.FC<DragHandleProps> = ({ 
  block, 
  pageId,
  pageTitle,
  isSelected, 
  onSelect,
  onMoveToGTDPage
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragHovered, setIsDragHovered] = useState(false);
  const { startDrag, isDragging } = useBlockDrag();
  const handleRef = useRef<HTMLDivElement>(null);

  // Filter out current page if it's a GTD page
  const availableGTDPages = GTD_PAGES.filter(page => page.id !== pageId);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    startDrag(block, pageId, pageTitle, e);
    
    // Add dragging class to the block element
    const blockElement = e.currentTarget.closest('[data-block-id]');
    if (blockElement) {
      blockElement.classList.add('opacity-50');
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    
    // Remove dragging class from the block element
    const blockElement = e.currentTarget.closest('[data-block-id]');
    if (blockElement) {
      blockElement.classList.remove('opacity-50');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent text selection when clicking on drag handle
    e.preventDefault();
  };

  return (
    <div className="relative flex items-center">
      {/* Drag Handle */}
      <div
        ref={handleRef}
        className={clsx(
          'transition-all cursor-move',
          'flex items-center justify-center w-6 h-6',
          'hover:bg-gray-200 rounded flex-shrink-0 mr-1',
          isDragging && 'cursor-grabbing',
          !isDragging && 'cursor-grab',
          isSelected || isDragHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100',
          'text-gray-400 hover:text-gray-600'
        )}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsDragHovered(true)}
        onMouseLeave={() => setIsDragHovered(false)}
        title="Drag to reorder"
      >
        <svg 
          width="10" 
          height="18" 
          viewBox="0 0 10 18" 
          fill="currentColor" 
          className="pointer-events-none"
        >
          <circle cx="2" cy="3" r="1.5" />
          <circle cx="2" cy="9" r="1.5" />
          <circle cx="2" cy="15" r="1.5" />
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="9" r="1.5" />
          <circle cx="8" cy="15" r="1.5" />
        </svg>
      </div>

      {/* Action Menu Button */}
      <div
        className={clsx(
          'transition-all cursor-pointer',
          'flex items-center justify-center w-6 h-6',
          'hover:bg-gray-200 rounded flex-shrink-0 mr-1',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100',
          'text-gray-400 hover:text-gray-600'
        )}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        title="Block actions"
      >
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 18 18" 
          fill="none" 
          className="pointer-events-none"
        >
          <path 
            d="M4 9h10M9 4v10" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      {/* Action Menu Dropdown */}
      {showMenu && (
        <>
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 min-w-[220px] py-1">
            {/* GTD Page Options */}
            {availableGTDPages.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Move to GTD
                </div>
                {availableGTDPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToGTDPage?.(block.id, page.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-100 transition-colors"
                  >
                    <span className="text-base">{page.emoji}</span>
                    <span>{page.title}</span>
                  </button>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
              </>
            )}
            
            {/* Other Actions */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-100"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="3" width="10" height="10" stroke="currentColor" strokeWidth="1.5" rx="1" />
              </svg>
              <span>Select block</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Copy block logic can be added here
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-100"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="8" height="8" stroke="currentColor" strokeWidth="1.5" rx="1" />
                <path d="M3 3h7v1M3 3v7h1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Duplicate</span>
            </button>
            
            <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Delete block logic can be added here
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 2h4M2 4h12M5 4v8M11 4v8M4 4l1 9h6l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
          
          {/* Click outside to close */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
        </>
      )}
    </div>
  );
};