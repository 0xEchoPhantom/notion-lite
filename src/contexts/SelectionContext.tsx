'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface SelectionContextType {
  selectedBlockIds: Set<string>;
  isSelecting: boolean; // reserved, but drag-to-select is disabled
  isMultiSelectMode: boolean;
  selectionStartId: string | null;
  selectionBox: null;
  
  // Selection methods
  selectBlock: (blockId: string, addToSelection?: boolean) => void;
  selectMultipleBlocks: (blockIds: string[]) => void;
  clearSelection: () => void;
  toggleBlockSelection: (blockId: string) => void;
  isBlockSelected: (blockId: string) => boolean;
  selectAllBlocks: () => void;
  
  // Mouse drag selection disabled
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
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectionStartId, setSelectionStartId] = useState<string | null>(null);

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
  const startMouseSelection = useCallback(() => {
    // Drag-to-select disabled
  }, []);

  // Update mouse selection
  const updateMouseSelection = useCallback(() => {
    // Drag-to-select disabled
  }, []);

  // End mouse selection
  const endMouseSelection = useCallback(() => {
    // Drag-to-select disabled
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

  // Global listeners removed; drag-to-select disabled

  const value: SelectionContextType = {
    selectedBlockIds,
  isSelecting: false,
    isMultiSelectMode,
    selectionStartId,
  selectionBox: null,
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
    </SelectionContext.Provider>
  );
};
