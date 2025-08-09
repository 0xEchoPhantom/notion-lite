import React from 'react';
import clsx from 'clsx';

interface BlockWrapperProps {
  blockId: string;
  isSelected: boolean;
  isMultiSelected: boolean;
  isDragging: boolean;
  isDraggedOver: boolean;
  dropPosition: 'above' | 'below' | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
  blockId,
  isDragging,
  isDraggedOver,
  dropPosition,
  onDragOver,
  onDrop,
  onClick,
  children,
}) => {
  return (
    <>
      {isDraggedOver && dropPosition === 'above' && (
        <div className="h-1 bg-blue-500 mx-2 my-1 rounded-full opacity-80 shadow-sm" />
      )}
      <div
        data-block-id={blockId}
        className={clsx(
          'group relative flex items-start gap-1 py-1 px-2 mx-2 rounded hover:bg-gray-50',
          'transition-all duration-200 border-l-2 border-transparent cursor-pointer',
          isDragging && 'opacity-50 transform scale-95'
        )}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={onClick}
      >
        {children}
      </div>
      {isDraggedOver && dropPosition === 'below' && (
        <div className="h-1 bg-blue-500 mx-2 my-1 rounded-full opacity-80 shadow-sm" />
      )}
    </>
  );
};
