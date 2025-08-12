'use client';

import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { moveBlockToPage, moveBlocksToPage } from '@/lib/firestore';
import { BlockType } from '@/types/index';

interface DraggedBlockData {
  blockId: string;
  sourcePageId: string;
  type: BlockType;
  content: string;
  indentLevel: number;
  isChecked?: boolean;
  sourcePageTitle?: string; // Để hiển thị trong UI
  childBlockIds?: string[]; // IDs of child blocks to move together
}

interface GlobalDragContextType {
  draggedBlock: DraggedBlockData | null;
  setDraggedBlock: (block: DraggedBlockData | null) => void;
  moveBlockToNewPage: (targetPageId: string, order: number) => Promise<string | null>;
  moveBlocksToNewPage: (targetPageId: string, blockIds: string[]) => Promise<string[] | null>;
  isDragging: boolean;
  isMoving: boolean; // New state to show moving animation
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
  const [isMoving, setIsMoving] = useState(false);

  const moveBlockToNewPage = async (targetPageId: string): Promise<string | null> => {
    if (!user || !draggedBlock || draggedBlock.sourcePageId === targetPageId) {
      return null;
    }

    setIsMoving(true); // Start moving animation
    
    try {
      // If there are child blocks, move them all together
      if (draggedBlock.childBlockIds && draggedBlock.childBlockIds.length > 0) {
        const allBlockIds = [draggedBlock.blockId, ...draggedBlock.childBlockIds];
        const movedBlocks = await moveBlocksToPage(
          user.uid,
          draggedBlock.sourcePageId,
          targetPageId,
          allBlockIds
        );
        
        setDraggedBlock(null);
        setIsMoving(false);
        return movedBlocks[0]?.id || null;
      } else {
        // Just move the single block
        const newBlock = await moveBlockToPage(
          user.uid,
          draggedBlock.sourcePageId,
          targetPageId,
          draggedBlock.blockId
        );
        
        setDraggedBlock(null);
        setIsMoving(false);
        return newBlock?.id || null;
      }
    } catch (error) {
      console.error('Error moving block to new page:', error);
      setIsMoving(false);
      return null;
    }
  };
  
  const moveBlocksToNewPage = async (targetPageId: string, blockIds: string[]): Promise<string[] | null> => {
    if (!user || !draggedBlock || draggedBlock.sourcePageId === targetPageId) {
      return null;
    }

    setIsMoving(true);
    
    try {
      const movedBlocks = await moveBlocksToPage(
        user.uid,
        draggedBlock.sourcePageId,
        targetPageId,
        blockIds
      );
      
      setDraggedBlock(null);
      setIsMoving(false);
      return movedBlocks.map(b => b.id);
    } catch (error) {
      console.error('Error moving blocks to new page:', error);
      setIsMoving(false);
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
    moveBlocksToNewPage,
    isDragging: !!draggedBlock,
    isMoving,
    isValidDropTarget,
  };

  return (
    <GlobalDragContext.Provider value={value}>
      {children}
    </GlobalDragContext.Provider>
  );
};
