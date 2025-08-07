'use client';

import { useCallback } from 'react';
import { useBlocks } from '@/contexts/BlocksContext';
import { Block, BlockType } from '@/types';
import { MAX_INDENT_LEVEL } from '@/constants/editor';

export const useBlocksWithKeyboard = () => {
  const { blocks, addBlock, updateBlockContent, deleteBlockById, reorderBlocksList } = useBlocks();

  const createNewBlock = useCallback(async (
    type: BlockType = 'paragraph',
    content: string = '',
    insertAfter?: string,
    indentLevel: number = 0
  ) => {
    let order: number;
    
    if (insertAfter) {
      const currentBlockIndex = blocks.findIndex(b => b.id === insertAfter);
      const currentBlock = blocks[currentBlockIndex];
      const nextBlock = blocks[currentBlockIndex + 1];
      
      if (currentBlock) {
        // Insert between current and next block
        if (nextBlock) {
          order = (currentBlock.order + nextBlock.order) / 2;
        } else {
          // Insert at the end
          order = currentBlock.order + 1;
        }
      } else {
        order = blocks.length;
      }
    } else {
      // Insert at the end
      order = blocks.length;
    }

    const baseBlock: Omit<Block, 'id' | 'createdAt' | 'updatedAt'> = {
      type,
      content,
      indentLevel,
      order
    };

    // Add isChecked for todo-list blocks
    const newBlock = type === 'todo-list' 
      ? { ...baseBlock, isChecked: false }
      : baseBlock;

    return await addBlock(newBlock);
  }, [blocks, addBlock]);

  const convertBlockType = useCallback(async (blockId: string, newType: BlockType) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Only include isChecked if converting to todo-list
    const updates: Partial<Block> = { type: newType };
    
    if (newType === 'todo-list') {
      updates.isChecked = false;
    }
    // For other types, don't include isChecked field at all

    await updateBlockContent(blockId, updates);
  }, [blocks, updateBlockContent]);

  const toggleTodoCheck = useCallback(async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'todo-list') return;

    await updateBlockContent(blockId, { isChecked: !block.isChecked });
  }, [blocks, updateBlockContent]);

  /**
   * Indents a block (increases nesting level)
   * Supports all block types with a maximum depth of 5 levels
   * @param blockId - The ID of the block to indent
   */
  const indentBlock = useCallback(async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Allow indentation for all block types with max level from constants
    if (block.indentLevel < MAX_INDENT_LEVEL) {
      await updateBlockContent(blockId, { indentLevel: block.indentLevel + 1 });
    }
  }, [blocks, updateBlockContent]);

  /**
   * Outdents a block (decreases nesting level)
   * Works for all block types
   * @param blockId - The ID of the block to outdent
   */
  const outdentBlock = useCallback(async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    if (block.indentLevel > 0) {
      await updateBlockContent(blockId, { indentLevel: block.indentLevel - 1 });
    }
  }, [blocks, updateBlockContent]);

  const moveBlockUp = useCallback(async (blockId: string) => {
    const currentIndex = blocks.findIndex(b => b.id === blockId);
    if (currentIndex <= 0) return;

    const currentBlock = blocks[currentIndex];
    const previousBlock = blocks[currentIndex - 1];

    const updates = [
      { id: currentBlock.id, order: previousBlock.order },
      { id: previousBlock.id, order: currentBlock.order },
    ];

    await reorderBlocksList(updates);
  }, [blocks, reorderBlocksList]);

  const moveBlockDown = useCallback(async (blockId: string) => {
    const currentIndex = blocks.findIndex(b => b.id === blockId);
    if (currentIndex >= blocks.length - 1) return;

    const currentBlock = blocks[currentIndex];
    const nextBlock = blocks[currentIndex + 1];

    const updates = [
      { id: currentBlock.id, order: nextBlock.order },
      { id: nextBlock.id, order: currentBlock.order },
    ];

    await reorderBlocksList(updates);
  }, [blocks, reorderBlocksList]);

  const handleKeyDown = useCallback((e: KeyboardEvent, blockId: string) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    if (isCtrl && e.key === 'Enter') {
      e.preventDefault();
      toggleTodoCheck(blockId);
    } else if (isCtrl && isShift && e.key === 'ArrowUp') {
      e.preventDefault();
      moveBlockUp(blockId);
    } else if (isCtrl && isShift && e.key === 'ArrowDown') {
      e.preventDefault();
      moveBlockDown(blockId);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (isShift) {
        outdentBlock(blockId);
      } else {
        indentBlock(blockId);
      }
    }
  }, [toggleTodoCheck, moveBlockUp, moveBlockDown, indentBlock, outdentBlock]);

  return {
    blocks,
    createNewBlock,
    convertBlockType,
    toggleTodoCheck,
    indentBlock,
    outdentBlock,
    moveBlockUp,
    moveBlockDown,
    handleKeyDown,
    updateBlockContent,
    deleteBlockById,
    reorderBlocks: reorderBlocksList,
  };
};
