import React from 'react';
import clsx from 'clsx';
import { Block } from '@/types/index';
import { getIndentStyle, getBlockFeatures } from '@/utils/editor';

interface BlockIconProps {
  block: Block;
  onToggleCheck: () => void;
}

export const BlockIcon: React.FC<BlockIconProps> = ({ block, onToggleCheck }) => {
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
        <div className="relative" style={indentStyle}>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering block selection
              onToggleCheck();
            }}
            className={clsx(
              'w-4 h-4 rounded border-2 mt-1 flex items-center justify-center transition-colors',
              block.isChecked
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 hover:border-blue-300'
            )}
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
        </div>
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
      return <div className="w-4 mt-1" style={indentStyle} />;
    default:
      return <div className="w-4 mt-1" style={indentStyle} />;
  }
};
