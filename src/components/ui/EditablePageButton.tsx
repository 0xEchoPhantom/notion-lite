'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGlobalDrag } from '@/contexts/GlobalDragContext';
import { Page } from '@/types/index';

interface EditablePageButtonProps {
  page: Page;
  isActive: boolean;
  onClick: () => void;
  onTitleUpdate: (pageId: string, newTitle: string) => void;
  onDragStart?: (page: Page) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, targetPageId: string) => void;
  onDrop?: (e: React.DragEvent, targetPageId: string) => void;
  draggedPageId?: string | null;
  insertPosition?: 'above' | 'below' | null;
}

export const EditablePageButton: React.FC<EditablePageButtonProps> = ({
  page,
  isActive,
  onClick,
  onTitleUpdate,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggedPageId,
  insertPosition,
}) => {
  const { moveBlockToNewPage, isDragging } = useGlobalDrag();
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingPage, setIsDraggingPage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDragOver = (e: React.DragEvent) => {
    if (isDragging) {
      // Handle block drops
      e.preventDefault();
      setIsHovered(true);
    } else if (draggedPageId && draggedPageId !== page.id) {
      // Handle page reordering
      e.preventDefault();
      if (onDragOver) {
        onDragOver(e, page.id);
      }
    }
  };

  const handleDragLeave = () => {
    setIsHovered(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    
    // Check if it's a block being dropped
    const blockData = e.dataTransfer.getData('application/json');
    if (blockData) {
      try {
        await moveBlockToNewPage(page.id, 0);
      } catch (error) {
        console.error('Error moving block:', error);
      }
    } else if (onDrop) {
      // Handle page reordering drop
      onDrop(e, page.id);
    }
  };

  const handlePageDragStart = (e: React.DragEvent) => {
    setIsDraggingPage(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-page', JSON.stringify(page));
    if (onDragStart) {
      onDragStart(page);
    }
  };

  const handlePageDragEnd = () => {
    setIsDraggingPage(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTempTitle(page.title);
  };

  const handleTitleSubmit = () => {
    if (tempTitle.trim() && tempTitle !== page.title) {
      onTitleUpdate(page.id, tempTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTempTitle(page.title);
      setIsEditing(false);
    }
  };

  const handleInputBlur = () => {
    handleTitleSubmit();
  };

  const getDropIndicatorStyle = () => {
    if (draggedPageId && draggedPageId !== page.id && insertPosition) {
      return insertPosition === 'above' 
        ? 'border-t-2 border-blue-500' 
        : 'border-b-2 border-blue-500';
    }
    return '';
  };

  return (
    <div className={`relative group ${getDropIndicatorStyle()}`}>
      <button
        onClick={onClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDoubleClick={handleDoubleClick}
        className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
          isActive
            ? 'bg-gray-100 text-gray-900'
            : isHovered && isDragging
            ? 'bg-green-100 text-green-900 border-2 border-green-300'
            : isDraggingPage
            ? 'opacity-50'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center justify-between">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleInputBlur}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 cursor-pointer" title="Double-click to edit">
              {page.title}
            </span>
          )}
          {!isEditing && (
            <div
              draggable
              onDragStart={handlePageDragStart}
              onDragEnd={handlePageDragEnd}
              className={`p-1 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              title="Drag to reorder or delete page"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="2" cy="2" r="1" />
                <circle cx="6" cy="2" r="1" />
                <circle cx="2" cy="6" r="1" />
                <circle cx="6" cy="6" r="1" />
              </svg>
            </div>
          )}
        </div>
        {isHovered && isDragging && (
          <span className="ml-2 text-xs text-green-600">(Drop block here)</span>
        )}
      </button>
    </div>
  );
};
