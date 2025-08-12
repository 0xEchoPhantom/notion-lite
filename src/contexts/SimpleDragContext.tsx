'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Block } from '@/types/index';

interface DraggedBlockData {
  block: Block;
  sourcePageId: string;
  sourcePageTitle?: string;
  childBlockIds?: string[]; // IDs of child blocks being dragged
}

interface SimpleDragContextType {
  draggedBlock: DraggedBlockData | null;
  isDragging: boolean;
  startDrag: (block: Block, pageId: string, pageTitle?: string, childBlockIds?: string[]) => void;
  endDrag: () => void;
  getDraggedBlock: () => DraggedBlockData | null;
}

const SimpleDragContext = createContext<SimpleDragContextType | undefined>(undefined);

export const useSimpleDrag = () => {
  const context = useContext(SimpleDragContext);
  if (!context) {
    throw new Error('useSimpleDrag must be used within SimpleDragProvider');
  }
  return context;
};

const DRAG_STORAGE_KEY = 'notion-lite-dragged-block';

export const SimpleDragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draggedBlock, setDraggedBlock] = useState<DraggedBlockData | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Listen for storage events to sync drag state across components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DRAG_STORAGE_KEY) {
        if (e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            setDraggedBlock(data);
            setIsDragging(true);
          } catch (err) {
            console.error('Error parsing drag data:', err);
          }
        } else {
          setDraggedBlock(null);
          setIsDragging(false);
        }
      }
    };

    // Also listen for custom events within the same window
    const handleCustomDragStart = (e: CustomEvent) => {
      setDraggedBlock(e.detail);
      setIsDragging(true);
    };

    const handleCustomDragEnd = () => {
      setDraggedBlock(null);
      setIsDragging(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('notion-drag-start', handleCustomDragStart as EventListener);
    window.addEventListener('notion-drag-end', handleCustomDragEnd);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('notion-drag-start', handleCustomDragStart as EventListener);
      window.removeEventListener('notion-drag-end', handleCustomDragEnd);
    };
  }, []);

  const startDrag = useCallback((block: Block, pageId: string, pageTitle?: string, childBlockIds?: string[]) => {
    const dragData: DraggedBlockData = {
      block,
      sourcePageId: pageId,
      sourcePageTitle: pageTitle,
      childBlockIds
    };

    // Store in sessionStorage for cross-component access
    sessionStorage.setItem(DRAG_STORAGE_KEY, JSON.stringify(dragData));
    
    // Dispatch custom event for same-window components
    window.dispatchEvent(new CustomEvent('notion-drag-start', { detail: dragData }));
    
    setDraggedBlock(dragData);
    setIsDragging(true);
    
    console.log('Started dragging block:', block.id, 'from page:', pageId);
  }, []);

  const endDrag = useCallback(() => {
    // Clear from sessionStorage
    sessionStorage.removeItem(DRAG_STORAGE_KEY);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('notion-drag-end'));
    
    setDraggedBlock(null);
    setIsDragging(false);
    
    console.log('Ended drag');
  }, []);

  const getDraggedBlock = useCallback((): DraggedBlockData | null => {
    // Try to get from state first
    if (draggedBlock) return draggedBlock;
    
    // Fall back to sessionStorage
    const stored = sessionStorage.getItem(DRAG_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        console.error('Error parsing stored drag data:', err);
      }
    }
    
    return null;
  }, [draggedBlock]);

  const value: SimpleDragContextType = {
    draggedBlock,
    isDragging,
    startDrag,
    endDrag,
    getDraggedBlock
  };

  return (
    <SimpleDragContext.Provider value={value}>
      {children}
    </SimpleDragContext.Provider>
  );
};