import React, { useState } from 'react';
import clsx from 'clsx';
import { useSimpleDrag } from '@/contexts/SimpleDragContext';
import { useAuth } from '@/contexts/AuthContext';
import { deleteBlock } from '@/lib/firestore';

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
    
    console.log(`Deleting block ${draggedBlock.block.id} from page ${draggedBlock.sourcePageId}`);
    
    try {
      // Delete the block
      await deleteBlock(
        user.uid,
        draggedBlock.sourcePageId,
        draggedBlock.block.id
      );
      
      console.log('Block deleted successfully!');
    } catch (error) {
      console.error('Error deleting block:', error);
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