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
    
    const mouseY = e.clientY;
    const mouseX = e.clientX;
    
    // Check if we can drop as child (for todo-list blocks)
    // Allow dropping as child when hovering over the right half of a todo block
    const canBeChild = block?.type === 'todo-list';
    
    let position: 'above' | 'below' | 'child';
    
    // More intuitive child detection:
    // - If mouse is in the right 60% of the block
    // - And within the middle 60% vertically
    const isInChildZone = mouseX > rect.left + rect.width * 0.4;
    const isInMiddleVertically = mouseY > rect.top + rect.height * 0.2 && 
                                  mouseY < rect.top + rect.height * 0.8;
    
    if (canBeChild && isInChildZone && isInMiddleVertically) {
      // Drop as child when hovering on the right side
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
        isDragOver && dropPosition === 'child' && 'ml-8 ring-2 ring-blue-400 ring-offset-2 rounded-lg',
        isDragOver && dropPosition !== 'child' && 'transform scale-[0.98]'
      )}>
        {children}
      </div>
      
      {/* Drop indicator line - below */}
      {isDragOver && dropPosition === 'below' && (
        <div className="drop-indicator-line below" />
      )}
      
      {/* Child drop indicator */}
      {isDragOver && dropPosition === 'child' && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-blue-500 text-xs font-medium pointer-events-none">
          ↳ Drop as subtask
        </div>
      )}
    </div>
  );
};