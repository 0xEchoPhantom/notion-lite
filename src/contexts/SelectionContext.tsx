'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface SelectionContextType {
  selectedBlockIds: Set<string>;
  isSelecting: boolean;
  isMultiSelectMode: boolean;
  selectionStartId: string | null;
  selectionBox: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;
  
  // Selection methods
  selectBlock: (blockId: string, addToSelection?: boolean) => void;
  selectMultipleBlocks: (blockIds: string[]) => void;
  clearSelection: () => void;
  toggleBlockSelection: (blockId: string) => void;
  isBlockSelected: (blockId: string) => boolean;
  selectAllBlocks: () => void;
  
  // Mouse selection methods
  startMouseSelection: (e: React.MouseEvent) => void;
  updateMouseSelection: (e: React.MouseEvent) => void;
  endMouseSelection: () => void;
  
  // Keyboard selection methods
  handleKeyboardSelection: (e: React.KeyboardEvent) => boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};

interface SelectionProviderProps {
  children: React.ReactNode;
  getAllBlocks: () => { id: string; }[];
}

export const SelectionProvider: React.FC<SelectionProviderProps> = ({ children, getAllBlocks }) => {
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectionStartId, setSelectionStartId] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  
  const isMouseDownRef = useRef(false);
  const startElementRef = useRef<Element | null>(null);
  const ctrlSelectModeRef = useRef(false);

  // Single block selection
  const selectBlock = useCallback((blockId: string, addToSelection = false) => {
    setSelectedBlockIds(prev => {
      const newSelection = new Set(addToSelection ? prev : []);
      newSelection.add(blockId);
      return newSelection;
    });
    setSelectionStartId(blockId);
    setIsMultiSelectMode(addToSelection);
  }, []);

  // Multiple block selection
  const selectMultipleBlocks = useCallback((blockIds: string[]) => {
    setSelectedBlockIds(new Set(blockIds));
    setIsMultiSelectMode(true);
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedBlockIds(new Set());
    setIsMultiSelectMode(false);
    setSelectionStartId(null);
  }, []);

  // Toggle single block selection
  const toggleBlockSelection = useCallback((blockId: string) => {
    setSelectedBlockIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(blockId)) {
        newSelection.delete(blockId);
      } else {
        newSelection.add(blockId);
      }
      setIsMultiSelectMode(newSelection.size > 1);
      return newSelection;
    });
  }, []);

  // Check if block is selected
  const isBlockSelected = useCallback((blockId: string) => {
    return selectedBlockIds.has(blockId);
  }, [selectedBlockIds]);

  // Select all blocks on page
  const selectAllBlocks = useCallback(() => {
    const allBlocks = getAllBlocks();
    const allBlockIds = allBlocks.map(block => block.id);
    setSelectedBlockIds(new Set(allBlockIds));
    setIsMultiSelectMode(true);
  }, [getAllBlocks]);

  // Start mouse selection
  const startMouseSelection = useCallback((e: React.MouseEvent) => {
    // Only start selection if not clicking on an input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    // Check if Ctrl/Cmd is held for additive selection
    ctrlSelectModeRef.current = e.ctrlKey || e.metaKey;
    
    if (!ctrlSelectModeRef.current) {
      clearSelection();
    }

    setIsSelecting(true);
    isMouseDownRef.current = true;
    startElementRef.current = e.currentTarget as Element;
    
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    setSelectionBox({
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });
  }, [clearSelection]);

  // Get blocks within selection box
  const getBlocksInSelectionBox = useCallback((box: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }) => {
    const selectedIds: string[] = [];
    
    // Calculate selection rectangle
    const left = Math.min(box.startX, box.currentX);
    const right = Math.max(box.startX, box.currentX);
    const top = Math.min(box.startY, box.currentY);
    const bottom = Math.max(box.startY, box.currentY);

    // Find all block elements
    const blockElements = document.querySelectorAll('[data-block-id]');
    const containerRect = startElementRef.current?.getBoundingClientRect();
    
    if (!containerRect) return selectedIds;

    blockElements.forEach(element => {
      const blockRect = element.getBoundingClientRect();
      const blockId = element.getAttribute('data-block-id');
      
      if (!blockId) return;

      // Convert block position to container-relative coordinates
      const blockLeft = blockRect.left - containerRect.left;
      const blockRight = blockRect.right - containerRect.left;
      const blockTop = blockRect.top - containerRect.top;
      const blockBottom = blockRect.bottom - containerRect.top;

      // Check if block intersects with selection box
      const intersects = !(
        blockRight < left || 
        blockLeft > right || 
        blockBottom < top || 
        blockTop > bottom
      );

      if (intersects) {
        selectedIds.push(blockId);
      }
    });

    return selectedIds;
  }, []);

  // Update mouse selection
  const updateMouseSelection = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !isMouseDownRef.current || !startElementRef.current) return;

    const rect = startElementRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setSelectionBox(prev => prev ? {
      ...prev,
      currentX,
      currentY,
    } : null);

    // Find blocks within selection box
    const selectedIds = getBlocksInSelectionBox({
      startX: selectionBox?.startX || 0,
      startY: selectionBox?.startY || 0,
      currentX,
      currentY,
    });

    if (ctrlSelectModeRef.current) {
      // Add to existing selection
      setSelectedBlockIds(prev => {
        const newSelection = new Set(prev);
        selectedIds.forEach(id => newSelection.add(id));
        return newSelection;
      });
    } else {
      // Replace selection
      setSelectedBlockIds(new Set(selectedIds));
    }
    
    setIsMultiSelectMode(selectedIds.length > 1);
  }, [isSelecting, selectionBox, getBlocksInSelectionBox]);

  // End mouse selection
  const endMouseSelection = useCallback(() => {
    setIsSelecting(false);
    isMouseDownRef.current = false;
    startElementRef.current = null;
    setSelectionBox(null);
    ctrlSelectModeRef.current = false;
  }, []);

  // Handle keyboard selection (Ctrl+A behavior)
  const handleKeyboardSelection = useCallback((e: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey } = e;
    const cmdKey = ctrlKey || metaKey;

    // Ctrl+A behavior: first selects text, second selects blocks
    if (cmdKey && key === 'a') {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const isAllTextSelected = target.selectionStart === 0 && target.selectionEnd === target.value.length;
        const isEmptyBlock = target.value.length === 0;
        
        // If all text is already selected OR block is empty, select all blocks
        if (isAllTextSelected || isEmptyBlock) {
          e.preventDefault();
          selectAllBlocks();
          target.blur(); // Remove focus to show block selection
          return true;
        }
        // Otherwise, let the default Ctrl+A behavior select all text
        return false;
      } else {
        // Not in an input, select all blocks
        e.preventDefault();
        selectAllBlocks();
        return true;
      }
    }

    // Escape to clear selection
    if (key === 'Escape') {
      if (selectedBlockIds.size > 0) {
        clearSelection();
        return true;
      }
    }

    return false;
  }, [selectAllBlocks, clearSelection, selectedBlockIds.size]);

  // Global mouse events for selection
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isSelecting && isMouseDownRef.current) {
        // Create a synthetic React mouse event
        const syntheticEvent = {
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        } as React.MouseEvent;
        updateMouseSelection(syntheticEvent);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isMouseDownRef.current) {
        endMouseSelection();
      }
    };

    if (isSelecting) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting, updateMouseSelection, endMouseSelection]);

  const value: SelectionContextType = {
    selectedBlockIds,
    isSelecting,
    isMultiSelectMode,
    selectionStartId,
    selectionBox,
    selectBlock,
    selectMultipleBlocks,
    clearSelection,
    toggleBlockSelection,
    isBlockSelected,
    selectAllBlocks,
    startMouseSelection,
    updateMouseSelection,
    endMouseSelection,
    handleKeyboardSelection,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
      {/* Selection overlay box */}
      {selectionBox && isSelecting && (
        <div
          className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/10 z-10"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
        />
      )}
    </SelectionContext.Provider>
  );
};
