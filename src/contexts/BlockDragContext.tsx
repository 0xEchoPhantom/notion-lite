'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Block } from '@/types/index';
import { useAuth } from './AuthContext';
import { moveBlockToPage, reorderBlocks } from '@/lib/firestore';

interface DraggedBlock {
  block: Block;
  sourcePageId: string;
  sourcePageTitle?: string;
  dragElement?: HTMLElement;
  initialMouseY?: number;
}

interface DropIndicator {
  blockId: string;
  position: 'above' | 'below';
}

interface BlockDragContextType {
  // Drag state
  draggedBlock: DraggedBlock | null;
  isDragging: boolean;
  dropIndicator: DropIndicator | null;
  dragPreview: { x: number; y: number } | null;
  
  // Actions
  startDrag: (block: Block, pageId: string, pageTitle?: string, event?: React.DragEvent | React.MouseEvent) => void;
  endDrag: () => void;
  updateDropIndicator: (blockId: string | null, position: 'above' | 'below') => void;
  updateDragPreview: (x: number, y: number) => void;
  
  // Operations
  moveToPage: (targetPageId: string) => Promise<boolean>;
  reorderInCurrentPage: (targetBlockId: string, position: 'above' | 'below', blocks: Block[]) => Promise<boolean>;
  
  // Validation
  isValidDropTarget: (pageId: string) => boolean;
  canDropOnBlock: (blockId: string) => boolean;
}

const BlockDragContext = createContext<BlockDragContextType | undefined>(undefined);

export const useBlockDrag = () => {
  const context = useContext(BlockDragContext);
  if (!context) {
    throw new Error('useBlockDrag must be used within BlockDragProvider');
  }
  return context;
};

export const BlockDragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [draggedBlock, setDraggedBlock] = useState<DraggedBlock | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number } | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  // Start dragging
  const startDrag = useCallback((
    block: Block, 
    pageId: string, 
    pageTitle?: string,
    event?: React.DragEvent | React.MouseEvent
  ) => {
    setDraggedBlock({
      block,
      sourcePageId: pageId,
      sourcePageTitle: pageTitle,
      initialMouseY: event ? event.clientY : undefined
    });

    // Set custom drag image if event is provided
    if (event && 'dataTransfer' in event) {
      const dragEvent = event as React.DragEvent;
      
      // Create a custom drag preview
      const preview = document.createElement('div');
      preview.style.position = 'absolute';
      preview.style.top = '-1000px';
      preview.style.left = '-1000px';
      preview.style.padding = '8px 12px';
      preview.style.backgroundColor = 'white';
      preview.style.border = '1px solid #e5e7eb';
      preview.style.borderRadius = '6px';
      preview.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      preview.style.fontSize = '14px';
      preview.style.maxWidth = '300px';
      preview.style.overflow = 'hidden';
      preview.style.textOverflow = 'ellipsis';
      preview.style.whiteSpace = 'nowrap';
      preview.textContent = block.content || 'Empty block';
      
      document.body.appendChild(preview);
      dragEvent.dataTransfer.setDragImage(preview, 0, 0);
      
      // Clean up preview after drag starts
      setTimeout(() => {
        document.body.removeChild(preview);
      }, 0);
      
      // Set drag effect
      dragEvent.dataTransfer.effectAllowed = 'move';
    }
  }, []);

  // End dragging
  const endDrag = useCallback(() => {
    setDraggedBlock(null);
    setDropIndicator(null);
    setDragPreview(null);
  }, []);

  // Update drop indicator
  const updateDropIndicator = useCallback((blockId: string | null, position: 'above' | 'below') => {
    if (blockId) {
      setDropIndicator({ blockId, position });
    } else {
      setDropIndicator(null);
    }
  }, []);

  // Update drag preview position
  const updateDragPreview = useCallback((x: number, y: number) => {
    setDragPreview({ x, y });
  }, []);

  // Move block to a different page
  const moveToPage = useCallback(async (targetPageId: string): Promise<boolean> => {
    if (!user || !draggedBlock || draggedBlock.sourcePageId === targetPageId) {
      return false;
    }

    try {
      const result = await moveBlockToPage(
        user.uid,
        draggedBlock.sourcePageId,
        targetPageId,
        draggedBlock.block.id
      );
      
      if (result) {
        endDrag();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error moving block to page:', error);
      return false;
    }
  }, [user, draggedBlock, endDrag]);

  // Reorder blocks within the same page
  const reorderInCurrentPage = useCallback(async (
    targetBlockId: string, 
    position: 'above' | 'below',
    blocks: Block[]
  ): Promise<boolean> => {
    if (!user || !draggedBlock || draggedBlock.block.id === targetBlockId) {
      return false;
    }

    try {
      // Find source and target blocks
      const sourceBlock = blocks.find(b => b.id === draggedBlock.block.id);
      const targetBlock = blocks.find(b => b.id === targetBlockId);
      
      if (!sourceBlock || !targetBlock) return false;

      // Sort blocks by order
      const sortedBlocks = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Remove source block from the list
      const filteredBlocks = sortedBlocks.filter(b => b.id !== sourceBlock.id);
      
      // Find target index in filtered list
      const targetIndex = filteredBlocks.findIndex(b => b.id === targetBlockId);
      
      // Calculate new position
      let insertIndex: number;
      if (position === 'above') {
        insertIndex = targetIndex;
      } else {
        insertIndex = targetIndex + 1;
      }
      
      // Insert source block at new position
      filteredBlocks.splice(insertIndex, 0, sourceBlock);
      
      // Update orders for all affected blocks
      const updates: { id: string; order: number }[] = [];
      filteredBlocks.forEach((block, index) => {
        const newOrder = index * 1000; // Use larger gaps for easier future insertions
        if (block.order !== newOrder) {
          updates.push({ id: block.id, order: newOrder });
        }
      });
      
      if (updates.length > 0) {
        await reorderBlocks(user.uid, updates);
      }
      
      endDrag();
      return true;
    } catch (error) {
      console.error('Error reordering blocks:', error);
      return false;
    }
  }, [user, draggedBlock, endDrag]);

  // Check if page is a valid drop target
  const isValidDropTarget = useCallback((pageId: string): boolean => {
    return draggedBlock !== null && draggedBlock.sourcePageId !== pageId;
  }, [draggedBlock]);

  // Check if can drop on a specific block
  const canDropOnBlock = useCallback((blockId: string): boolean => {
    return draggedBlock !== null && draggedBlock.block.id !== blockId;
  }, [draggedBlock]);

  const value: BlockDragContextType = {
    draggedBlock,
    isDragging: !!draggedBlock,
    dropIndicator,
    dragPreview,
    startDrag,
    endDrag,
    updateDropIndicator,
    updateDragPreview,
    moveToPage,
    reorderInCurrentPage,
    isValidDropTarget,
    canDropOnBlock
  };

  return (
    <BlockDragContext.Provider value={value}>
      {children}
      
      {/* Drag preview overlay */}
      {dragPreview && draggedBlock && (
        <div
          ref={dragImageRef}
          className="fixed pointer-events-none z-[9999] px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate"
          style={{
            left: `${dragPreview.x + 10}px`,
            top: `${dragPreview.y + 10}px`,
          }}
        >
          {draggedBlock.block.content || 'Empty block'}
        </div>
      )}
    </BlockDragContext.Provider>
  );
};