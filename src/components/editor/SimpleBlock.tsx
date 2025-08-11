'use client';

import React, { useState } from 'react';
import { Block as BlockType, BlockType as BType } from '@/types/index';
import { SlashMenu } from './SlashMenu';
import { TokenSuggest } from './TokenSuggest';
import { useBlockLogic } from '@/hooks/useBlockLogic';
import { BlockWrapper, BlockIcon, DragHandle, BlockInput } from './block-parts';
import { TaskChips } from '@/components/tasks/TaskChips';
import { parseTaskTokens } from '@/utils/smartTokenParser';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';

interface SimpleBlockProps {
  block: BlockType;
  isSelected: boolean;
  isMultiSelected?: boolean;
  onSelect: (event?: React.MouseEvent) => void;
  onNewBlock: (type?: BType, indentLevel?: number) => void;
  onCreateBlock?: (type: BType, content: string, afterBlockId: string, indentLevel?: number) => Promise<string>;
  onMergeUp: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onDeleteBlock: () => void;
  onDuplicateBlock: () => void;
  onDragStart?: (blockId: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, blockId: string) => void;
  onDrop?: (e: React.DragEvent, targetBlockId: string) => void;
  isDraggedOver?: boolean;
  isDragging?: boolean;
  dropPosition?: 'above' | 'below' | null;
}

export const SimpleBlock: React.FC<SimpleBlockProps> = (props) => {
  const {
    block,
    isSelected,
    isMultiSelected = false,
    onSelect,
    onNewBlock,
    onCreateBlock,
    onMergeUp,
    onMoveUp,
    onMoveDown,
    onIndent,
    onOutdent,
    onDeleteBlock,
    onDuplicateBlock,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    isDraggedOver = false,
    isDragging = false,
    dropPosition = null,
  } = props;

  const { updateBlockContent } = useBlocksWithKeyboard();
  const [showTokenSuggest, setShowTokenSuggest] = useState(false);
  const [tokenSuggestPosition, setTokenSuggestPosition] = useState({ x: 0, y: 0 });
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  
  // Handle @ token detection for todo-list blocks
  const handleTokenTrigger = (input: string, cursorPos: number | null, inputElement: HTMLTextAreaElement) => {
    if (block.type !== 'todo-list') return;
    if (cursorPos === null || cursorPos === undefined) return;
    
    const textBeforeCursor = input.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if we're still in a token (no space after @)
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        // Calculate approximate position of the @ symbol
        const rect = inputElement.getBoundingClientRect();
        
        // Create a temporary element to measure text width
        const measureElement = document.createElement('span');
        measureElement.style.font = window.getComputedStyle(inputElement).font;
        measureElement.style.position = 'absolute';
        measureElement.style.visibility = 'hidden';
        measureElement.style.whiteSpace = 'pre';
        measureElement.textContent = input.substring(0, lastAtIndex);
        document.body.appendChild(measureElement);
        
        const textWidth = measureElement.offsetWidth;
        document.body.removeChild(measureElement);
        
        // Position menu near the @ symbol
        const scrollLeft = inputElement.scrollLeft;
        const x = rect.left + textWidth - scrollLeft + 10; // Add small offset
        const y = rect.bottom + 4;
        
        setTokenSearchQuery(textAfterAt);
        setTokenSuggestPosition({ x, y });
        setShowTokenSuggest(true);
      } else {
        setShowTokenSuggest(false);
      }
    } else {
      setShowTokenSuggest(false);
    }
  };
  
  const handleTokenSelect = async (token: string) => {
    // Remove the @token from content and update metadata
    if (inputRef.current) {
      const cursorPos = inputRef.current.selectionStart;
      const content = inputRef.current.value;
      const textBeforeCursor = content.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        // Remove the @ and everything after it up to cursor from content
        const newContent = 
          content.substring(0, lastAtIndex) + 
          content.substring(cursorPos);
        
        // Update the input value directly (removing the @token)
        inputRef.current.value = newContent;
        
        // Parse the selected token to extract metadata
        const parsed = parseTaskTokens(token);
        
        // Build the updated taskMetadata, removing undefined values
        const updatedMetadata: any = {
          ...(block.taskMetadata || {})
        };
        
        // Only add defined values from parsed tokens
        if (parsed.values.value !== undefined) updatedMetadata.value = parsed.values.value;
        if (parsed.values.effort !== undefined) updatedMetadata.effort = parsed.values.effort;
        if (parsed.values.dueDate !== undefined) updatedMetadata.dueDate = parsed.values.dueDate;
        if (parsed.values.assignee !== undefined) updatedMetadata.assignee = parsed.values.assignee;
        if (parsed.values.company !== undefined) updatedMetadata.company = parsed.values.company;
        
        // Update block with clean content and new metadata
        await updateBlockContent(block.id, { 
          content: newContent,
          taskMetadata: updatedMetadata
        });
        
        // Create and dispatch input event to trigger UI update
        const inputEvent = new Event('input', { bubbles: true });
        Object.defineProperty(inputEvent, 'target', {
          writable: false,
          value: inputRef.current
        });
        
        // Manually trigger the input handler for local state
        if (handleInput) {
          const typedEvent = inputEvent as unknown as React.FormEvent<HTMLTextAreaElement>;
          handleInput(typedEvent);
        }
        
        // Move cursor to where the @ was
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(lastAtIndex, lastAtIndex);
            inputRef.current.focus();
          }
        }, 0);
      }
    }
    
    setShowTokenSuggest(false);
    setTokenSearchQuery('');
  };

  const {
    inputRef,
    slashMenuRef,
    localContent,
    isFocused,
    showSlashMenu,
    slashMenuPosition,
    slashSearchQuery,
    handleInput,
    handleChange,
    handleKeyDown,
    handlePaste,
    handleFocus,
    handleBlur,
    handleCompositionStart,
    handleCompositionEnd,
    handleSlashMenuSelect,
    handleToggleCheck,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleBlockClick,
    setShowSlashMenu,
    setSlashSearchQuery,
  } = useBlockLogic({
    block,
    isSelected,
    onDragStart,
    onDragEnd,
    onCreateBlock,
    onNewBlock,
    onSelect,
    onMoveUp,
    onMoveDown,
    onIndent,
    onOutdent,
    onDeleteBlock,
    onMergeUp,
    onDuplicateBlock,
    onDragOver,
    onDrop,
  });

  return (
    <>
      <BlockWrapper
        blockId={block.id}
        isSelected={isSelected}
        isMultiSelected={isMultiSelected}
        isDragging={isDragging}
        isDraggedOver={isDraggedOver}
        dropPosition={dropPosition}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBlockClick}
      >
        <DragHandle
          isSelected={isSelected}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onSelect={() => onSelect()}
        />
        
        <BlockIcon
          block={block}
          onToggleCheck={handleToggleCheck}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <BlockInput
              block={block}
              localContent={localContent}
              isFocused={isFocused}
              inputRef={inputRef}
              onChange={(e) => {
                handleChange(e);
                // Check for @ trigger
                const target = e.target as HTMLTextAreaElement;
                handleTokenTrigger(target.value, target.selectionStart, target);
              }}
              onKeyDown={(e) => {
                // While the token suggest menu is open, keep navigation scoped to the menu
                if (showTokenSuggest) {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Tab') {
                    // Prevent textarea caret movement or block-level shortcuts,
                    // but allow the native event to bubble to the menu's window listener
                    e.preventDefault();
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowTokenSuggest(false);
                    // Remove the incomplete @ token when escaping
                    if (inputRef.current) {
                      const content = inputRef.current.value;
                      const cursorPos = inputRef.current.selectionStart;
                      const textBeforeCursor = content.substring(0, cursorPos);
                      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                      if (lastAtIndex !== -1) {
                        const newContent = content.substring(0, lastAtIndex) + content.substring(cursorPos);
                        inputRef.current.value = newContent;
                        inputRef.current.setSelectionRange(lastAtIndex, lastAtIndex);
                        // Trigger change event
                        const event = new Event('input', { bubbles: true });
                        inputRef.current.dispatchEvent(event);
                      }
                    }
                    return;
                  }
                }
                handleKeyDown(e);
              }}
              onPaste={handlePaste}
              onFocus={handleFocus}
              onBlur={(e) => {
                // Remove incomplete @ token on blur
                if (showTokenSuggest && inputRef.current) {
                  const content = inputRef.current.value;
                  const cursorPos = inputRef.current.selectionStart || 0;
                  const textBeforeCursor = content.substring(0, cursorPos);
                  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                  if (lastAtIndex !== -1) {
                    const newContent = content.substring(0, lastAtIndex) + content.substring(cursorPos);
                    inputRef.current.value = newContent;
                    // Trigger change to save clean content
                    const event = new Event('input', { bubbles: true });
                    inputRef.current.dispatchEvent(event);
                  }
                  setShowTokenSuggest(false);
                }
                handleBlur(e);
              }}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
            />
            {block.type === 'todo-list' && block.taskMetadata && (
              <div className="flex-shrink-0 mt-1">
                <TaskChips taskMetadata={block.taskMetadata} blockId={block.id} />
              </div>
            )}
          </div>
        </div>
      </BlockWrapper>

      <SlashMenu
        ref={slashMenuRef}
        isOpen={showSlashMenu}
        onClose={() => {
          setShowSlashMenu(false);
          setSlashSearchQuery('');
        }}
        onSelectType={handleSlashMenuSelect}
        position={slashMenuPosition}
        searchQuery={slashSearchQuery}
      />
      
      <TokenSuggest
        isOpen={showTokenSuggest}
        position={tokenSuggestPosition}
        searchQuery={tokenSearchQuery}
        onSelect={handleTokenSelect}
        onClose={() => {
          setShowTokenSuggest(false);
          setTokenSearchQuery('');
        }}
      />
    </>
  );
};
