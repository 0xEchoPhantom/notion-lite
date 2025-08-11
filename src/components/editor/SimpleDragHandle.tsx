import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import { Block } from '@/types/index';
import { GTD_PAGES } from '@/types/workspace';
import { useSimpleDrag } from '@/contexts/SimpleDragContext';

interface SimpleDragHandleProps {
  block: Block;
  pageId: string;
  pageTitle?: string;
  isSelected: boolean;
  onSelect?: () => void;
  onMoveToGTDPage?: (blockId: string, targetPageId: string) => void;
  onStartDrag?: (block: Block) => void;
  onEndDrag?: () => void;
  onConvertToTodo?: () => void;
}

export const SimpleDragHandle: React.FC<SimpleDragHandleProps> = ({ 
  block, 
  pageId,
  pageTitle,
  isSelected, 
  onSelect,
  onMoveToGTDPage,
  onStartDrag,
  onEndDrag,
  onConvertToTodo
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);
  const { startDrag: globalStartDrag, endDrag: globalEndDrag } = useSimpleDrag();

  // Filter out current page if it's a GTD page
  const availableGTDPages = GTD_PAGES.filter(page => page.id !== pageId);

  const handleDragStart = (e: React.DragEvent) => {
    // Don't start drag if menu is open
    if (showMenu) {
      e.preventDefault();
      return;
    }
    
    console.log('Drag started for block:', block.id);
    setIsDragging(true);
    
    // Set drag data for native drag and drop
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('blockId', block.id);
    e.dataTransfer.setData('blockContent', block.content || '');
    e.dataTransfer.setData('sourcePageId', pageId);
    
    // Also set global drag state for cross-page dragging
    globalStartDrag(block, pageId, pageTitle);
    
    // Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      padding: 8px 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      font-size: 14px;
      max-width: 300px;
    `;
    dragImage.textContent = block.content || 'Moving block...';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // Clean up drag image after a moment
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
    
    // Add visual feedback to the source block
    const blockElement = e.currentTarget.closest('[data-block-id]') as HTMLElement;
    if (blockElement) {
      blockElement.classList.add('dragging');
    }
    
    onStartDrag?.(block);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    console.log('Drag ended for block:', block.id);
    setIsDragging(false);
    
    // Remove visual feedback from the source block
    const blockElement = e.currentTarget.closest('[data-block-id]') as HTMLElement;
    if (blockElement) {
      blockElement.classList.remove('dragging');
    }
    
    // Clear global drag state
    globalEndDrag();
    
    onEndDrag?.();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Increment click count
    clickCountRef.current++;
    
    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    // Set timeout to reset click count
    clickTimeoutRef.current = setTimeout(() => {
      if (clickCountRef.current === 2) {
        // Double click detected
        setShowMenu(!showMenu);
      }
      clickCountRef.current = 0;
    }, 300);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't prevent default here as it interferes with dragging
    // Only prevent text selection for double clicks
    if (e.detail === 2) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative flex items-center">
      {/* Combined Drag Handle with Double-Click Menu */}
      <div
        ref={handleRef}
        className={clsx(
          'drag-handle transition-all duration-200',
          'flex items-center justify-center w-8 h-8',
          'rounded-lg',
          'cursor-grab active:cursor-grabbing',
          isDragging && 'is-dragging',
          // Only show on hover (not on selection or focus)
          'opacity-0 group-hover:opacity-100'
        )}
        suppressHydrationWarning={true}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Drag to move • Double-click for menu"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        <svg 
          width="14" 
          height="20" 
          viewBox="0 0 14 20" 
          fill="none"
          className={clsx(
            'pointer-events-none',
            isDragging ? 'text-blue-600' : isHovered ? 'text-gray-600' : 'text-gray-400'
          )}
        >
          <circle cx="3.5" cy="4" r="2" fill="currentColor" />
          <circle cx="3.5" cy="10" r="2" fill="currentColor" />
          <circle cx="3.5" cy="16" r="2" fill="currentColor" />
          <circle cx="10.5" cy="4" r="2" fill="currentColor" />
          <circle cx="10.5" cy="10" r="2" fill="currentColor" />
          <circle cx="10.5" cy="16" r="2" fill="currentColor" />
        </svg>
      </div>
      
      {/* Action Menu Dropdown (appears on double-click) */}
      {showMenu && (
        <>
          <div className="drag-menu absolute top-full left-0 mt-2 z-50 min-w-[200px] py-1">
            {/* GTD Page Options */}
            {availableGTDPages.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors"
                  >
                    <span className="text-base">{page.emoji}</span>
                    <span>{page.title}</span>
                  </button>
                ))}
                <div className="border-t border-gray-100 my-1"></div>
              </>
            )}
            
            {/* Other Actions */}
            {/* Turn into to-do list - only show if not already a todo */}
            {block.type !== 'todo-list' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertToTodo?.();
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="3" width="10" height="10" stroke="currentColor" strokeWidth="1.5" rx="2" />
                  <path d="M6 8l1.5 1.5L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Turn into to-do list</span>
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="3" width="10" height="10" stroke="currentColor" strokeWidth="1.5" rx="1" />
              </svg>
              <span>Select block</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Duplicate block logic can be added here
                console.log('Duplicate block:', block.id);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="8" height="8" stroke="currentColor" strokeWidth="1.5" rx="1" />
                <path d="M3 3h7v1M3 3v7h1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Duplicate</span>
            </button>
            
            <div className="border-t border-gray-100 my-1"></div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Delete block logic can be added here
                console.log('Delete block:', block.id);
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