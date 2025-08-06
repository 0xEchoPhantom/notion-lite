'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Block as BlockType, BlockType as BType } from '@/types';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';
import { SlashMenu } from './SlashMenu';
import clsx from 'clsx';

interface SimpleBlockProps {
  block: BlockType;
  isSelected: boolean;
  onSelect: () => void;
  onNewBlock: () => void;
  onMergeUp: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onDeleteBlock: () => void;
}

export const SimpleBlock: React.FC<SimpleBlockProps> = ({
  block,
  isSelected,
  onSelect,
  onNewBlock,
  onMergeUp,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  onDeleteBlock,
}) => {
  const { updateBlockContent, convertBlockType, toggleTodoCheck } = useBlocksWithKeyboard();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [isComposing, setIsComposing] = useState(false);
  const isArrowNavigating = useRef(false);

  // Focus management
  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  // Handle content changes with better Vietnamese input support
  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const content = (e.target as HTMLInputElement).value;
    
    // Always update content immediately for proper Vietnamese typing
    updateBlockContent(block.id, { content });
  }, [block.id, updateBlockContent]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const content = e.target.value;
    
    // Skip markdown shortcuts and slash commands during Vietnamese composition
    if (isComposing) {
      return;
    }

    // Handle markdown shortcuts
    if (content === '- ') {
      convertBlockType(block.id, 'bulleted-list');
      updateBlockContent(block.id, { content: '' });
    } else if (content === '[] ') {
      convertBlockType(block.id, 'todo-list');
      updateBlockContent(block.id, { content: '' });
    }

    // Handle slash command
    if (content.endsWith('/')) {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        setSlashMenuPosition({
          x: rect.left,
          y: rect.bottom + 4,
        });
        setShowSlashMenu(true);
      }
    } else {
      setShowSlashMenu(false);
    }
  }, [block.id, updateBlockContent, convertBlockType, isComposing]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = e;
    const cmdKey = ctrlKey || metaKey;
    const input = inputRef.current as HTMLInputElement;

    // Skip keyboard shortcuts during Vietnamese composition
    if (isComposing) {
      return;
    }

    // Cmd/Ctrl + Enter: Toggle todo
    if (cmdKey && key === 'Enter' && block.type === 'todo-list') {
      e.preventDefault();
      toggleTodoCheck(block.id);
      return;
    }

    // Cmd/Ctrl + Shift + Up/Down: Move block
    if (cmdKey && shiftKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      e.preventDefault();
      if (key === 'ArrowUp') {
        onMoveUp();
      } else {
        onMoveDown();
      }
      return;
    }

    // Arrow Up: Move to previous block if at start
    if (key === 'ArrowUp' && !cmdKey && !shiftKey) {
      if (input && input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault();
        // Find previous block and focus it
        const allBlocks = document.querySelectorAll('[data-block-id]');
        const currentBlockElement = input.closest('[data-block-id]');
        if (currentBlockElement) {
          const currentIndex = Array.from(allBlocks).indexOf(currentBlockElement);
          if (currentIndex > 0) {
            const prevBlock = allBlocks[currentIndex - 1];
            const prevInput = prevBlock.querySelector('input') as HTMLInputElement;
            if (prevInput) {
              // Set flag to prevent unnecessary state updates
              isArrowNavigating.current = true;
              prevInput.focus();
              prevInput.setSelectionRange(prevInput.value.length, prevInput.value.length);
              // Reset flag after a short delay
              setTimeout(() => {
                isArrowNavigating.current = false;
              }, 0);
            }
          }
        }
        return;
      }
    }

    // Arrow Down: Move to next block if at end
    if (key === 'ArrowDown' && !cmdKey && !shiftKey) {
      if (input && input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
        e.preventDefault();
        // Find next block and focus it
        const allBlocks = document.querySelectorAll('[data-block-id]');
        const currentBlockElement = input.closest('[data-block-id]');
        if (currentBlockElement) {
          const currentIndex = Array.from(allBlocks).indexOf(currentBlockElement);
          if (currentIndex < allBlocks.length - 1) {
            const nextBlock = allBlocks[currentIndex + 1];
            const nextInput = nextBlock.querySelector('input') as HTMLInputElement;
            if (nextInput) {
              // Set flag to prevent unnecessary state updates
              isArrowNavigating.current = true;
              nextInput.focus();
              nextInput.setSelectionRange(0, 0);
              // Reset flag after a short delay
              setTimeout(() => {
                isArrowNavigating.current = false;
              }, 0);
            }
          }
        }
        return;
      }
    }

    // Tab: Indent (only for lists)
    if (key === 'Tab' && !shiftKey && (block.type === 'bulleted-list' || block.type === 'todo-list')) {
      e.preventDefault();
      onIndent();
      return;
    }

    // Shift + Tab: Outdent
    if (key === 'Tab' && shiftKey) {
      e.preventDefault();
      onOutdent();
      return;
    }

    // Enter: Create new block
    if (key === 'Enter' && !shiftKey && !cmdKey) {
      e.preventDefault();
      onNewBlock();
      return;
    }

    // Backspace at start: Merge up or delete
    if (key === 'Backspace') {
      if (input && input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault();
        if (block.content === '') {
          onDeleteBlock();
        } else {
          onMergeUp();
        }
        return;
      }
    }

    // Cmd/Ctrl + /: Show slash menu
    if (cmdKey && key === '/') {
      e.preventDefault();
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        setSlashMenuPosition({
          x: rect.left,
          y: rect.bottom + 4,
        });
        setShowSlashMenu(true);
      }
      return;
    }
  }, [
    block.type,
    block.content,
    block.id,
    toggleTodoCheck,
    onMoveUp,
    onMoveDown,
    onIndent,
    onOutdent,
    onNewBlock,
    onDeleteBlock,
    onMergeUp,
    isComposing,
  ]);

  // Handle Vietnamese input composition with better timing
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
    setShowSlashMenu(false); // Hide slash menu during composition
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    
    // Process the final composed text for shortcuts
    const content = (e.target as HTMLInputElement).value;
    
    // Handle markdown shortcuts after composition ends
    if (content === '- ') {
      convertBlockType(block.id, 'bulleted-list');
      updateBlockContent(block.id, { content: '' });
    } else if (content === '[] ') {
      convertBlockType(block.id, 'todo-list');
      updateBlockContent(block.id, { content: '' });
    }
    
    // Handle slash command after composition ends
    if (content.endsWith('/')) {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        setSlashMenuPosition({
          x: rect.left,
          y: rect.bottom + 4,
        });
        setShowSlashMenu(true);
      }
    }
  }, [block.id, convertBlockType, updateBlockContent]);

  const handleSlashMenuSelect = (type: BType) => {
    convertBlockType(block.id, type);
    if (inputRef.current) {
      const content = inputRef.current.value;
      const newContent = content.slice(0, -1); // Remove the '/'
      updateBlockContent(block.id, { content: newContent });
    }
    setShowSlashMenu(false);
  };

  const handleToggleCheck = () => {
    if (block.type === 'todo-list') {
      toggleTodoCheck(block.id);
    }
  };

  const handleFocus = () => {
    // Only trigger selection if it's not from arrow navigation
    if (!isArrowNavigating.current) {
      onSelect();
    }
  };

  const renderBlockIcon = () => {
    const indentStyle = { marginLeft: `${block.indentLevel * 24}px` };

    switch (block.type) {
      case 'bulleted-list':
        return (
          <span
            className="text-gray-400 select-none mt-1 w-4 flex justify-center"
            style={indentStyle}
          >
            •
          </span>
        );
      case 'todo-list':
        return (
          <button
            onClick={handleToggleCheck}
            className={clsx(
              'w-4 h-4 rounded border-2 mt-1 flex items-center justify-center transition-colors',
              block.isChecked
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 hover:border-gray-400'
            )}
            style={indentStyle}
          >
            {block.isChecked && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        );
      default:
        return <div className="w-4 mt-1" style={indentStyle} />;
    }
  };

  const renderDragHandle = () => (
    <div
      className={clsx(
        'opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
        'flex items-center justify-center w-4 h-6 text-gray-400 hover:text-gray-600',
        'absolute left-0 top-1'
      )}
    >
      <svg width="10" height="4" viewBox="0 0 10 4" fill="currentColor">
        <circle cx="2" cy="2" r="1" />
        <circle cx="8" cy="2" r="1" />
      </svg>
    </div>
  );

  const getPlaceholder = () => {
    switch (block.type) {
      case 'paragraph':
        return "Type '/' for commands";
      case 'bulleted-list':
        return 'List item';
      case 'todo-list':
        return 'To-do';
      default:
        return 'Start typing...';
    }
  };

  return (
    <>
      <div
        className={clsx(
          'group relative flex items-start gap-2 py-1 px-2 rounded hover:bg-gray-50',
          'transition-colors duration-150',
          isSelected && 'bg-gray-50',
          block.isChecked && 'opacity-60'
        )}
      >
        {renderDragHandle()}
        {renderBlockIcon()}
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={block.content}
            onInput={handleInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={getPlaceholder()}
            className={clsx(
              'w-full bg-transparent border-none outline-none resize-none',
              'text-sm leading-6 placeholder-gray-400',
              block.isChecked && 'line-through text-gray-500'
            )}
          />
        </div>
      </div>

      <SlashMenu
        isOpen={showSlashMenu}
        onClose={() => setShowSlashMenu(false)}
        onSelectType={handleSlashMenuSelect}
        position={slashMenuPosition}
      />
    </>
  );
};
