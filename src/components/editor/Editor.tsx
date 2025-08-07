'use client';

import React, { useState, useCallback } from 'react';
import { SimpleBlock } from './SimpleBlock';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';
import { useBlocks } from '@/contexts/BlocksContext';
import { ShortcutHelper } from '@/components/ui/ShortcutHelper';
import { BlockType as BType } from '@/types';

interface EditorProps {
  pageId: string;
}

export const Editor: React.FC<EditorProps> = () => {
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
    
    // Set selection immediately for instant UI feedback
    setSelectedBlockId(newBlockId);
    
    // Focus the new block with minimal delay for DOM update
    setTimeout(() => {
      const newBlockElement = document.querySelector(`[data-block-id="${newBlockId}"] input`);
      if (newBlockElement) {
        (newBlockElement as HTMLInputElement).focus();
      }
    }, 10); // Reduced from 50ms to 10ms for better responsiveness
  }, [blocks, createNewBlock]);

  // Duplicate current block (Notion behavior)
  const handleDuplicateBlock = useCallback(async (blockId: string) => {
    const currentBlock = blocks.find(b => b.id === blockId);
    if (!currentBlock) return;

    // Create new block with same content, type, and indent level
    const newBlockId = await createNewBlock(currentBlock.type, currentBlock.content, blockId, currentBlock.indentLevel);
    
    // Set selection immediately for instant UI feedback
    setSelectedBlockId(newBlockId);
    
    // Focus the new block with minimal delay
    setTimeout(() => {
      const newBlockElement = document.querySelector(`[data-block-id="${newBlockId}"] input`);
      if (newBlockElement) {
        (newBlockElement as HTMLInputElement).focus();
      }
    }, 10); // Reduced from 50ms to 10ms for better responsiveness
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
      const prevBlockElement = document.querySelector(`[data-block-id="${previousBlock.id}"] input`);
      if (prevBlockElement) {
        const input = prevBlockElement as HTMLInputElement;
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
        const blockElement = document.querySelector(`[data-block-id="${focusBlockId}"] input`);
        if (blockElement) {
          (blockElement as HTMLInputElement).focus();
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

  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((blockId: string) => {
    setDraggedBlockId(blockId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedBlockId(null);
    setDraggedOverBlockId(null);
    setDropPosition(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
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
        
        // Update orders
        const updatedBlocks = newBlocks.map((block, index) => ({
          ...block,
          order: index
        }));
        
        await reorderBlocks(updatedBlocks);
      }
    }
    
    setDraggedBlockId(null);
    setDraggedOverBlockId(null);
    setDropPosition(null);
  }, [blocks, reorderBlocks, dropPosition]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (blocks.length === 0) {
    // Auto-create first block
    createNewBlock('paragraph', '');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header with shortcut helper */}
      <div className="flex justify-end mb-4">
        <ShortcutHelper />
      </div>
      
      <div className="space-y-1">
        {blocks.map((block) => (
          <div key={block.id} data-block-id={block.id}>
            <SimpleBlock
              block={block}
              isSelected={selectedBlockId === block.id}
              onSelect={() => handleBlockSelect(block.id)}
              onNewBlock={() => handleNewBlock(block.id)}
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
        onClick={async () => {
          const newBlockId = await createNewBlock('paragraph', '');
          // Set selection immediately for instant UI feedback
          setSelectedBlockId(newBlockId);
          
          // Focus the new block with minimal delay
          setTimeout(() => {
            const newBlockElement = document.querySelector(`[data-block-id="${newBlockId}"] input`);
            if (newBlockElement) {
              (newBlockElement as HTMLInputElement).focus();
            }
          }, 10); // Reduced from 50ms to 10ms for better responsiveness
        }}
      />
    </div>
  );
};
