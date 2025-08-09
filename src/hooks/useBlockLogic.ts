import { useState, useEffect, useCallback, useRef } from 'react';
import { Block, BlockType as BType } from '@/types/index';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';
import { useBlocks } from '@/contexts/BlocksContext';
import { useGlobalDrag } from '@/contexts/GlobalDragContext';
import { getMarkdownShortcut, applyTextFormatting } from '@/utils/editor';
import { parseNotionClipboard, isNotionContent, cleanContent } from '@/utils/clipboard';
import { KEYBOARD_SHORTCUTS } from '@/constants/editor';
import { SlashMenuRef } from '@/components/editor/SlashMenu';

interface UseBlockLogicProps {
  block: Block;
  isSelected: boolean;
  onDragStart?: (blockId: string) => void;
  onDragEnd?: () => void;
  onCreateBlock?: (type: BType, content: string, afterBlockId: string, indentLevel?: number) => Promise<string>;
  onNewBlock: (type?: BType, indentLevel?: number) => void;
  onSelect: (event?: React.MouseEvent) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onDeleteBlock: () => void;
  onMergeUp: () => void;
  onDuplicateBlock: () => void;
  onDragOver?: (e: React.DragEvent, blockId: string) => void;
  onDrop?: (e: React.DragEvent, targetBlockId: string) => void;
}

export const useBlockLogic = ({
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
}: UseBlockLogicProps) => {
  const { updateBlockContent, convertBlockType, toggleTodoCheck } = useBlocksWithKeyboard();
  const { pageId } = useBlocks();
  const { setDraggedBlock } = useGlobalDrag();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<SlashMenuRef>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [showTokenSuggest, setShowTokenSuggest] = useState(false);
  const [tokenSuggestPosition, setTokenSuggestPosition] = useState({ x: 0, y: 0 });
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [localContent, setLocalContent] = useState(block.content);
  const [isFocused, setIsFocused] = useState(false);
  const isArrowNavigating = useRef(false);

  // Sync local content with block content
  useEffect(() => {
    if (!isComposing) {
      setLocalContent(block.content);
    }
  }, [block.content, isComposing]);

  // Focus management
  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const minHeight = 24;
      const newHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [localContent]);

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const content = (e.target as HTMLTextAreaElement).value;
    setLocalContent(content);
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const clipboardText = e.clipboardData.getData('text');
    if (!isNotionContent(clipboardText)) return;

    e.preventDefault();
    try {
      const parsedBlocks = parseNotionClipboard(clipboardText);
      if (parsedBlocks.length === 0) return;

      if (parsedBlocks.length === 1) {
        const parsed = parsedBlocks[0];
        const cleanedContent = cleanContent(parsed.content);
        if (parsed.type !== block.type) {
          await convertBlockType(block.id, parsed.type);
        }
        const targetIndentLevel = parsed.indentLevel !== undefined ? parsed.indentLevel : block.indentLevel;
        updateBlockContent(block.id, { 
          content: cleanedContent,
          indentLevel: targetIndentLevel,
          ...(parsed.type === 'todo-list' && { isChecked: parsed.completed || false })
        });
        setLocalContent(cleanedContent);
        return;
      }

      const [firstBlock, ...remainingBlocks] = parsedBlocks;
      const firstCleanedContent = cleanContent(firstBlock.content);
      if (firstBlock.type !== block.type) {
        await convertBlockType(block.id, firstBlock.type);
      }
      const firstTargetIndentLevel = firstBlock.indentLevel !== undefined ? firstBlock.indentLevel : block.indentLevel;
      updateBlockContent(block.id, { 
        content: firstCleanedContent,
        indentLevel: firstTargetIndentLevel,
        ...(firstBlock.type === 'todo-list' && { isChecked: firstBlock.completed || false })
      });
      setLocalContent(firstCleanedContent);

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
          if (parsedBlock.type === 'todo-list' && parsedBlock.completed) {
            setTimeout(() => updateBlockContent(newBlockId, { isChecked: true }), 50);
          }
          lastBlockId = newBlockId;
        }
      }
      setTimeout(() => {
        const lastBlockElement = document.querySelector(`[data-block-id="${lastBlockId}"] input`);
        if (lastBlockElement) (lastBlockElement as HTMLInputElement).focus();
      }, 100);
    } catch (error) {
      console.error('Error parsing pasted content:', error);
    }
  }, [block, updateBlockContent, convertBlockType, onCreateBlock]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const content = e.target.value;
    setLocalContent(content);
    
    if (isComposing) return;

    updateBlockContent(block.id, { content });

    const markdownMatch = getMarkdownShortcut(content);
    if (markdownMatch) {
      convertBlockType(block.id, markdownMatch.type);
      if (markdownMatch.shouldClearContent) {
        updateBlockContent(block.id, { content: '' });
        setLocalContent('');
      }
    }

    const slashIndex = content.lastIndexOf('/');
    if (slashIndex !== -1 && slashIndex === content.length - 1) {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        setSlashMenuPosition({ x: rect.left, y: rect.bottom + 4 });
        setSlashSearchQuery('');
        setShowSlashMenu(true);
      }
    } else if (slashIndex !== -1 && content.substring(0, slashIndex).trim() === '') {
      const searchQuery = content.substring(slashIndex + 1);
      setSlashSearchQuery(searchQuery);
      if (!showSlashMenu) {
        const rect = inputRef.current?.getBoundingClientRect();
        if (rect) {
          setSlashMenuPosition({ x: rect.left, y: rect.bottom + 4 });
          setShowSlashMenu(true);
        }
      }
    } else {
      setShowSlashMenu(false);
      setSlashSearchQuery('');
    }
  }, [block.id, updateBlockContent, convertBlockType, isComposing, showSlashMenu]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = e;
    const cmdKey = ctrlKey || metaKey;
    const input = inputRef.current as HTMLTextAreaElement;

    if (isComposing) return;

    if (showSlashMenu) {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(key)) {
        const handled = slashMenuRef.current?.handleKeyDown(key);
        if (handled) {
          e.preventDefault();
          return;
        }
      }
    }

    if (key === 'Escape') {
      e.preventDefault();
      onSelect();
      input?.blur();
      return;
    }

    if (cmdKey && key === 'a') {
      if (input) {
        const isAllTextSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
        const isEmptyBlock = input.value.length === 0;
        if (isAllTextSelected || isEmptyBlock) {
          e.preventDefault();
          onSelect();
          input.blur();
          return;
        }
      }
    }

    if (cmdKey && key === 'Enter' && block.type === 'todo-list') {
      e.preventDefault();
      toggleTodoCheck(block.id);
      return;
    }

    if (cmdKey && shiftKey && key === '9') {
      e.preventDefault();
      if (block.type !== 'todo-list') {
        convertBlockType(block.id, 'todo-list');
      }
      return;
    }

    if (cmdKey && shiftKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      e.preventDefault();
      if (key === 'ArrowUp') {
        onMoveUp();
      } else {
        onMoveDown();
      }
      return;
    }

    // Arrow navigation with multi-line support
    if (key === 'ArrowUp' && !cmdKey && !shiftKey) {
      if (input && input.selectionStart === 0 && input.selectionEnd === 0) {
        const beforeCursor = input.value.substring(0, input.selectionStart);
        const isOnFirstLine = !beforeCursor.includes('\n');
        if (isOnFirstLine) {
          e.preventDefault();
          const allBlocks = document.querySelectorAll('[data-block-id]');
          const currentBlockElement = input.closest('[data-block-id]');
          if (currentBlockElement) {
            const currentIndex = Array.from(allBlocks).indexOf(currentBlockElement);
            if (currentIndex > 0) {
              const prevBlock = allBlocks[currentIndex - 1];
              const prevInput = prevBlock.querySelector('textarea') as HTMLTextAreaElement;
              if (prevInput) {
                isArrowNavigating.current = true;
                prevInput.focus();
                prevInput.setSelectionRange(prevInput.value.length, prevInput.value.length);
                setTimeout(() => {
                  isArrowNavigating.current = false;
                }, 0);
              }
            }
          }
          return;
        }
      }
    }

    if (key === 'ArrowDown' && !cmdKey && !shiftKey) {
      if (input && input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
        const afterCursor = input.value.substring(input.selectionStart);
        const isOnLastLine = !afterCursor.includes('\n');
        if (isOnLastLine) {
          e.preventDefault();
          const allBlocks = document.querySelectorAll('[data-block-id]');
          const currentBlockElement = input.closest('[data-block-id]');
          if (currentBlockElement) {
            const currentIndex = Array.from(allBlocks).indexOf(currentBlockElement);
            if (currentIndex < allBlocks.length - 1) {
              const nextBlock = allBlocks[currentIndex + 1];
              const nextInput = nextBlock.querySelector('textarea') as HTMLTextAreaElement;
              if (nextInput) {
                isArrowNavigating.current = true;
                nextInput.focus();
                nextInput.setSelectionRange(0, 0);
                setTimeout(() => {
                  isArrowNavigating.current = false;
                }, 0);
              }
            }
          }
          return;
        }
      }
    }

    // Tab handling
    if (key === 'Tab' && !shiftKey) {
      e.preventDefault();
      onIndent();
      return;
    }

    if (key === 'Tab' && shiftKey) {
      e.preventDefault();
      onOutdent();
      return;
    }

    // Enter handling
    if (key === 'Enter') {
      if (shiftKey) return; // Allow line breaks
      
      if (!cmdKey) {
        e.preventDefault();
        if (block.type === 'todo-list') {
          if (localContent.trim() === '') {
            if (block.indentLevel === 0) {
              onNewBlock('paragraph', 0);
            } else if (block.indentLevel >= 3) {
              onNewBlock('paragraph', Math.max(0, block.indentLevel - 2));
            } else {
              onNewBlock('paragraph', Math.max(0, block.indentLevel - 1));
            }
          } else {
            onNewBlock('todo-list', block.indentLevel);
          }
        } else {
          onNewBlock(block.type === 'paragraph' ? undefined : block.type, block.indentLevel);
        }
        return;
      }
    }

    // Backspace handling
    if (key === 'Backspace') {
      if (input && input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault();
        if (localContent === '') {
          if (block.type === 'todo-list' && block.indentLevel > 0) {
            if (block.indentLevel >= 4) {
              onOutdent();
              onOutdent();
            } else {
              onOutdent();
            }
          } else {
            onDeleteBlock();
          }
        } else {
          onMergeUp();
        }
        return;
      }
    }

    // Additional shortcuts
    if (cmdKey && key === '/') {
      e.preventDefault();
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        setSlashMenuPosition({ x: rect.left, y: rect.bottom + 4 });
        setShowSlashMenu(true);
      }
      return;
    }

    if (cmdKey && key === 'd') {
      e.preventDefault();
      onDuplicateBlock();
      return;
    }

    // Text formatting
    if (cmdKey && input && input.selectionStart !== input.selectionEnd) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      let formatType: 'bold' | 'italic' | 'underline' | 'code' | 'strikethrough' | null = null;
      
      if (key === KEYBOARD_SHORTCUTS.BOLD) formatType = 'bold';
      else if (key === KEYBOARD_SHORTCUTS.ITALIC) formatType = 'italic';
      else if (key === KEYBOARD_SHORTCUTS.UNDERLINE) formatType = 'underline';
      else if (key === KEYBOARD_SHORTCUTS.INLINE_CODE) formatType = 'code';
      else if (shiftKey && key === KEYBOARD_SHORTCUTS.STRIKETHROUGH) formatType = 'strikethrough';
      
      if (formatType) {
        e.preventDefault();
        const { content: newContent, cursorPosition } = applyTextFormatting(localContent, start, end, formatType);
        setLocalContent(newContent);
        updateBlockContent(block.id, { content: newContent });
        setTimeout(() => input.setSelectionRange(cursorPosition, cursorPosition), 0);
        return;
      }
    }

    // Block type shortcuts
    if (cmdKey && shiftKey) {
      switch (key) {
        case '0': e.preventDefault(); convertBlockType(block.id, 'paragraph'); return;
        case '1': e.preventDefault(); updateBlockContent(block.id, { content: '# ' + localContent }); setLocalContent('# ' + localContent); return;
        case '2': e.preventDefault(); updateBlockContent(block.id, { content: '## ' + localContent }); setLocalContent('## ' + localContent); return;
        case '3': e.preventDefault(); updateBlockContent(block.id, { content: '### ' + localContent }); setLocalContent('### ' + localContent); return;
        case '4': e.preventDefault(); convertBlockType(block.id, 'todo-list'); return;
        case '5': e.preventDefault(); convertBlockType(block.id, 'bulleted-list'); return;
      }
    }
  }, [
    block.type, localContent, block.id, block.indentLevel, toggleTodoCheck, onMoveUp, onMoveDown, onIndent, onOutdent,
    onNewBlock, onDeleteBlock, onMergeUp, onDuplicateBlock, onSelect, isComposing, showSlashMenu,
    convertBlockType, updateBlockContent,
  ]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
    setShowSlashMenu(false);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    const content = (e.target as HTMLInputElement).value;
    setLocalContent(content);
    updateBlockContent(block.id, { content });
    
    const markdownMatch = getMarkdownShortcut(content);
    if (markdownMatch) {
      convertBlockType(block.id, markdownMatch.type);
      if (markdownMatch.shouldClearContent) {
        updateBlockContent(block.id, { content: '' });
        setLocalContent('');
      }
    }
    
    if (content.endsWith('/')) {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        setSlashMenuPosition({ x: rect.left, y: rect.bottom + 4 });
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
        const newContent = content.substring(0, slashIndex);
        updateBlockContent(block.id, { content: newContent });
        setLocalContent(newContent);
      }
    }
    setShowSlashMenu(false);
    setSlashSearchQuery('');
  };

  const handleToggleCheck = () => {
    if (block.type === 'todo-list') {
      toggleTodoCheck(block.id);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (!isArrowNavigating.current) {
      onSelect();
    }
  };

  const handleBlur = () => setIsFocused(false);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    
    e.dataTransfer.setData('text/plain', block.id);
    e.dataTransfer.setData('application/json', JSON.stringify({
      blockId: block.id,
      type: block.type,
      content: block.content,
      indentLevel: block.indentLevel,
      isChecked: block.isChecked
    }));
    
    setDraggedBlock({
      blockId: block.id,
      sourcePageId: pageId,
      type: block.type,
      content: block.content,
      indentLevel: block.indentLevel,
      isChecked: block.isChecked
    });
    
    if (onDragStart) {
      onDragStart(block.id);
    }
  }, [block, pageId, onDragStart, setDraggedBlock]);

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

  const handleBlockClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Don't select if clicking on interactive elements
    if (target.tagName === 'TEXTAREA' || 
        target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' ||
        target.closest('button') ||
        target.closest('[draggable="true"]')) {
      return;
    }
    
    // Only stop propagation if we're actually going to select
    e.stopPropagation();
    onSelect(e);
  }, [onSelect]);

  return {
    inputRef,
    slashMenuRef,
    localContent,
    isFocused,
    isComposing,
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
  };
};
