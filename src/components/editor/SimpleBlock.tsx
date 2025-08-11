'use client';

import React, { useState } from 'react';
import { Block as BlockType, BlockType as BType } from '@/types/index';
import { SlashMenu } from './SlashMenu';
import { TokenSuggest } from './TokenSuggest';
import { useBlockLogic } from '@/hooks/useBlockLogic';
import { BlockWrapper, BlockIcon, DragHandle, BlockInput } from './block-parts';
import { TaskChips } from '@/components/tasks/TaskChips';

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

  const [showTokenSuggest, setShowTokenSuggest] = useState(false);
  const [tokenSuggestPosition, setTokenSuggestPosition] = useState({ x: 0, y: 0 });
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  
  // Handle @ token detection for todo-list blocks
  const handleTokenTrigger = (input: string, cursorPos: number, inputElement: HTMLTextAreaElement) => {
    if (block.type !== 'todo-list') return;
    
    const textBeforeCursor = input.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if we're still in a token (no space after @)
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        // Get caret position for menu
        const rect = inputElement.getBoundingClientRect();
        
        setTokenSearchQuery(textAfterAt);
        setTokenSuggestPosition({
          x: rect.left,
          y: rect.bottom + 4
        });
        setShowTokenSuggest(true);
      } else {
        setShowTokenSuggest(false);
      }
    } else {
      setShowTokenSuggest(false);
    }
  };
  
  const handleTokenSelect = (token: string) => {
    // Insert the token at the cursor position
    if (inputRef.current) {
      const cursorPos = inputRef.current.selectionStart;
      const content = inputRef.current.value;
      const textBeforeCursor = content.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const newContent = 
          content.substring(0, lastAtIndex) + 
          token + ' ' + 
          content.substring(cursorPos);
        
        // Update the input value directly
        inputRef.current.value = newContent;
        
        // Create and dispatch input event to trigger block update
        const inputEvent = new Event('input', { bubbles: true });
        Object.defineProperty(inputEvent, 'target', {
          writable: false,
          value: inputRef.current
        });
        
        // Manually trigger the input handler
        if (handleInput) {
          const typedEvent = inputEvent as unknown as React.FormEvent<HTMLTextAreaElement>;
          handleInput(typedEvent);
        }
        
        // Move cursor
        setTimeout(() => {
          if (inputRef.current) {
            const newCursorPos = lastAtIndex + token.length + 1;
            inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
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
                    return;
                  }
                }
                handleKeyDown(e);
              }}
              onPaste={handlePaste}
              onFocus={handleFocus}
              onBlur={handleBlur}
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
