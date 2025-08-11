'use client';

import React, { useState, useCallback } from 'react';
import { SimpleBlock } from './SimpleBlock';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';
import { useBlocks } from '@/contexts/BlocksContext';
import { ShortcutHelper } from '@/components/ui/ShortcutHelper';
import { SelectionProvider, useSelection } from '@/contexts/SelectionContext';
// import { HistoryProvider, useHistory } from '@/contexts/HistoryContext';
import { BlockType as BType } from '@/types/index';
import { useCrossPageDrag } from '@/contexts/CrossPageDragContext';
import { useGlobalDrag } from '@/contexts/GlobalDragContext';

interface EditorProps {
  pageId: string;
}

interface EditorInnerProps {
  pageId: string;
}

// Inner editor component that uses selection context
const EditorInner: React.FC<EditorInnerProps> = ({ pageId }) => {
  const { blocks, loading } = useBlocks();
  const { 
    createNewBlock, 
    deleteBlockById, 
    updateBlockContent,
    moveBlockUp,
    moveBlockDown,
    indentBlock,
    outdentBlock,
    reorderBlocks
  } = useBlocksWithKeyboard();
  const { startCrossPageDrag, endCrossPageDrag, isDraggingCrossPage } = useCrossPageDrag();
  const { setDraggedBlock } = useGlobalDrag();
  
  // Selection context
  const {
    selectedBlockIds,
    isSelecting,
    selectBlock,
    clearSelection,
    isBlockSelected,
    handleKeyboardSelection
  } = useSelection();
  // const { undo, redo } = useHistory();
  
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedOverBlockId, setDraggedOverBlockId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  // Create a new block after the current one (Notion-style: same type and indent level)
  const handleNewBlock = useCallback(async (blockId: string, type?: BType, indentLevel?: number) => {
    const currentBlockIndex = blocks.findIndex(b => b.id === blockId);
    const currentBlock = blocks[currentBlockIndex];
    
    if (!currentBlock) return;

    // Create new block with same type and indent level as current block
    const newBlockType = type || currentBlock.type;
    const newBlockIndent = indentLevel !== undefined ? indentLevel : currentBlock.indentLevel;
    const newBlockId = await createNewBlock(newBlockType, '', blockId, newBlockIndent);
    
    // Focus the new block
    setTimeout(() => {
      setSelectedBlockId(newBlockId);
      const newBlockElement = document.querySelector(`[data-block-id="${newBlockId}"] textarea`);
      if (newBlockElement) {
        (newBlockElement as HTMLTextAreaElement).focus();
      }
    }, 50);
  }, [blocks, createNewBlock]);

  // Duplicate current block (Notion behavior)
  const handleDuplicateBlock = useCallback(async (blockId: string) => {
    const currentBlock = blocks.find(b => b.id === blockId);
    if (!currentBlock) return;

    // Create new block with same content, type, and indent level
    const newBlockId = await createNewBlock(currentBlock.type, currentBlock.content, blockId, currentBlock.indentLevel);
    
    // Focus the new block
    setTimeout(() => {
      setSelectedBlockId(newBlockId);
      const newBlockElement = document.querySelector(`[data-block-id="${newBlockId}"] textarea`);
      if (newBlockElement) {
        (newBlockElement as HTMLInputElement).focus();
      }
    }, 50);
  }, [blocks, createNewBlock]);

  // Merge current block content up to previous block
  const handleMergeUp = useCallback(async (blockId: string) => {
    const currentBlockIndex = blocks.findIndex(b => b.id === blockId);
    const currentBlock = blocks[currentBlockIndex];
    const previousBlock = blocks[currentBlockIndex - 1];
    
    if (!currentBlock || !previousBlock) return;

    // Merge content
    const mergedContent = previousBlock.content + currentBlock.content;
    await updateBlockContent(previousBlock.id, { content: mergedContent });
    
    // Delete current block
    await deleteBlockById(blockId);
    
    // Focus previous block
    setTimeout(() => {
      setSelectedBlockId(previousBlock.id);
      const prevBlockElement = document.querySelector(`[data-block-id="${previousBlock.id}"] textarea`);
      if (prevBlockElement) {
        const input = prevBlockElement as HTMLTextAreaElement;
        input.focus();
        // Position cursor at the merge point
        input.setSelectionRange(previousBlock.content.length, previousBlock.content.length);
      }
    }, 50);
  }, [blocks, updateBlockContent, deleteBlockById]);

  // Delete current block
  const handleDeleteBlock = useCallback(async (blockId: string) => {
    const currentBlockIndex = blocks.findIndex(b => b.id === blockId);
    
    if (blocks.length === 1) {
      // Don't delete the last block, just clear its content
      await updateBlockContent(blockId, { content: '' });
      return;
    }
    
    // Focus previous or next block
    let focusBlockId: string | null = null;
    if (currentBlockIndex > 0) {
      focusBlockId = blocks[currentBlockIndex - 1].id;
    } else if (currentBlockIndex < blocks.length - 1) {
      focusBlockId = blocks[currentBlockIndex + 1].id;
    }
    
  await deleteBlockById(blockId);
    
    if (focusBlockId) {
      setTimeout(() => {
        setSelectedBlockId(focusBlockId);
        const blockElement = document.querySelector(`[data-block-id="${focusBlockId}"] textarea`);
        if (blockElement) {
          (blockElement as HTMLTextAreaElement).focus();
        }
      }, 50);
    }
  }, [blocks, deleteBlockById, updateBlockContent]);

  // Move block up
  const handleMoveUp = useCallback(async (blockId: string) => {
    await moveBlockUp(blockId);
  }, [moveBlockUp]);

  // Move block down  
  const handleMoveDown = useCallback(async (blockId: string) => {
    await moveBlockDown(blockId);
  }, [moveBlockDown]);

  // Indent block (increase nesting level)
  const handleIndent = useCallback(async (blockId: string) => {
    await indentBlock(blockId);
  }, [indentBlock]);

  // Outdent block (decrease nesting level)
  const handleOutdent = useCallback(async (blockId: string) => {
    await outdentBlock(blockId);
  }, [outdentBlock]);

  const handleBlockSelect = useCallback((blockId: string, event?: React.MouseEvent) => {
    // Check if this is a multi-select operation
    const isCtrlClick = event && (event.ctrlKey || event.metaKey);
    const isShiftClick = event && event.shiftKey;
    
    if (isCtrlClick) {
      // Ctrl+Click: Toggle individual block selection
      if (isBlockSelected(blockId)) {
        // Remove from selection
        const newSelection = new Set(selectedBlockIds);
        newSelection.delete(blockId);
        clearSelection();
        if (newSelection.size > 0) {
          const selectedIds = Array.from(newSelection);
          selectBlock(selectedIds[0], false);
          selectedIds.slice(1).forEach(id => {
            selectBlock(id, true);
          });
        }
      } else {
        // Add to selection
        selectBlock(blockId, selectedBlockIds.size > 0);
      }
    } else if (isShiftClick && selectedBlockId) {
      // Shift+Click: Select range
      const allBlocks = blocks;
      const startIndex = allBlocks.findIndex(b => b.id === selectedBlockId);
      const endIndex = allBlocks.findIndex(b => b.id === blockId);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);
        const rangeBlockIds = allBlocks.slice(start, end + 1).map(b => b.id);
        clearSelection();
        rangeBlockIds.forEach((id, index) => {
          selectBlock(id, index > 0);
        });
      }
    } else {
      // Normal click: Single selection
      clearSelection();
      selectBlock(blockId, false);
      setSelectedBlockId(blockId);
    }
  }, [selectedBlockId, selectedBlockIds, isBlockSelected, selectBlock, clearSelection, blocks]);

  // Handle global keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { key } = e;
    const handled = handleKeyboardSelection(e);
    if (handled) return;

    // Handle bulk operations on selected blocks
    if (selectedBlockIds.size > 1) {
      // Delete multiple blocks
      if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault();
        const blockIds = Array.from(selectedBlockIds);
        // Delete from last to first to maintain indices
        blockIds.sort((a, b) => {
          const indexA = blocks.findIndex(block => block.id === a);
          const indexB = blocks.findIndex(block => block.id === b);
          return indexB - indexA;
        });
        
        blockIds.forEach(blockId => {
          deleteBlockById(blockId);
        });
        clearSelection();
        return;
      }

      // Indent multiple blocks
      if (key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        selectedBlockIds.forEach(blockId => {
          handleIndent(blockId);
        });
        return;
      }

      // Outdent multiple blocks
      if (key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        selectedBlockIds.forEach(blockId => {
          handleOutdent(blockId);
        });
        return;
      }
    }
  }, [handleKeyboardSelection, selectedBlockIds, blocks, deleteBlockById, clearSelection, handleIndent, handleOutdent]);

  // Drag and drop handlers
  const handleDragStart = useCallback((blockId: string) => {
    setDraggedBlockId(blockId);
    
    // Get the block being dragged
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      // Get page title from the document or use pageId
      const pageTitle = document.title || pageId;
      
      // Start cross-page drag
      startCrossPageDrag(block, pageId, pageTitle);
      
      // Also set global drag state for cross-page functionality
      setDraggedBlock({
        blockId: block.id,
        sourcePageId: pageId,
        type: block.type,
        content: block.content,
        indentLevel: block.indentLevel,
        isChecked: block.isChecked,
        sourcePageTitle: pageTitle
      });
    }
  }, [blocks, pageId, startCrossPageDrag, setDraggedBlock]);

  const handleDragEnd = useCallback(() => {
    setDraggedBlockId(null);
    setDraggedOverBlockId(null);
    setDropPosition(null);
    
    // End cross-page drag
    endCrossPageDrag();
    
    // Clear global drag state
    setDraggedBlock(null);
  }, [endCrossPageDrag, setDraggedBlock]);

  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedBlockId && draggedBlockId !== blockId) {
      setDraggedOverBlockId(blockId);
      
      // Calculate drop position based on mouse Y coordinate
      const blockElement = e.currentTarget as HTMLElement;
      const rect = blockElement.getBoundingClientRect();
      const mouseY = e.clientY;
      const blockCenterY = rect.top + rect.height / 2;
      
      // If mouse is in upper half, insert above; if lower half, insert below
      setDropPosition(mouseY < blockCenterY ? 'above' : 'below');
    }
  }, [draggedBlockId]);

  const handleDrop = useCallback(async (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Note: Even if cross-page drag indicator is active, allow in-page reorder here.
    // Cross-page moves are handled by the sidebar; dropping back into the editor
    // should still reorder within the current page.
    
    const sourceBlockId = e.dataTransfer.getData('text/plain');
    
    if (sourceBlockId && sourceBlockId !== targetBlockId) {
      const sourceIndex = blocks.findIndex(b => b.id === sourceBlockId);
      const targetIndex = blocks.findIndex(b => b.id === targetBlockId);
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Create new order for blocks
        const newBlocks = [...blocks];
        const [movedBlock] = newBlocks.splice(sourceIndex, 1);
        
        // Determine insertion index based on drop position
        let insertIndex = targetIndex;
        if (dropPosition === 'below') {
          insertIndex = targetIndex + 1;
        }
        // Adjust for removing source block from earlier position
        if (sourceIndex < insertIndex) {
          insertIndex--;
        }
        
        newBlocks.splice(insertIndex, 0, movedBlock);
        
        // Update orders - reorderBlocks expects array of {id, order}
        const blockUpdates = newBlocks.map((block, index) => ({
          id: block.id,
          order: index
        }));
        
  await reorderBlocks(blockUpdates);
  // No-op: wiring a full history push here is larger; safe minimal change captured
      }
    }
    
  setDraggedBlockId(null);
    setDraggedOverBlockId(null);
    setDropPosition(null);
  }, [blocks, reorderBlocks, dropPosition]);

  // Handle global dragover for the entire editor area
  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    if (draggedBlockId) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    }
  }, [draggedBlockId]);

  // Handle global drop for the entire editor area
  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    if (draggedBlockId) {
      e.preventDefault();
      e.stopPropagation();
      // If dropped in empty space, move to end
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock && draggedBlockId !== lastBlock.id) {
        handleDrop(e, lastBlock.id);
      }
    }
  }, [draggedBlockId, blocks, handleDrop]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (blocks.length === 0) {
    // Only auto-create first block if we have a valid pageId
    if (pageId && pageId !== '') {
      console.log('Auto-creating first block for page:', pageId);
      createNewBlock('paragraph', '');
    }
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Start typing to create your first block...</p>
      </div>
    );
  }

  return (
    <div 
      className="editor-container max-w-4xl mx-auto py-8 px-4 relative"
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
      onKeyDown={handleKeyDown}
      tabIndex={0} // Make div focusable for keyboard events
    >
      {/* Cross-page drag indicator */}
      {isDraggingCrossPage && (
        <div className="mb-4 px-3 py-2 bg-purple-50 border border-purple-200 rounded-md text-sm text-purple-700">
          Drag to a page in the sidebar to move this block
        </div>
      )}
      
      {/* Header with shortcut helper */}
      <div className="flex justify-end mb-4">
        <ShortcutHelper />
      </div>
      
      {/* Selection info */}
      {selectedBlockIds.size > 1 && (
        <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
          {selectedBlockIds.size} blocks selected • Tab/Shift+Tab to indent/outdent • Delete to remove
        </div>
      )}
      
      <div className="space-y-1">
        {blocks.map((block) => (
          <div key={block.id} data-block-id={block.id}>
            <SimpleBlock
              block={block}
              isSelected={selectedBlockId === block.id || isBlockSelected(block.id)}
              isMultiSelected={isBlockSelected(block.id) && selectedBlockIds.size > 1}
              onSelect={(event?: React.MouseEvent) => handleBlockSelect(block.id, event)}
              onNewBlock={() => handleNewBlock(block.id)}
              onCreateBlock={createNewBlock}
              onMergeUp={() => handleMergeUp(block.id)}
              onMoveUp={() => handleMoveUp(block.id)}
              onMoveDown={() => handleMoveDown(block.id)}
              onIndent={() => handleIndent(block.id)}
              onOutdent={() => handleOutdent(block.id)}
              onDeleteBlock={() => handleDeleteBlock(block.id)}
              onDuplicateBlock={() => handleDuplicateBlock(block.id)}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDraggedOver={draggedOverBlockId === block.id}
              isDragging={draggedBlockId === block.id}
              dropPosition={draggedOverBlockId === block.id ? dropPosition : null}
            />
          </div>
        ))}
      </div>
      
      {/* Notion-style clickable area below content */}
      <div
        className="min-h-[200px] w-full cursor-text"
        onDragOver={handleGlobalDragOver}
        onDrop={handleGlobalDrop}
        onClick={async () => {
          // Only create new block on direct click, not after drag selection
          if (!isSelecting) {
            // Clear selection when clicking in empty area
            clearSelection();
            
            const newBlockId = await createNewBlock('paragraph', '');
            setTimeout(() => {
              setSelectedBlockId(newBlockId);
              selectBlock(newBlockId, false);
              const newBlockElement = document.querySelector(`[data-block-id="${newBlockId}"] textarea`);
              if (newBlockElement) {
                (newBlockElement as HTMLTextAreaElement).focus();
              }
            }, 50);
          }
        }}
      />
      
  {/* Drag selection overlay removed */}
    </div>
  );
};

// Main Editor component with SelectionProvider wrapper
export const Editor: React.FC<EditorProps> = ({ pageId }) => {
  const { blocks } = useBlocks();
  
  const getAllBlocks = useCallback(() => {
    return blocks.map(block => ({ id: block.id }));
  }, [blocks]);

  return (
    <SelectionProvider getAllBlocks={getAllBlocks}>
      <EditorInner pageId={pageId} />
    </SelectionProvider>
  );
};
