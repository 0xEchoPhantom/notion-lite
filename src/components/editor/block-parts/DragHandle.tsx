import React from 'react';
import clsx from 'clsx';

interface DragHandleProps {
  isSelected: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export const DragHandle: React.FC<DragHandleProps> = ({ isSelected, onDragStart, onDragEnd }) => {
  return (
    <div
      className={clsx(
        'transition-all cursor-grab active:cursor-grabbing',
        'flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700',
        'hover:bg-gray-200 rounded flex-shrink-0 mr-1 active:bg-gray-300',
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title="Click and drag to move block"
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" className="pointer-events-none">
        <circle cx="4" cy="4" r="2" />
        <circle cx="10" cy="4" r="2" />
        <circle cx="4" cy="9" r="2" />
        <circle cx="10" cy="9" r="2" />
        <circle cx="4" cy="14" r="2" />
        <circle cx="10" cy="14" r="2" />
      </svg>
    </div>
  );
};
