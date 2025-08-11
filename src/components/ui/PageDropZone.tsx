import React, { useState } from 'react';
import clsx from 'clsx';
import { useDrag } from '@/contexts/DragContext';

interface PageDropZoneProps {
  pageId: string;
  children: React.ReactNode;
  onDrop?: (blockId: string) => void;
}

export const PageDropZone: React.FC<PageDropZoneProps> = ({ pageId, children, onDrop }) => {
  const { isDragging, isValidDropTarget, moveToPage } = useDrag();
  const [isOver, setIsOver] = useState(false);

  const canDrop = isDragging && isValidDropTarget(pageId);

  const handleDragOver = (e: React.DragEvent) => {
    if (!canDrop) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    if (!canDrop) return;

    const blockId = e.dataTransfer.getData('text/plain');
    if (!blockId) return;

    const success = await moveToPage(pageId, 0);
    if (success) {
      onDrop?.(blockId);
    }
  };

  return (
    <div
      className={clsx(
        'transition-all duration-200',
        canDrop && isOver && 'bg-blue-50 border-blue-300 border-2 rounded-lg',
        canDrop && !isOver && 'border-transparent border-2'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {canDrop && isOver && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium">
            Drop block here
          </div>
        </div>
      )}
    </div>
  );
};