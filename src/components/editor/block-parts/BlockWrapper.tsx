import React from 'react';
import clsx from 'clsx';
import { Block } from '@/types/index';
import { isSubTodo } from '@/utils/editor';
// Drag-to-select removed; normal click behavior retained

interface BlockWrapperProps {
  blockId: string;
  block?: Block;
  isSelected: boolean;
  isMultiSelected: boolean;
  isDragging?: boolean;
  isDraggedOver?: boolean;
  dropPosition?: 'above' | 'below' | null;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
  blockId,
  block,
  isSelected,
  isMultiSelected,
  isDragging = false,
  isDraggedOver = false,
  dropPosition = null,
  onDragOver,
  onDrop,
  onClick,
  children,
}) => {
  const handleMouseUp = (e: React.MouseEvent) => {
    onClick(e);
  };

  return (
    <>
      {isDraggedOver && dropPosition === 'above' && (
        <div className="h-1 bg-blue-500 mx-2 my-1 rounded-full shadow-lg animate-pulse" />
      )}
      <div
        data-block-id={blockId}
        className={clsx(
          'group relative flex items-start gap-1 py-1 px-2 mx-2 rounded',
          'transition-all duration-200',
          isDragging && 'opacity-30 transform scale-95 blur-sm'
        )}
        style={{
          borderLeft: '2px solid transparent'
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onMouseUp={handleMouseUp}
      >
        {children}
      </div>
      {isDraggedOver && dropPosition === 'below' && (
        <div className="h-1 bg-blue-500 mx-2 my-1 rounded-full shadow-lg animate-pulse" />
      )}
    </>
  );
};
