'use client';

import React from 'react';
import { Block as BlockType, BlockType as BType } from '@/types/index';
import { SlashMenu } from './SlashMenu';
import { useBlockLogic } from '@/hooks/useBlockLogic';
import { BlockWrapper, BlockIcon, DragHandle, BlockInput } from './block-parts';

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
        />
        
        <BlockIcon
          block={block}
          onToggleCheck={handleToggleCheck}
        />
        
        <div className="flex-1 min-w-0">
          <BlockInput
            block={block}
            localContent={localContent}
            isFocused={isFocused}
            inputRef={inputRef}
            onInput={handleInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
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
    </>
  );
};
