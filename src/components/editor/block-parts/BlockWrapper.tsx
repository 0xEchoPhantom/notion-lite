import React from 'react';
import clsx from 'clsx';
// Drag-to-select removed; normal click behavior retained

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
  isSelected,
  isMultiSelected,
  isDragging,
  isDraggedOver,
  dropPosition,
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
        <div className="h-1 bg-blue-500 mx-2 my-1 rounded-full opacity-80 shadow-sm" />
      )}
      <div
        data-block-id={blockId}
        className={clsx(
          'group relative flex items-start gap-1 py-1 px-2 mx-2 rounded hover:bg-gray-50',
          'transition-all duration-200',
          isDragging && 'opacity-50 transform scale-95',
          isSelected && 'bg-blue-50 hover:bg-blue-100',
          isMultiSelected && 'bg-blue-100 hover:bg-blue-150'
        )}
        style={{
          borderLeft: isSelected || isMultiSelected ? '2px solid #3b82f6' : '2px solid transparent'
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onMouseUp={handleMouseUp}
      >
        {children}
      </div>
      {isDraggedOver && dropPosition === 'below' && (
        <div className="h-1 bg-blue-500 mx-2 my-1 rounded-full opacity-80 shadow-sm" />
      )}
    </>
  );
};
