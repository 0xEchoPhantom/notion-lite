'use client';

import React, { useState } from 'react';
import clsx from 'clsx';

interface ArchiveProps {
  isDraggedOver?: boolean;
  onDeletePage?: (pageId: string) => Promise<void>;
  onDeleteBlock?: (blockId: string) => Promise<void>;
  onViewArchive: () => void;
}

export const Archive: React.FC<ArchiveProps> = ({
  isDraggedOver = false,
  onDeletePage,
  onDeleteBlock,
  onViewArchive
}) => {
  const [isDraggedOverLocal, setIsDraggedOverLocal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDraggedOverLocal(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOverLocal(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOverLocal(false);

    // Check if this is a page being dragged
    const pageData = e.dataTransfer.getData('application/x-page');
    if (pageData && onDeletePage) {
      try {
        const page = JSON.parse(pageData);
        
        // Confirm archiving
        const confirmed = window.confirm(`Archive "${page.title}"? You can restore it later from the archive.`);
        
        if (confirmed) {
          setIsDeleting(true);
          await onDeletePage(page.id);
        }
      } catch (error) {
        console.error('Error archiving page:', error);
        alert('Failed to archive page. Please try again.');
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    // Check if this is a block being dragged
    const blockData = e.dataTransfer.getData('application/json');
    if (blockData && onDeleteBlock) {
      try {
        const block = JSON.parse(blockData);
        
        // Confirm archiving
        const confirmed = window.confirm(`Archive this block? You can restore it later from the archive.`);
        
        if (confirmed) {
          setIsDeleting(true);
          // Use blockId since that's what's set in the drag data
          await onDeleteBlock(block.blockId);
        }
      } catch (error) {
        console.error('Error archiving block:', error);
        alert('Failed to archive block. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const isHighlighted = isDraggedOver || isDraggedOverLocal;

  return (
    <div className="flex flex-col gap-2">
      {/* Drop Zone */}
      <div
        className={clsx(
          'flex items-center justify-center p-3 rounded-lg border-2 border-dashed transition-all duration-200',
          isHighlighted
            ? 'border-blue-400 bg-blue-50 text-blue-600 scale-105' 
            : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500',
          isDeleting && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              className={clsx(
                'transition-transform duration-200',
                isHighlighted && 'scale-110'
              )}
            >
              <path d="M3 6h18l-1.5 14H4.5L3 6zm2.5 0V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2m-6 5v4m-4-4v4m8-4v4" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
            <span className="text-sm font-medium">
              {isDeleting ? 'Archiving...' : 'Archive'}
            </span>
          </div>
          {isHighlighted && (
            <span className="text-xs">Drop to archive</span>
          )}
        </div>
      </div>

      {/* View Archive Button */}
      <button
        onClick={onViewArchive}
        className="flex items-center justify-center gap-2 p-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        View Archive
      </button>
    </div>
  );
};
