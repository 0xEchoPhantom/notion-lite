'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Block } from '@/types/index';
import { useAuth } from './AuthContext';
import { moveBlockToPage } from '@/lib/firestore';

interface DraggedBlock {
  block: Block;
  sourcePageId: string;
  sourcePageTitle?: string;
}

interface DragContextType {
  draggedBlock: DraggedBlock | null;
  isDragging: boolean;
  startDrag: (block: Block, pageId: string, pageTitle?: string) => void;
  endDrag: () => void;
  moveToPage: (targetPageId: string, order?: number) => Promise<boolean>;
  reorderInPage: (targetBlockId: string, position: 'above' | 'below') => Promise<boolean>;
  isValidDropTarget: (pageId: string) => boolean;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export const useDrag = () => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDrag must be used within DragProvider');
  }
  return context;
};

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [draggedBlock, setDraggedBlock] = useState<DraggedBlock | null>(null);

  const startDrag = useCallback((block: Block, pageId: string, pageTitle?: string) => {
    setDraggedBlock({
      block,
      sourcePageId: pageId,
      sourcePageTitle: pageTitle
    });
  }, []);

  const endDrag = useCallback(() => {
    setDraggedBlock(null);
  }, []);

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
        // No order parameter - will automatically append to end
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

  const reorderInPage = useCallback(async (targetBlockId: string, position: 'above' | 'below'): Promise<boolean> => {
    if (!user || !draggedBlock || draggedBlock.block.id === targetBlockId) {
      return false;
    }

    try {
      // This would need implementation in firestore.ts
      // For now, just end the drag
      endDrag();
      return true;
    } catch (error) {
      console.error('Error reordering block:', error);
      return false;
    }
  }, [user, draggedBlock, endDrag]);

  const isValidDropTarget = useCallback((pageId: string): boolean => {
    return draggedBlock !== null && draggedBlock.sourcePageId !== pageId;
  }, [draggedBlock]);

  const value: DragContextType = {
    draggedBlock,
    isDragging: !!draggedBlock,
    startDrag,
    endDrag,
    moveToPage,
    reorderInPage,
    isValidDropTarget
  };

  return (
    <DragContext.Provider value={value}>
      {children}
    </DragContext.Provider>
  );
};