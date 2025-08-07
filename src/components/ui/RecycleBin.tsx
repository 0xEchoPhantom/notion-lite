'use client';

import React, { useState } from 'react';
import clsx from 'clsx';

interface RecycleBinProps {
  onDelete: () => Promise<void>;
  isDraggedOver?: boolean;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({ 
  onDelete, 
  isDraggedOver = false 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDraggedOverLocal, setIsDraggedOverLocal] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this is a page being dragged
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('application/x-page')) {
      e.dataTransfer.dropEffect = 'move';
      setIsDraggedOverLocal(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set to false if leaving the recycle bin completely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggedOverLocal(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggedOverLocal(false);
    
    // Check if this is a page being dragged
    const pageData = e.dataTransfer.getData('application/x-page');
    
    if (pageData) {
      try {
        const page = JSON.parse(pageData);
        
        // Confirm deletion
        const confirmed = window.confirm(`Are you sure you want to delete "${page.title}"? This action cannot be undone.`);
        
        if (confirmed) {
          setIsDeleting(true);
          await onDelete();
        }
      } catch (error) {
        console.error('Error deleting page:', error);
        alert('Failed to delete page. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const isHighlighted = isDraggedOver || isDraggedOverLocal;

  return (
    <div
      className={clsx(
        'flex items-center justify-center p-3 mt-4 mx-2 rounded-lg border-2 border-dashed transition-all duration-200',
        isHighlighted
          ? 'border-red-400 bg-red-50 text-red-600 scale-105' 
          : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500',
        isDeleting && 'opacity-50 pointer-events-none'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title="Drag pages here to delete them"
    >
      <div className="flex items-center space-x-2">
        <svg 
          className={clsx(
            'w-5 h-5 transition-transform duration-200',
            isHighlighted && 'scale-110'
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
          />
        </svg>
        <span className={clsx(
          'text-sm font-medium transition-all duration-200',
          isHighlighted ? 'text-red-600' : 'text-gray-500'
        )}>
          {isDeleting ? 'Deleting...' : isHighlighted ? 'Release to delete' : 'Recycle Bin'}
        </span>
      </div>
    </div>
  );
};
