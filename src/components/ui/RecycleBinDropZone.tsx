import React, { useState } from 'react';
import clsx from 'clsx';
import { useSimpleDrag } from '@/contexts/SimpleDragContext';
import { useAuth } from '@/contexts/AuthContext';
import { archiveBlock } from '@/lib/firestore';

interface RecycleBinDropZoneProps {
  children: React.ReactNode;
  className?: string;
}

export const RecycleBinDropZone: React.FC<RecycleBinDropZoneProps> = ({ 
  children,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { getDraggedBlock, endDrag, isDragging } = useSimpleDrag();
  const { user } = useAuth();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedBlock = getDraggedBlock();
    
    if (!draggedBlock) {
      return;
    }
    
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedBlock = getDraggedBlock();
    
    if (!draggedBlock) {
      return;
    }
    
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedBlock = getDraggedBlock();
    
    if (!draggedBlock || !user) {
      setIsDragOver(false);
      return;
    }

    // Build list of all blocks to archive: parent + any dragged children
    const allBlockIds = draggedBlock.childBlockIds 
      ? [draggedBlock.block.id, ...draggedBlock.childBlockIds]
      : [draggedBlock.block.id];

    console.log(`Archiving ${allBlockIds.length} block(s) from page ${draggedBlock.sourcePageId}`);

    // Add fade-out animation to all blocks being archived
    allBlockIds.forEach(blockId => {
      const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
      if (blockElement) {
        blockElement.classList.add('moving-out');
      }
    });

    // Small delay to let animation start
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Archive parent (and children if present)
      for (const blockId of allBlockIds) {
        await archiveBlock(user.uid, draggedBlock.sourcePageId, blockId);
      }
      console.log('Block(s) archived successfully!');
    } catch (error) {
      console.error('Error archiving block(s):', error);
      // Remove animation classes on error
      allBlockIds.forEach(blockId => {
        const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
        if (blockElement) {
          blockElement.classList.remove('moving-out');
        }
      });
    }
    
    // Clean up
    setIsDragOver(false);
    endDrag();
  };

  // Show drop indicator when dragging
  const showDropIndicator = isDragOver && isDragging;

  return (
    <div 
      className={clsx(
        'recycle-bin-drop-zone relative transition-all duration-300',
        showDropIndicator && 'drag-over-delete',
        className
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
};