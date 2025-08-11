import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { useBlockDrag } from '@/contexts/BlockDragContext';
import { Block } from '@/types/index';

interface EnhancedBlockDropZoneProps {
  blockId: string;
  blocks: Block[];
  children: React.ReactNode;
  className?: string;
}

export const EnhancedBlockDropZone: React.FC<EnhancedBlockDropZoneProps> = ({ 
  blockId, 
  blocks,
  children,
  className
}) => {
  const { 
    draggedBlock, 
    isDragging, 
    dropIndicator,
    updateDropIndicator,
    reorderInCurrentPage,
    canDropOnBlock,
    endDrag
  } = useBlockDrag();
  
  const [localDropPosition, setLocalDropPosition] = useState<'above' | 'below' | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const lastDragOverTime = useRef<number>(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isDragging || !canDropOnBlock(blockId)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Throttle the drag over events for performance
    const now = Date.now();
    if (now - lastDragOverTime.current < 50) return;
    lastDragOverTime.current = now;
    
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Determine if drop should be above or below based on mouse position
    const mouseY = e.clientY;
    const blockMiddle = rect.top + rect.height / 2;
    const position = mouseY < blockMiddle ? 'above' : 'below';
    
    setLocalDropPosition(position);
    updateDropIndicator(blockId, position);
  }, [isDragging, blockId, canDropOnBlock, updateDropIndicator]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!isDragging || !canDropOnBlock(blockId)) return;
    e.preventDefault();
    e.stopPropagation();
  }, [isDragging, blockId, canDropOnBlock]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear if we're actually leaving the drop zone
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const isLeavingZone = 
      e.clientX < rect.left || 
      e.clientX > rect.right || 
      e.clientY < rect.top || 
      e.clientY > rect.bottom;
    
    if (isLeavingZone) {
      setLocalDropPosition(null);
      if (dropIndicator?.blockId === blockId) {
        updateDropIndicator(null, 'below');
      }
    }
  }, [blockId, dropIndicator, updateDropIndicator]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDragging || !draggedBlock || !canDropOnBlock(blockId) || !localDropPosition) {
      return;
    }
    
    // Perform the reorder
    await reorderInCurrentPage(blockId, localDropPosition, blocks);
    
    // Clean up
    setLocalDropPosition(null);
    updateDropIndicator(null, 'below');
  }, [
    isDragging, 
    draggedBlock, 
    blockId, 
    localDropPosition, 
    blocks, 
    canDropOnBlock, 
    reorderInCurrentPage, 
    updateDropIndicator
  ]);

  const showIndicator = dropIndicator?.blockId === blockId;
  const indicatorPosition = showIndicator ? dropIndicator.position : null;

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
      <div
        className={clsx(
          'absolute left-0 right-0 h-0.5 bg-blue-500 transition-all duration-150 z-50',
          'before:absolute before:w-2 before:h-2 before:bg-blue-500 before:rounded-full before:-left-1 before:-top-[3px]',
          indicatorPosition === 'above' ? 'opacity-100 -top-[1px]' : 'opacity-0 -top-[1px] pointer-events-none'
        )}
      />
      
      {/* The actual block content */}
      {children}
      
      {/* Drop indicator line - below */}
      <div
        className={clsx(
          'absolute left-0 right-0 h-0.5 bg-blue-500 transition-all duration-150 z-50',
          'before:absolute before:w-2 before:h-2 before:bg-blue-500 before:rounded-full before:-left-1 before:-top-[3px]',
          indicatorPosition === 'below' ? 'opacity-100 -bottom-[1px]' : 'opacity-0 -bottom-[1px] pointer-events-none'
        )}
      />
    </div>
  );
};