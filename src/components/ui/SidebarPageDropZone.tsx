import React, { useState } from 'react';
import clsx from 'clsx';
import { useSimpleDrag } from '@/contexts/SimpleDragContext';
import { useAuth } from '@/contexts/AuthContext';
import { moveBlockToPage } from '@/lib/firestore';

interface SidebarPageDropZoneProps {
  pageId: string;
  pageTitle: string;
  children: React.ReactNode;
  className?: string;
  isCurrentPage?: boolean;
}

export const SidebarPageDropZone: React.FC<SidebarPageDropZoneProps> = ({ 
  pageId, 
  pageTitle,
  children,
  className,
  isCurrentPage = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { getDraggedBlock, endDrag, isDragging } = useSimpleDrag();
  const { user } = useAuth();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedBlock = getDraggedBlock();
    
    // Don't allow dropping on the same page
    if (!draggedBlock || draggedBlock.sourcePageId === pageId) {
      return;
    }
    
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedBlock = getDraggedBlock();
    
    // Don't show drop indicator for same page
    if (!draggedBlock || draggedBlock.sourcePageId === pageId) {
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
    
    if (!draggedBlock || !user || draggedBlock.sourcePageId === pageId) {
      setIsDragOver(false);
      return;
    }
    
    console.log(`Moving block ${draggedBlock.block.id} from page ${draggedBlock.sourcePageId} to page ${pageId}`);
    
    try {
      // Move the block to the new page
      const result = await moveBlockToPage(
        user.uid,
        draggedBlock.sourcePageId,
        pageId,
        draggedBlock.block.id
      );
      
      if (result) {
        console.log('Block moved successfully!');
        // Show some success feedback (you could add a toast here)
      } else {
        console.error('Failed to move block');
      }
    } catch (error) {
      console.error('Error moving block:', error);
    }
    
    // Clean up
    setIsDragOver(false);
    endDrag();
  };

  // Don't show drop indicator if dragging within same page
  const showDropIndicator = isDragOver && isDragging;

  return (
    <div 
      className={clsx(
        'sidebar-drop-zone relative transition-all duration-300',
        showDropIndicator && 'drag-over',
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