'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Block as BlockType, BlockType as BType } from '@/types/index';
import { useBlocksWithKeyboard } from '@/hooks/useBlocks';
import { SlashMenu } from './SlashMenu';
import clsx from 'clsx';

interface BlockProps {
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

let debounceTimer: NodeJS.Timeout | null = null;

export const Block: React.FC<BlockProps> = ({
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
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const blockRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const debouncedUpdate = useCallback((content: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      updateBlockContent(block.id, { content });
    }, 300);
  }, [block.id, updateBlockContent]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        listItem: false,
        orderedList: false,
        hardBreak: false, // Disable line breaks within blocks
      }),
      Placeholder.configure({
        placeholder: () => {
          if (block.type === 'paragraph') return 'Type \'/\' for commands';
          if (block.type === 'bulleted-list') return 'List item';
          if (block.type === 'todo-list') return 'To-do';
          return 'Start typing...';
        },
      }),
    ],
    content: block.content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const content = editor.getText();
      debouncedUpdate(content);
      
      // Handle markdown shortcuts at the start of line
      const isAtStart = editor.state.selection.from === content.length && editor.state.selection.from > 1;
      
      if (isAtStart && content === '- ') {
        convertBlockType(block.id, 'bulleted-list');
        editor.commands.clearContent();
      } else if (isAtStart && content === '[] ') {
        convertBlockType(block.id, 'todo-list');
        editor.commands.clearContent();
      }
      
      // Handle slash command
      if (content.endsWith('/')) {
        const rect = blockRef.current?.getBoundingClientRect();
        if (rect) {
          setSlashMenuPosition({
            x: rect.left,
            y: rect.bottom + 4,
          });
          setShowSlashMenu(true);
        }
      } else if (showSlashMenu && !content.endsWith('/')) {
        setShowSlashMenu(false);
      }
    },
    onFocus: onSelect,
  });

  useEffect(() => {
    if (editor && editor.getText() !== block.content) {
      editor.commands.setContent(block.content);
    }
  }, [block.content, editor]);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const handleSlashMenuSelect = (type: BType) => {
    if (editor) {
      // Remove the '/' and convert block
      editor.commands.deleteRange({ 
        from: editor.state.selection.head - 1, 
        to: editor.state.selection.head 
      });
      convertBlockType(block.id, type);
    }
    setShowSlashMenu(false);
  };

  const handleToggleCheck = useCallback(() => {
    if (block.type === 'todo-list') {
      toggleTodoCheck(block.id);
    }
  }, [block.type, block.id, toggleTodoCheck]);

  // Enhanced keyboard handling for Notion-like behavior
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = e;
    const cmdKey = ctrlKey || metaKey;
    
    // Cmd/Ctrl + Enter: Toggle todo
    if (cmdKey && key === 'Enter' && block.type === 'todo-list') {
      e.preventDefault();
      handleToggleCheck();
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
    
    // Tab: Indent
    if (key === 'Tab' && !shiftKey) {
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
    
    // Backspace at start: Merge up or delete block
    if (key === 'Backspace') {
      const content = editor?.getText() || '';
      const selection = editor?.state.selection;
      
      if (selection?.from === 0 && selection?.to === 0) {
        e.preventDefault();
        if (content === '') {
          // Empty block: delete it
          onDeleteBlock();
        } else {
          // Non-empty block: merge up
          onMergeUp();
        }
        return;
      }
    }
    
    // Cmd/Ctrl + /: Show slash menu
    if (cmdKey && key === '/') {
      e.preventDefault();
      const rect = blockRef.current?.getBoundingClientRect();
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
    editor, 
    handleToggleCheck, 
    onNewBlock, 
    onMergeUp, 
    onMoveUp, 
    onMoveDown, 
    onIndent, 
    onOutdent, 
    onDeleteBlock
  ]);

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
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        );
      default:
        return (
          <div 
            className="w-4 mt-1"
            style={indentStyle}
          />
        );
    }
  };

  const renderDragHandle = () => (
    <div className={clsx(
      'opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
      'flex items-center justify-center w-4 h-6 text-gray-400 hover:text-gray-600',
      'absolute left-0 top-1'
    )}>
      <svg width="10" height="4" viewBox="0 0 10 4" fill="currentColor">
        <circle cx="2" cy="2" r="1"/>
        <circle cx="8" cy="2" r="1"/>
      </svg>
    </div>
  );

  return (
    <>
      <div
        ref={blockRef}
        className={clsx(
          'group relative flex items-start gap-2 py-1 px-2 rounded hover:bg-gray-50',
          'transition-colors duration-150',
          isSelected && 'bg-gray-50',
          block.isChecked && 'opacity-60'
        )}
        onKeyDown={handleKeyDown}
      >
        {renderDragHandle()}
        {renderBlockIcon()}
        <div className="flex-1 min-w-0">
          <EditorContent
            editor={editor}
            className={clsx(
              'prose prose-sm max-w-none focus-within:outline-none',
              'prose-p:my-0 prose-p:leading-6',
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
