import React, { useState, useRef } from 'react';
import clsx from 'clsx';

interface SimpleDropZoneProps {
  blockId: string;
  block?: { id: string; type: string; content: string; indentLevel: number }; // Block data for determining if it can be a parent
  children: React.ReactNode;
  onDrop: (draggedBlockId: string, targetBlockId: string, position: 'above' | 'below' | 'child', childBlockIds?: string[]) => void;
  className?: string;
}

export const SimpleDropZone: React.FC<SimpleDropZoneProps> = ({ 
  blockId, 
  block,
  children,
  onDrop,
  className
}) => {
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | 'child' | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // We can't read dataTransfer data during dragOver, only during drop
    // So we'll use a simpler approach for determining if it can be a child
    const draggedBlockType = 'todo-list'; // Assume todo for now
    const mouseY = e.clientY;
    const mouseX = e.clientX;
    
    // Check if we can drop as child (for todo-list blocks)
    const canBeChild = block?.type === 'todo-list' && 
                      draggedBlockType === 'todo-list' &&
                      mouseX > rect.left + 40; // Indented position
    
    let position: 'above' | 'below' | 'child';
    
    if (canBeChild && mouseY > rect.top + rect.height * 0.3 && mouseY < rect.top + rect.height * 0.7) {
      // Middle area with indent - drop as child
      position = 'child';
    } else {
      // Determine if drop should be above or below
      const blockMiddle = rect.top + rect.height / 2;
      position = mouseY < blockMiddle ? 'above' : 'below';
    }
    
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
    const childBlockIds = e.dataTransfer.getData('childBlockIds');
    
    if (draggedBlockId && draggedBlockId !== blockId && dropPosition) {
      console.log(`Dropping block ${draggedBlockId} ${dropPosition} block ${blockId}`);
      
      // Pass child block IDs if dragging a parent with children
      const childIds = childBlockIds ? childBlockIds.split(',').filter(id => id) : undefined;
      onDrop(draggedBlockId, blockId, dropPosition, childIds);
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