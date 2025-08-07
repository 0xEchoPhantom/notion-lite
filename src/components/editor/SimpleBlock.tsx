'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Block as BlockType, BlockType as BType } from '@/types/index';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';
import { useGlobalDrag } from '@/contexts/GlobalDragContext';
import { SlashMenu, SlashMenuRef } from './SlashMenu';
import { 
  getIndentStyle, 
  getMarkdownShortcut, 
  getBlockPlaceholder,
  applyTextFormatting,
  getBlockFeatures 
} from '@/utils/editor';
import { parseNotionClipboard, isNotionContent, cleanContent } from '@/utils/clipboard';
import { KEYBOARD_SHORTCUTS } from '@/constants/editor';
import clsx from 'clsx';

interface SimpleBlockProps {
  block: BlockType;
  isSelected: boolean;
  onSelect: () => void;
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

export const SimpleBlock: React.FC<SimpleBlockProps> = ({
  block,
  isSelected,
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
}) => {
  const { updateBlockContent, convertBlockType, toggleTodoCheck } = useBlocksWithKeyboard();
  const { setDraggedBlock } = useGlobalDrag();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<SlashMenuRef>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [localContent, setLocalContent] = useState(block.content);
  const [isFocused, setIsFocused] = useState(false);
  const isArrowNavigating = useRef(false);

  // Sync local content with block content
  useEffect(() => {
    if (!isComposing && localContent !== block.content) {
      setLocalContent(block.content);
    }
  }, [block.content, isComposing]); // Removed localContent to prevent infinite loops

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
    // Don't update Firebase here - let handleChange handle it to avoid double updates
  }, []);

  // Handle paste with Notion format support
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const clipboardText = e.clipboardData.getData('text');
    
    // Check if the pasted content looks like it came from Notion
    if (!isNotionContent(clipboardText)) {
      // For regular text, let the default paste behavior handle it
      return;
    }

    e.preventDefault();
    
    try {
      // Parse the Notion content into blocks
      const parsedBlocks = parseNotionClipboard(clipboardText);
      
      if (parsedBlocks.length === 0) {
        return;
      }

      // If only one block, replace current block content
      if (parsedBlocks.length === 1) {
        const parsed = parsedBlocks[0];
        const cleanedContent = cleanContent(parsed.content);
        
        // Update current block type and content
        if (parsed.type !== block.type) {
          await convertBlockType(block.id, parsed.type);
        }
        
        // Update indent level if specified
        const targetIndentLevel = parsed.indentLevel !== undefined ? parsed.indentLevel : block.indentLevel;
        
        updateBlockContent(block.id, { 
          content: cleanedContent,
          indentLevel: targetIndentLevel,
          ...(parsed.type === 'todo-list' && { isChecked: parsed.completed || false })
        });
        setLocalContent(cleanedContent);
        return;
      }

      // For multiple blocks, replace current block with first one and create new blocks for the rest
      const [firstBlock, ...remainingBlocks] = parsedBlocks;
      
      // Update current block with first parsed block
      const firstCleanedContent = cleanContent(firstBlock.content);
      if (firstBlock.type !== block.type) {
        await convertBlockType(block.id, firstBlock.type);
      }
      
      // Update indent level if specified
      const firstTargetIndentLevel = firstBlock.indentLevel !== undefined ? firstBlock.indentLevel : block.indentLevel;
      
      updateBlockContent(block.id, { 
        content: firstCleanedContent,
        indentLevel: firstTargetIndentLevel,
        ...(firstBlock.type === 'todo-list' && { isChecked: firstBlock.completed || false })
      });
      setLocalContent(firstCleanedContent);

      // Create new blocks for remaining content
      let lastBlockId = block.id;
      for (const parsedBlock of remainingBlocks) {
        const cleanedContent = cleanContent(parsedBlock.content);
        const targetIndentLevel = parsedBlock.indentLevel !== undefined ? parsedBlock.indentLevel : block.indentLevel;
        
        if (onCreateBlock) {
          const newBlockId = await onCreateBlock(
            parsedBlock.type, 
            cleanedContent, 
            lastBlockId, 
            targetIndentLevel
          );
          
          // Set todo completion state if it's a todo block
          if (parsedBlock.type === 'todo-list' && parsedBlock.completed) {
            setTimeout(() => {
              updateBlockContent(newBlockId, { isChecked: true });
            }, 50);
          }
          
          lastBlockId = newBlockId;
        }
      }

      // Focus the last created block
      setTimeout(() => {
        const lastBlockElement = document.querySelector(`[data-block-id="${lastBlockId}"] input`);
        if (lastBlockElement) {
          (lastBlockElement as HTMLInputElement).focus();
        }
      }, 100);

    } catch (error) {
      console.error('Error parsing pasted content:', error);
      // Fall back to default paste behavior
    }
  }, [block, updateBlockContent, convertBlockType, onCreateBlock]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const content = e.target.value;
    setLocalContent(content);
    
    console.log('handleChange called with:', content);
    
    // Skip markdown shortcuts and slash commands during Vietnamese composition
    if (isComposing) {
      console.log('Skipping because composing');
      return;
    }

    // Update the block content
    updateBlockContent(block.id, { content });

    // Handle markdown shortcuts using utility function
    const markdownMatch = getMarkdownShortcut(content);
    console.log('Markdown detection result:', markdownMatch);
    if (markdownMatch) {
      console.log('Converting block to:', markdownMatch.type);
      convertBlockType(block.id, markdownMatch.type);
      if (markdownMatch.shouldClearContent) {
        updateBlockContent(block.id, { content: '' });
        setLocalContent('');
      }
    }

    // Handle slash command
    const slashIndex = content.lastIndexOf('/');
    if (slashIndex !== -1 && slashIndex === content.length - 1) {
      // Just typed '/', show menu
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        setSlashMenuPosition({
          x: rect.left,
          y: rect.bottom + 4,
        });
        setSlashSearchQuery('');
        setShowSlashMenu(true);
      }
    } else if (slashIndex !== -1 && content.substring(0, slashIndex).trim() === '') {
      // Typing after '/', update search query
      const searchQuery = content.substring(slashIndex + 1);
      setSlashSearchQuery(searchQuery);
      if (!showSlashMenu) {
        const rect = inputRef.current?.getBoundingClientRect();
        if (rect) {
          setSlashMenuPosition({
            x: rect.left,
            y: rect.bottom + 4,
          });
          setShowSlashMenu(true);
        }
      }
    } else {
      setShowSlashMenu(false);
      setSlashSearchQuery('');
    }
  }, [block.id, updateBlockContent, convertBlockType, isComposing, showSlashMenu]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = e;
    const cmdKey = ctrlKey || metaKey;
    const input = inputRef.current as HTMLInputElement;

    // Skip keyboard shortcuts during Vietnamese composition
    if (isComposing) {
      return;
    }

    // Special handling when slash menu is open
    if (showSlashMenu) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === 'Escape') {
        // Delegate to SlashMenu and prevent default if handled
        const handled = slashMenuRef.current?.handleKeyDown(key);
        if (handled) {
          e.preventDefault();
          return;
        }
      }
      // For other keys, let them through to continue typing/filtering
    }

    // ESC: Select current block (Notion behavior)
    if (key === 'Escape') {
      e.preventDefault();
      onSelect();
      input?.blur(); // Remove focus to show block selection
      return;
    }

    // Cmd/Ctrl + A: Select all text, then select block on second press
    if (cmdKey && key === 'a') {
      if (input) {
        const isAllTextSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
        const isEmptyBlock = input.value.length === 0;
        
        // If all text is already selected OR block is empty, select the entire block
        if (isAllTextSelected || isEmptyBlock) {
          e.preventDefault();
          onSelect();
          input.blur(); // Remove focus to show block selection
          return;
        }
        // Otherwise, let the default Ctrl+A behavior select all text
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
      
      // Always create new block with same type and indent level
      onNewBlock(block.type, block.indentLevel);
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
    showSlashMenu,
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
      const slashIndex = content.lastIndexOf('/');
      if (slashIndex !== -1) {
        // Remove the slash command and everything after it
        const newContent = content.substring(0, slashIndex);
        updateBlockContent(block.id, { content: newContent });
        setLocalContent(newContent);
      }
    }
    setShowSlashMenu(false);
    setSlashSearchQuery('');
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    
    // Set multiple data formats for cross-page compatibility
    e.dataTransfer.setData('text/plain', block.id);
    e.dataTransfer.setData('application/json', JSON.stringify({
      blockId: block.id,
      type: block.type,
      content: block.content,
      indentLevel: block.indentLevel,
      isChecked: block.isChecked
    }));
    
    // Set global drag state for cross-page operations
    setDraggedBlock({
      blockId: block.id,
      sourcePageId: '', // Will be set by GlobalDragProvider
      type: block.type,
      content: block.content,
      indentLevel: block.indentLevel,
      isChecked: block.isChecked
    });
    
    if (onDragStart) {
      onDragStart(block.id);
    }
  }, [block, onDragStart, setDraggedBlock]);

  const handleDragEnd = useCallback(() => {
    setDraggedBlock(null);
    if (onDragEnd) {
      onDragEnd();
    }
  }, [onDragEnd, setDraggedBlock]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOver) {
      onDragOver(e, block.id);
    }
  }, [block.id, onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    setIsFocused(true);
    // Only trigger selection if it's not from arrow navigation
    if (!isArrowNavigating.current) {
      onSelect();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const renderBlockIcon = () => {
    const indentStyle = getIndentStyle(block.indentLevel);
    const features = getBlockFeatures(block.type);

    switch (block.type) {
      case 'heading-1':
      case 'heading-2':
      case 'heading-3':
        return (
          <span
            className="text-gray-400 select-none mt-1 w-6 flex justify-center text-xs font-medium"
            style={indentStyle}
          >
            {features.icon}
          </span>
        );
      case 'bulleted-list':
      case 'numbered-list':
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
      case 'quote':
        return (
          <span
            className="text-gray-400 select-none mt-1 w-4 flex justify-center"
            style={indentStyle}
          >
            {features.icon}
          </span>
        );
      case 'code':
        return (
          <span
            className="text-gray-400 select-none mt-1 w-6 flex justify-center text-xs"
            style={indentStyle}
          >
            {features.icon}
          </span>
        );
      case 'divider':
        return (
          <div className="w-4 mt-1" style={indentStyle} />
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
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      title="Drag to move"
      onMouseDown={(e) => {
        e.stopPropagation(); // Prevent input focus when dragging
      }}
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

  const getInputStyles = () => {
    const baseStyles = 'w-full bg-transparent border-none outline-none resize-none placeholder-gray-400';
    
    switch (block.type) {
      case 'heading-1':
        return `${baseStyles} text-2xl font-bold leading-8 text-gray-900`;
      case 'heading-2':
        return `${baseStyles} text-xl font-semibold leading-7 text-gray-900`;
      case 'heading-3':
        return `${baseStyles} text-lg font-medium leading-6 text-gray-900`;
      case 'quote':
        return `${baseStyles} text-sm leading-6 italic text-gray-700 border-l-4 border-gray-300 pl-4`;
      case 'code':
        return `${baseStyles} text-sm leading-6 font-mono bg-gray-100 px-2 py-1 rounded`;
      case 'divider':
        return `${baseStyles} text-sm leading-6 text-center`;
      default:
        return `${baseStyles} text-sm leading-6 ${block.isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`;
    }
  };

  const placeholder = getBlockPlaceholder(block, localContent !== '', isFocused);

  return (
    <>
      {/* Drop indicator line above */}
      {isDraggedOver && dropPosition === 'above' && (
        <div className="h-0.5 bg-blue-500 mx-2 my-1 rounded-full" />
      )}
      
      <div
        data-block-id={block.id}
        className={clsx(
          'group relative flex items-start gap-2 py-1 px-2 mx-2 rounded hover:bg-gray-50',
          'transition-colors duration-150 border-l-2 border-transparent',
          block.isChecked && 'opacity-60',
          isDragging && 'opacity-50'
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {renderDragHandle()}
        {renderBlockIcon()}
        <div className="flex-1 min-w-0">
          {block.type === 'divider' ? (
            <div className="py-2">
              <hr className="border-gray-300" />
            </div>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={localContent}
              onInput={handleInput}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onMouseDown={(e) => {
                // Prevent drag start when clicking in the input
                e.stopPropagation();
              }}
              placeholder={placeholder}
              className={getInputStyles()}
            />
          )}
        </div>
      </div>

      {/* Drop indicator line below */}
      {isDraggedOver && dropPosition === 'below' && (
        <div className="h-0.5 bg-blue-500 mx-2 my-1 rounded-full" />
      )}

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
    </>
  );
};
