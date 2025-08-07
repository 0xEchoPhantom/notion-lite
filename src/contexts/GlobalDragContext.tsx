'use client';

import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { moveBlockToPage } from '@/lib/firestore';
import { BlockType } from '@/types';

interface DraggedBlockData {
  blockId: string;
  sourcePageId: string;
  type: BlockType;
  content: string;
  indentLevel: number;
  isChecked?: boolean;
}

interface GlobalDragContextType {
  draggedBlock: DraggedBlockData | null;
  setDraggedBlock: (block: DraggedBlockData | null) => void;
  moveBlockToNewPage: (targetPageId: string, order: number) => Promise<string | null>;
  isDragging: boolean;
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

  const moveBlockToNewPage = async (targetPageId: string, order: number = 0): Promise<string | null> => {
    if (!user || !draggedBlock || draggedBlock.sourcePageId === targetPageId) {
      return null;
    }

    try {
      const newBlockId = await moveBlockToPage(
        user.uid,
        draggedBlock.sourcePageId,
        targetPageId,
        draggedBlock.blockId,
        order
      );
      
      setDraggedBlock(null);
      return newBlockId;
    } catch (error) {
      console.error('Error moving block to new page:', error);
      return null;
    }
  };

  const value = {
    draggedBlock,
    setDraggedBlock: (block: DraggedBlockData | null) => {
      setDraggedBlock(block ? { ...block, sourcePageId: currentPageId } : null);
    },
    moveBlockToNewPage,
    isDragging: !!draggedBlock,
  };

  return (
    <GlobalDragContext.Provider value={value}>
      {children}
    </GlobalDragContext.Provider>
  );
};
