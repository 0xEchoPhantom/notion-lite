'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Block as BlockType, BlockType as BType } from '@/types';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';
import { SlashMenu } from './SlashMenu';
import { 
  getIndentStyle, 
  getMarkdownShortcut, 
  getBlockPlaceholder,
  applyTextFormatting,
  getBlockFeatures 
} from '@/utils/editor';
import { KEYBOARD_SHORTCUTS } from '@/constants/editor';
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
  onDuplicateBlock: () => void;
  onDragStart?: (blockId: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, blockId: string) => void;
  onDrop?: (e: React.DragEvent, targetBlockId: string) => void;
  isDraggedOver?: boolean;
  isDragging?: boolean;
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
  onDuplicateBlock,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDraggedOver = false,
  isDragging = false,
}) => {
  const { updateBlockContent, convertBlockType, toggleTodoCheck } = useBlocksWithKeyboard();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [isComposing, setIsComposing] = useState(false);
  const [localContent, setLocalContent] = useState(block.content);
  const isArrowNavigating = useRef(false);

  // Sync local content with block content
  useEffect(() => {
    if (!isComposing && localContent !== block.content) {
      setLocalContent(block.content);
    }
  }, [block.content, isComposing, localContent]);

  // Focus management
  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  // Handle content changes with better Vietnamese input support
  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const content = (e.target as HTMLInputElement).value;
    setLocalContent(content);
    
    // During composition, only update local state
    if (!isComposing) {
      updateBlockContent(block.id, { content });
    }
  }, [block.id, updateBlockContent, isComposing]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const content = e.target.value;
    setLocalContent(content);
    
    // Skip markdown shortcuts and slash commands during Vietnamese composition
    if (isComposing) {
      return;
    }

    // Update the block content
    updateBlockContent(block.id, { content });

    // Handle markdown shortcuts using utility function
    const markdownMatch = getMarkdownShortcut(content);
    if (markdownMatch) {
      convertBlockType(block.id, markdownMatch.type);
      if (markdownMatch.shouldClearContent) {
        updateBlockContent(block.id, { content: '' });
        setLocalContent('');
      }
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

    // ESC: Select current block (Notion behavior)
    if (key === 'Escape') {
      e.preventDefault();
      onSelect();
      input?.blur(); // Remove focus to show block selection
      return;
    }

    // Cmd/Ctrl + A: Select current block when at start/end or all text selected
    if (cmdKey && key === 'a') {
      if (input && (
        (input.selectionStart === 0 && input.selectionEnd === 0) ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length) ||
        input.value.length === 0
      )) {
        e.preventDefault();
        onSelect();
        input.blur(); // Remove focus to show block selection
        return;
      }
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

    // Tab: Indent (works for all block types)
    if (key === 'Tab' && !shiftKey) {
      e.preventDefault();
      onIndent();
      return;
    }

    // Shift + Tab: Outdent (works for all block types)
    if (key === 'Tab' && shiftKey) {
      e.preventDefault();
      onOutdent();
      return;
    }

    // Enter: Create new block of same type (Notion behavior)
    if (key === 'Enter' && !shiftKey && !cmdKey) {
      e.preventDefault();
      
      // If current block is empty and it's a list item, convert to paragraph
      if (localContent === '' && (block.type === 'bulleted-list' || block.type === 'todo-list')) {
        convertBlockType(block.id, 'paragraph');
        return;
      }
      
      // Create new block with same type and indent level
      onNewBlock();
      return;
    }

    // Backspace at start: Merge up or delete
    if (key === 'Backspace') {
      if (input && input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault();
        if (localContent === '') {
          onDeleteBlock();
        } else {
          onMergeUp();
        }
        return;
      }
    }

    // Cmd/Ctrl + /: Show block menu (Notion behavior)
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

    // Cmd/Ctrl + D: Duplicate block (Notion behavior)
    if (cmdKey && key === 'd') {
      e.preventDefault();
      onDuplicateBlock();
      return;
    }

    // Text formatting shortcuts (Notion behavior)
    if (cmdKey && input && input.selectionStart !== input.selectionEnd) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      
      let formatType: 'bold' | 'italic' | 'underline' | 'code' | 'strikethrough' | null = null;
      
      if (key === KEYBOARD_SHORTCUTS.BOLD) {
        formatType = 'bold';
      } else if (key === KEYBOARD_SHORTCUTS.ITALIC) {
        formatType = 'italic';
      } else if (key === KEYBOARD_SHORTCUTS.UNDERLINE) {
        formatType = 'underline';
      } else if (key === KEYBOARD_SHORTCUTS.INLINE_CODE) {
        formatType = 'code';
      } else if (shiftKey && key === KEYBOARD_SHORTCUTS.STRIKETHROUGH) {
        formatType = 'strikethrough';
      }
      
      if (formatType) {
        e.preventDefault();
        const { content: newContent, cursorPosition } = applyTextFormatting(
          localContent, start, end, formatType
        );
        setLocalContent(newContent);
        updateBlockContent(block.id, { content: newContent });
        setTimeout(() => {
          input.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
        return;
      }
    }

    // Notion-style block creation shortcuts (Cmd/Ctrl + Shift + number)
    if (cmdKey && shiftKey) {
      switch (key) {
        case '0':
          e.preventDefault();
          convertBlockType(block.id, 'paragraph');
          return;
        case '1':
          e.preventDefault();
          // H1 heading - convert to paragraph with heading prefix for now
          updateBlockContent(block.id, { content: '# ' + localContent });
          setLocalContent('# ' + localContent);
          return;
        case '2':
          e.preventDefault();
          // H2 heading - convert to paragraph with heading prefix for now
          updateBlockContent(block.id, { content: '## ' + localContent });
          setLocalContent('## ' + localContent);
          return;
        case '3':
          e.preventDefault();
          // H3 heading - convert to paragraph with heading prefix for now
          updateBlockContent(block.id, { content: '### ' + localContent });
          setLocalContent('### ' + localContent);
          return;
        case '4':
          e.preventDefault();
          convertBlockType(block.id, 'todo-list');
          return;
        case '5':
          e.preventDefault();
          convertBlockType(block.id, 'bulleted-list');
          return;
      }
    }
  }, [
    block.type,
    localContent,
    block.id,
    toggleTodoCheck,
    onMoveUp,
    onMoveDown,
    onIndent,
    onOutdent,
    onNewBlock,
    onDeleteBlock,
    onMergeUp,
    onDuplicateBlock,
    onSelect,
    isComposing,
    convertBlockType,
    updateBlockContent,
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
    setLocalContent(content);
    updateBlockContent(block.id, { content });
    
    // Handle markdown shortcuts after composition ends
    const markdownMatch = getMarkdownShortcut(content);
    if (markdownMatch) {
      convertBlockType(block.id, markdownMatch.type);
      if (markdownMatch.shouldClearContent) {
        updateBlockContent(block.id, { content: '' });
        setLocalContent('');
      }
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

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(block.id);
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
  }, [block.id, onDragStart]);

  const handleDragEnd = useCallback(() => {
    if (onDragEnd) {
      onDragEnd();
    }
  }, [onDragEnd]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (onDragOver) {
      onDragOver(e, block.id);
    }
  }, [block.id, onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (onDrop) {
      onDrop(e, block.id);
    }
  }, [block.id, onDrop]);

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
    const indentStyle = getIndentStyle(block.indentLevel);
    const features = getBlockFeatures(block.type);

    switch (block.type) {
      case 'bulleted-list':
        return (
          <span
            className="text-gray-400 select-none mt-1 w-4 flex justify-center"
            style={indentStyle}
          >
            {features.icon}
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
        'absolute -left-6 top-1 hover:bg-gray-100 rounded',
        isSelected && 'opacity-100'
      )}
      title="Drag to move"
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
        <circle cx="2" cy="3" r="1" />
        <circle cx="8" cy="3" r="1" />
        <circle cx="2" cy="8" r="1" />
        <circle cx="8" cy="8" r="1" />
        <circle cx="2" cy="13" r="1" />
        <circle cx="8" cy="13" r="1" />
      </svg>
    </div>
  );

  const placeholder = getBlockPlaceholder(block, localContent !== '');

  return (
    <>
      <div
        className={clsx(
          'group relative flex items-start gap-2 py-1 px-2 mx-2 rounded hover:bg-gray-50',
          'transition-colors duration-150 border-l-2 border-transparent',
          isSelected && 'bg-blue-50 border-l-blue-500',
          block.isChecked && 'opacity-60',
          isDragging && 'opacity-50',
          isDraggedOver && 'bg-blue-100 border-l-blue-400'
        )}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {renderDragHandle()}
        {renderBlockIcon()}
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={localContent}
            onInput={handleInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
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
