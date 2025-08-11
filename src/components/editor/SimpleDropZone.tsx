import React, { useState, useRef } from 'react';
import clsx from 'clsx';

interface SimpleDropZoneProps {
  blockId: string;
  children: React.ReactNode;
  onDrop: (draggedBlockId: string, targetBlockId: string, position: 'above' | 'below') => void;
  className?: string;
}

export const SimpleDropZone: React.FC<SimpleDropZoneProps> = ({ 
  blockId, 
  children,
  onDrop,
  className
}) => {
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Determine if drop should be above or below based on mouse position
    const mouseY = e.clientY;
    const blockMiddle = rect.top + rect.height / 2;
    const position = mouseY < blockMiddle ? 'above' : 'below';
    
    setDropPosition(position);
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're actually leaving the drop zone
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const isLeavingZone = 
      e.clientX < rect.left || 
      e.clientX > rect.right || 
      e.clientY < rect.top || 
      e.clientY > rect.bottom;
    
    if (isLeavingZone) {
      setDropPosition(null);
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedBlockId = e.dataTransfer.getData('blockId');
    
    if (draggedBlockId && draggedBlockId !== blockId && dropPosition) {
      console.log(`Dropping block ${draggedBlockId} ${dropPosition} block ${blockId}`);
      onDrop(draggedBlockId, blockId, dropPosition);
    }
    
    // Clean up
    setDropPosition(null);
    setIsDragOver(false);
  };

  return (
    <div 
      ref={dropZoneRef}
      className={clsx('relative', className)}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop indicator line - above */}
      {isDragOver && dropPosition === 'above' && (
        <div className="drop-indicator-line above" />
      )}
      
      {/* The actual block content */}
      <div className={clsx(
        'transition-all duration-200',
        isDragOver && 'transform scale-[0.98]'
      )}>
        {children}
      </div>
      
      {/* Drop indicator line - below */}
      {isDragOver && dropPosition === 'below' && (
        <div className="drop-indicator-line below" />
      )}
    </div>
  );
};