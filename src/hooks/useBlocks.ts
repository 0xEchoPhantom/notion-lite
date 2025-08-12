'use client';

import { useCallback } from 'react';
import { useBlocks } from '@/contexts/BlocksContext';
import { Block, BlockType } from '@/types/index';
import { MAX_INDENT_LEVEL } from '@/constants/editor';
import { 
  updateTaskMetadataForPage
} from '../utils/gtdStatusMapper';

export const useBlocksWithKeyboard = () => {
  const { blocks, addBlock, updateBlockContent, deleteBlockById, reorderBlocksList, convertBlockType: convertBlockTypeContext, pageId } = useBlocks();

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
      order,
      pageId
    };

    // Add isChecked and taskMetadata for todo-list blocks
    if (type === 'todo-list') {
      const taskMetadata = updateTaskMetadataForPage(undefined, pageId, {
        forceUpdate: true // Always set status for new todo blocks
      });
      
      const newBlock = { 
        ...baseBlock, 
        isChecked: false,
        taskMetadata
      };
      return await addBlock(newBlock);
    } else {
      return await addBlock(baseBlock);
    }
  }, [blocks, addBlock, pageId]);

  const convertBlockType = useCallback(async (blockId: string, newType: BlockType) => {
    await convertBlockTypeContext(blockId, newType);
  }, [convertBlockTypeContext]);

  const toggleTodoCheck = useCallback(async (blockId: string, options?: { skipChildren?: boolean, skipParent?: boolean }) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'todo-list') return;

    const newCheckedState = !block.isChecked;
    
    // Update the current block
    await updateBlockContent(blockId, { isChecked: newCheckedState });

    // Handle child todos if not explicitly skipped
    if (!options?.skipChildren) {
      const currentIndex = blocks.findIndex(b => b.id === blockId);
      const childBlocks = [];
      
      // Find all child blocks (higher indent level immediately following)
      for (let i = currentIndex + 1; i < blocks.length; i++) {
        const nextBlock = blocks[i];
        
        // If we hit a block at same or lower level, we're done with children
        if (nextBlock.indentLevel <= block.indentLevel) {
          break;
        }
        
        // Collect all todo children (not just direct children)
        if (nextBlock.type === 'todo-list' && nextBlock.indentLevel > block.indentLevel) {
          childBlocks.push(nextBlock);
        }
      }

      // Update all child todos to match parent state
      for (const childBlock of childBlocks) {
        if (childBlock.isChecked !== newCheckedState) {
          await updateBlockContent(childBlock.id, { isChecked: newCheckedState });
        }
      }
    }
    
    // Handle parent todo update if not explicitly skipped
    if (!options?.skipParent && block.taskMetadata?.parentTaskId) {
      const parentBlock = blocks.find(b => b.id === block.taskMetadata?.parentTaskId);
      
      if (parentBlock && parentBlock.type === 'todo-list') {
        // Check if all siblings are checked to potentially update parent
        const parentSubtaskIds = parentBlock.taskMetadata?.subtaskIds || [];
        let allSiblingsChecked = true;
        let anySiblingChecked = false;
        
        for (const subtaskId of parentSubtaskIds) {
          const subtask = blocks.find(b => b.id === subtaskId);
          if (subtask && subtask.type === 'todo-list') {
            // Consider the new state for the current block
            const isChecked = subtaskId === blockId ? newCheckedState : subtask.isChecked;
            if (!isChecked) {
              allSiblingsChecked = false;
            } else {
              anySiblingChecked = true;
            }
          }
        }
        
        // Update parent based on children states
        if (allSiblingsChecked && !parentBlock.isChecked) {
          // All children are checked, check the parent
          await toggleTodoCheck(parentBlock.id, { skipChildren: true });
        } else if (!anySiblingChecked && parentBlock.isChecked) {
          // No children are checked, uncheck the parent
          await toggleTodoCheck(parentBlock.id, { skipChildren: true });
        }
      }
    }
  }, [blocks, updateBlockContent]);

  /**
   * Indents a block (increases nesting level)
   * Supports all block types with a maximum depth of 6 levels
   * @param blockId - The ID of the block to indent
   */
  const indentBlock = useCallback(async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Allow indentation for all block types with max level from constants
    if (block.indentLevel < MAX_INDENT_LEVEL) {
      const currentIndex = blocks.findIndex(b => b.id === blockId);
      
      // If this is a todo-list, establish parent-child relationship
      if (block.type === 'todo-list' && currentIndex > 0) {
        // Find the potential parent (previous block with lower indent)
        let parentBlock = null;
        for (let i = currentIndex - 1; i >= 0; i--) {
          if (blocks[i].indentLevel === block.indentLevel) {
            // Found a sibling or potential parent at same level
            if (blocks[i].type === 'todo-list') {
              parentBlock = blocks[i];
              break;
            }
          } else if (blocks[i].indentLevel < block.indentLevel) {
            // Found a block at lower level, stop searching
            break;
          }
        }
        
        if (parentBlock) {
          // Update parent's subtaskIds
          const parentSubtaskIds = parentBlock.taskMetadata?.subtaskIds || [];
          if (!parentSubtaskIds.includes(blockId)) {
            await updateBlockContent(parentBlock.id, {
              taskMetadata: {
                ...parentBlock.taskMetadata,
                subtaskIds: [...parentSubtaskIds, blockId]
              }
            });
          }
          
          // Update current block's parentTaskId and indent
          await updateBlockContent(blockId, { 
            indentLevel: block.indentLevel + 1,
            taskMetadata: {
              ...block.taskMetadata,
              parentTaskId: parentBlock.id
            }
          });
        } else {
          // Just update indent level if no parent found
          await updateBlockContent(blockId, { indentLevel: block.indentLevel + 1 });
        }
      } else {
        // Non-todo blocks just get indented
        await updateBlockContent(blockId, { indentLevel: block.indentLevel + 1 });
      }
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
      // If this is a todo with a parent, remove parent-child relationship
      if (block.type === 'todo-list' && block.taskMetadata?.parentTaskId) {
        const parentBlock = blocks.find(b => b.id === block.taskMetadata?.parentTaskId);
        
        if (parentBlock) {
          // Remove this block from parent's subtaskIds
          const parentSubtaskIds = parentBlock.taskMetadata?.subtaskIds || [];
          const filteredSubtaskIds = parentSubtaskIds.filter(id => id !== blockId);
          
          await updateBlockContent(parentBlock.id, {
            taskMetadata: {
              ...parentBlock.taskMetadata,
              subtaskIds: filteredSubtaskIds
            }
          });
        }
        
        // Remove parentTaskId from current block and outdent
        await updateBlockContent(blockId, { 
          indentLevel: block.indentLevel - 1,
          taskMetadata: {
            ...block.taskMetadata,
            parentTaskId: undefined
          }
        });
        
        // Move any children with this block
        const currentIndex = blocks.findIndex(b => b.id === blockId);
        for (let i = currentIndex + 1; i < blocks.length; i++) {
          const childBlock = blocks[i];
          if (childBlock.indentLevel > block.indentLevel) {
            // This is a child, outdent it too
            await updateBlockContent(childBlock.id, { 
              indentLevel: childBlock.indentLevel - 1 
            });
          } else {
            // No more children
            break;
          }
        }
      } else {
        // Non-todo blocks or todos without parent just get outdented
        await updateBlockContent(blockId, { indentLevel: block.indentLevel - 1 });
      }
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
