'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BlockType } from '@/types';
import clsx from 'clsx';

interface SlashMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: BlockType) => void;
  position: { x: number; y: number };
}

interface MenuItem {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  {
    type: 'paragraph',
    label: 'Text',
    description: 'Just start writing with plain text.',
    icon: '📝',
  },
  {
    type: 'bulleted-list',
    label: 'Bulleted list',
    description: 'Create a simple bulleted list.',
    icon: '•',
  },
  {
    type: 'todo-list',
    label: 'To-do list',
    description: 'Track tasks with a to-do list.',
    icon: '☑️',
  },
];

export const SlashMenu: React.FC<SlashMenuProps> = ({
  isOpen,
  onClose,
  onSelectType,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % menuItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + menuItems.length) % menuItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          onSelectType(menuItems[selectedIndex].type);
          onClose();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, selectedIndex, onSelectType, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[280px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide">
        BASIC BLOCKS
      </div>
      {menuItems.map((item, index) => (
        <button
          key={item.type}
          className={clsx(
            'w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start gap-3',
            selectedIndex === index && 'bg-gray-50'
          )}
          onClick={() => {
            onSelectType(item.type);
            onClose();
          }}
        >
          <span className="text-lg mt-0.5">{item.icon}</span>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{item.label}</div>
            <div className="text-sm text-gray-500">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};
