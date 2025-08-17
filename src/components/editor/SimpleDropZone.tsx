import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import { INDENT_SIZE_PX } from '@/constants/editor';

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
  try { e.dataTransfer.dropEffect = 'move'; } catch {}
    
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    
  const mouseY = e.clientY;
    
  // Allow dropping as child for any block type
  const canBeChild = true;
    
    let position: 'above' | 'below' | 'child';
    // Vertical thirds: top -> above, bottom -> below, middle -> child
    const topThreshold = rect.top + rect.height * 0.25;
    const bottomThreshold = rect.top + rect.height * 0.75;
    if (mouseY < topThreshold) {
      position = 'above';
    } else if (mouseY > bottomThreshold) {
      position = 'below';
    } else if (canBeChild) {
      position = 'child';
    } else {
      // Fallback if child not allowed for some reason
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
        isDragOver && dropPosition !== 'child' && 'transform scale-[0.98]'
      )}>
        {children}
      </div>
      
      {/* Drop indicator line - below */}
      {isDragOver && dropPosition === 'below' && (
        <div className="drop-indicator-line below" />
      )}
      
      {/* Child drop indicator: light blue band + indented blue line */}
      {isDragOver && dropPosition === 'child' && (
        <>
          {(() => {
            const left = ((block?.indentLevel ?? 0) + 1) * INDENT_SIZE_PX;
            return (
              <>
                {/* Light blue background to indicate sub-level area */}
                <div
                  className="absolute inset-y-2 rounded-md pointer-events-none"
                  style={{ left: `${left}px`, right: 0, background: 'rgba(59, 130, 246, 0.08)' }}
                />
                {/* Indented blue line inside the band */}
                <div
                  className="absolute h-[2px] bg-blue-500 pointer-events-none"
                  style={{ left: `${left}px`, right: 0, bottom: -1 }}
                />
                {/* Small helper text near the line */}
                <div
                  className="absolute text-[11px] font-medium text-blue-600 pointer-events-none"
                  style={{ left: `${left + 8}px`, bottom: 4 }}
                >
                  ↳ Drop as {block?.type === 'todo-list' ? 'subtask' : 'child'}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
};