'use client';

import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { moveBlockToPage } from '@/lib/firestore';
import { BlockType } from '@/types/index';

interface DraggedBlockData {
  blockId: string;
  sourcePageId: string;
  type: BlockType;
  content: string;
  indentLevel: number;
  isChecked?: boolean;
  sourcePageTitle?: string; // Để hiển thị trong UI
}

interface GlobalDragContextType {
  draggedBlock: DraggedBlockData | null;
  setDraggedBlock: (block: DraggedBlockData | null) => void;
  moveBlockToNewPage: (targetPageId: string, order: number) => Promise<string | null>;
  isDragging: boolean;
  isValidDropTarget: (targetPageId: string) => boolean;
}

const GlobalDragContext = createContext<GlobalDragContextType | undefined>(undefined);

export const useGlobalDrag = () => {
  const context = useContext(GlobalDragContext);
  if (context === undefined) {
    throw new Error('useGlobalDrag must be used within a GlobalDragProvider');
  }
  return context;
};

interface GlobalDragProviderProps {
  children: React.ReactNode;
  currentPageId: string;
}

export const GlobalDragProvider: React.FC<GlobalDragProviderProps> = ({ 
  children, 
  currentPageId 
}) => {
  const { user } = useAuth();
  const [draggedBlock, setDraggedBlock] = useState<DraggedBlockData | null>(null);

  const moveBlockToNewPage = async (targetPageId: string): Promise<string | null> => {
    if (!user || !draggedBlock || draggedBlock.sourcePageId === targetPageId) {
      return null;
    }

    try {
      const newBlock = await moveBlockToPage(
        user.uid,
        draggedBlock.sourcePageId,
        targetPageId,
        draggedBlock.blockId
        // No order parameter - will automatically append to end
      );
      
      setDraggedBlock(null);
      return newBlock?.id || null;
    } catch (error) {
      console.error('Error moving block to new page:', error);
      return null;
    }
  };

  const isValidDropTarget = (targetPageId: string): boolean => {
    return draggedBlock !== null && draggedBlock.sourcePageId !== targetPageId;
  };

  const value = {
    draggedBlock,
    setDraggedBlock: (block: DraggedBlockData | null) => {
      // Don't override sourcePageId if it's already set
      setDraggedBlock(block ? { 
        ...block, 
        sourcePageId: block.sourcePageId || currentPageId 
      } : null);
    },
    moveBlockToNewPage,
    isDragging: !!draggedBlock,
    isValidDropTarget,
  };

  return (
    <GlobalDragContext.Provider value={value}>
      {children}
    </GlobalDragContext.Provider>
  );
};
