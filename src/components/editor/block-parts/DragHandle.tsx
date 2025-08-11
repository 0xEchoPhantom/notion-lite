import React from 'react';
import clsx from 'clsx';
import { useGlobalDrag } from '@/contexts/GlobalDragContext';

interface DragHandleProps {
  isSelected: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onSelect?: () => void;
}

export const DragHandle: React.FC<DragHandleProps> = ({ isSelected, onDragStart, onDragEnd, onSelect }) => {
  const { isDragging } = useGlobalDrag();
  
  return (
    <div
      className={clsx(
        'transition-all cursor-grab active:cursor-grabbing',
        'flex items-center justify-center w-6 h-6',
        'hover:bg-gray-200 rounded flex-shrink-0 mr-1 active:bg-gray-300',
        // Show on hover or when selected
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100',
        isDragging ? 'text-blue-500 scale-110' : 'text-gray-500 hover:text-gray-700'
      )}
      draggable="true"
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEnd(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) {
          onSelect();
        }
      }}
      title={isDragging ? "Drag to a page in the sidebar" : "Click to select • Drag to move"}
      onMouseDown={(e) => {
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
