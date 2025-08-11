'use client';

import React, { useState, useCallback } from 'react';
import { SimpleBlock } from './SimpleBlock';
import { SimpleDropZone } from './SimpleDropZone';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';
import { useBlocks } from '@/contexts/BlocksContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStatusConsistency } from '@/hooks/useStatusConsistency';
import { ShortcutHelper } from '@/components/ui/ShortcutHelper';
import { SelectionProvider, useSelection } from '@/contexts/SelectionContext';
// import { HistoryProvider, useHistory } from '@/contexts/HistoryContext';
import { BlockType as BType } from '@/types/index';
import { useFocusManager, useKeystrokeProtection } from '@/hooks/useKeystrokeLock';
import { KeystrokeIndicator } from '@/components/ui/KeystrokeIndicator';
import { moveBlockToPage } from '@/lib/firestore';

interface EditorProps {
  pageId: string;
  mode?: 'notes' | 'gtd';
}

interface EditorInnerProps {
  pageId: string;
  mode?: 'notes' | 'gtd';
}

// Inner editor component that uses selection context
const EditorInner: React.FC<EditorInnerProps> = ({ pageId, mode = 'notes' }) => {
  const { blocks, loading } = useBlocks();
  const { user } = useAuth();
  const focusManager = useFocusManager();
  const keystrokeProtection = useKeystrokeProtection();
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

  // Ensure status consistency for GTD blocks
  useStatusConsistency(blocks, pageId);

  // Create a new block after the current one (Notion-style: same type and indent level)
  const handleNewBlock = useCallback(async (blockId: string, type?: BType, indentLevel?: number) => {
    const currentBlockIndex = blocks.findIndex(b => b.id === blockId);
    const currentBlock = blocks[currentBlockIndex];
    
    if (!currentBlock) return;

    // Determine new block type
    let newBlockType = type || currentBlock.type;
    
    // In GTD mode, restrict block types to only todo-list and paragraph
    if (mode === 'gtd') {
      // If the requested type is not allowed in GTD mode, default to paragraph
      if (newBlockType !== 'todo-list' && newBlockType !== 'paragraph') {
        newBlockType = 'paragraph';
      }
    }
    
    const newBlockIndent = indentLevel !== undefined ? indentLevel : currentBlock.indentLevel;
    const newBlockId = await createNewBlock(newBlockType, '', blockId, newBlockIndent);
    
    // Focus the new block using focus manager
    setSelectedBlockId(newBlockId);
    await focusManager.focusBlock(newBlockId);
  }, [blocks, createNewBlock, mode, focusManager, setSelectedBlockId]);

  // Duplicate current block (Notion behavior)
  const handleDuplicateBlock = useCallback(async (blockId: string) => {
    const currentBlock = blocks.find(b => b.id === blockId);
    if (!currentBlock) return;

    // Create new block with same content, type, and indent level
    const newBlockId = await createNewBlock(currentBlock.type, currentBlock.content, blockId, currentBlock.indentLevel);
    
    // Focus the new block using focus manager
    setSelectedBlockId(newBlockId);
    await focusManager.focusBlock(newBlockId);
  }, [blocks, createNewBlock, focusManager, setSelectedBlockId]);

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

  // Open GTD move dialog - now used for immediate move to specific page
  // Handle drag and drop reordering
  const handleBlockReorder = useCallback(async (draggedBlockId: string, targetBlockId: string, position: 'above' | 'below') => {
    if (!user || draggedBlockId === targetBlockId) return;
    
    console.log(`Reordering: Moving ${draggedBlockId} ${position} ${targetBlockId}`);
    
    // Find source and target blocks
    const sourceBlock = blocks.find(b => b.id === draggedBlockId);
    const targetBlock = blocks.find(b => b.id === targetBlockId);
    
    if (!sourceBlock || !targetBlock) return;

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
      await reorderBlocks(updates);
    }
  }, [user, blocks, reorderBlocks]);

  const handleMoveToGTDPage = useCallback(async (blockId: string, targetPageId: string) => {
    if (!user) return;

    try {
      // Move the block to the selected GTD page (always append to end)
      const result = await moveBlockToPage(
        user.uid,
        pageId, // current page
        targetPageId, // selected GTD page
        blockId
        // No order parameter - will automatically append to end
      );
      
      if (result) {
        // The block will be automatically removed from current page by Firestore subscription
        // Show success message (you could replace this with a toast notification)
        console.log(`Block moved to GTD ${targetPageId} successfully!`);
      } else {
        console.error('Failed to move block to GTD');
      }
    } catch (error) {
      console.error('Error moving block to GTD:', error);
    }
  }, [pageId, user]);

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
      onKeyDown={handleKeyDown}
      tabIndex={0} // Make div focusable for keyboard events
    >
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
          <SimpleDropZone 
            key={block.id}
            blockId={block.id}
            onDrop={handleBlockReorder}
          >
            <div data-block-id={block.id}>
              <SimpleBlock
                block={block}
                pageId={pageId}
                pageTitle={document.title || pageId}
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
                onMoveToGTDPage={(blockId, targetPageId) => handleMoveToGTDPage(blockId, targetPageId)}
                mode={mode}
              />
            </div>
          </SimpleDropZone>
        ))}
      </div>
      
      {/* Notion-style clickable area below content */}
      <div
        className="min-h-[200px] w-full cursor-text"
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
      
      {/* Keystroke operation indicator */}
      <KeystrokeIndicator 
        isCreating={keystrokeProtection.lockState.isCreating}
        isDeleting={keystrokeProtection.lockState.isDeleting}
        isLocked={keystrokeProtection.lockState.isLocked}
      />
      
  {/* Drag selection overlay removed */}
    </div>
  );
};

// Main Editor component with SelectionProvider wrapper
export const Editor: React.FC<EditorProps> = ({ pageId, mode = 'notes' }) => {
  const { blocks } = useBlocks();
  
  const getAllBlocks = useCallback(() => {
    return blocks.map(block => ({ id: block.id }));
  }, [blocks]);

  return (
    <SelectionProvider getAllBlocks={getAllBlocks}>
      <EditorInner pageId={pageId} mode={mode} />
    </SelectionProvider>
  );
};
