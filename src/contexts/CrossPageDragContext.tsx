'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Block } from '@/types/index';

interface DraggedBlockInfo {
  block: Block;
  sourcePageId: string;
  sourcePageTitle?: string;
}

interface CrossPageDragContextType {
  draggedBlock: DraggedBlockInfo | null;
  isDraggingCrossPage: boolean;
  startCrossPageDrag: (block: Block, pageId: string, pageTitle?: string) => void;
  endCrossPageDrag: () => void;
  isValidDropTarget: (pageId: string) => boolean;
}

const CrossPageDragContext = createContext<CrossPageDragContextType | undefined>(undefined);

export const useCrossPageDrag = () => {
  const context = useContext(CrossPageDragContext);
  if (!context) {
    throw new Error('useCrossPageDrag must be used within CrossPageDragProvider');
  }
  return context;
};

export const CrossPageDragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draggedBlock, setDraggedBlock] = useState<DraggedBlockInfo | null>(null);

  const startCrossPageDrag = useCallback((block: Block, pageId: string, pageTitle?: string) => {
    setDraggedBlock({
      block,
      sourcePageId: pageId,
      sourcePageTitle: pageTitle
    });
  }, []);

  const endCrossPageDrag = useCallback(() => {
    setDraggedBlock(null);
  }, []);

  const isValidDropTarget = useCallback((pageId: string) => {
    // Don't allow dropping on the same page
    return draggedBlock ? draggedBlock.sourcePageId !== pageId : false;
  }, [draggedBlock]);

  const value: CrossPageDragContextType = {
    draggedBlock,
    isDraggingCrossPage: !!draggedBlock,
    startCrossPageDrag,
    endCrossPageDrag,
    isValidDropTarget
  };

  return (
    <CrossPageDragContext.Provider value={value}>
      {children}
    </CrossPageDragContext.Provider>
  );
};