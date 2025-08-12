import React, { useState } from 'react';
import clsx from 'clsx';
import { useSimpleDrag } from '@/contexts/SimpleDragContext';
import { useAuth } from '@/contexts/AuthContext';
import { moveBlockToPage, moveBlocksToPage } from '@/lib/firestore';

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
    
    // Add fade-out animation to blocks being moved
    const allBlockIds = draggedBlock.childBlockIds 
      ? [draggedBlock.block.id, ...draggedBlock.childBlockIds]
      : [draggedBlock.block.id];
      
    // Add moving-out class to all blocks being moved
    allBlockIds.forEach(blockId => {
      const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
      if (blockElement) {
        blockElement.classList.add('moving-out');
      }
    });
    
    // Wait a bit for the animation to start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Check if we're moving a parent with children
      if (draggedBlock.childBlockIds && draggedBlock.childBlockIds.length > 0) {
        // Move parent and all children together atomically
        console.log(`Moving ${allBlockIds.length} blocks (parent + children) to page ${pageId}`);
        
        const results = await moveBlocksToPage(
          user.uid,
          draggedBlock.sourcePageId,
          pageId,
          allBlockIds
        );
        
        if (results && results.length > 0) {
          console.log(`Successfully moved ${results.length} blocks!`);
          
          // Add fade-in animation on the target page (if we navigate there)
          setTimeout(() => {
            results.forEach(block => {
              const newBlockElement = document.querySelector(`[data-block-id="${block.id}"]`);
              if (newBlockElement) {
                newBlockElement.classList.add('moving-in');
              }
            });
          }, 100);
        } else {
          console.error('Failed to move blocks');
        }
      } else {
        // Just move the single block
        const result = await moveBlockToPage(
          user.uid,
          draggedBlock.sourcePageId,
          pageId,
          draggedBlock.block.id
        );
        
        if (result) {
          console.log('Block moved successfully!');
        } else {
          console.error('Failed to move block');
        }
      }
    } catch (error) {
      console.error('Error moving block(s):', error);
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