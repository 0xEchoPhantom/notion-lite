'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { BlockType } from '@/types/index';

interface SlashMenuItem {
  id: BlockType;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
}

const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  {
    id: 'paragraph',
    label: 'Text',
    description: 'Just start writing with plain text.',
    icon: '📝',
    keywords: ['text', 'paragraph', 'plain']
  },
  {
    id: 'heading-1',
    label: 'Heading 1',
    description: 'Big section heading.',
    icon: 'H1',
    keywords: ['heading', 'title', 'h1', 'large']
  },
  {
    id: 'heading-2',
    label: 'Heading 2',
    description: 'Medium section heading.',
    icon: 'H2',
    keywords: ['heading', 'subtitle', 'h2', 'medium']
  },
  {
    id: 'heading-3',
    label: 'Heading 3',
    description: 'Small section heading.',
    icon: 'H3',
    keywords: ['heading', 'h3', 'small']
  },
  {
    id: 'bulleted-list',
    label: 'Bulleted list',
    description: 'Create a simple bulleted list.',
    icon: '•',
    keywords: ['bullet', 'list', 'unordered', 'bullets', 'ul', '-', '*', 'dot']
  },
  {
    id: 'numbered-list',
    label: 'Numbered list',
    description: 'Create a list with numbering.',
    icon: '1.',
    keywords: ['number', 'list', 'ordered', 'numbered', 'ol', '1', 'numbers']
  },
  {
    id: 'todo-list',
    label: 'To-do list',
    description: 'Track tasks with a to-do list.',
    icon: '☐',
    keywords: ['todo', 'task', 'check', 'checkbox', 'checklist', 'tasks']
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Capture a quote.',
    icon: '"',
    keywords: ['quote', 'citation', 'blockquote']
  },
  {
    id: 'code',
    label: 'Code',
    description: 'Capture a code snippet.',
    icon: '{}',
    keywords: ['code', 'snippet', 'programming']
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Visually divide blocks.',
    icon: '—',
    keywords: ['divider', 'separator', 'line', 'hr']
  }
];

interface SlashMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: BlockType) => void;
  position: { x: number; y: number };
  searchQuery?: string;
  mode?: 'notes' | 'gtd'; // Add mode prop to filter available block types
}

export interface SlashMenuRef {
  handleKeyDown: (key: string) => boolean;
}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(function SlashMenu(props, ref) {
  const {
    isOpen,
    onClose,
    onSelectType,
    position,
    searchQuery = '',
    mode = 'notes',
  } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevSearchQueryRef = useRef(searchQuery);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Filter menu items based on mode and search query
  const getAvailableItems = () => {
    let availableItems = SLASH_MENU_ITEMS;
    
    // Filter by mode
    if (mode === 'gtd') {
      // In GTD mode, only allow todo-list and paragraph (text)
      availableItems = SLASH_MENU_ITEMS.filter(item => 
        item.id === 'todo-list' || item.id === 'paragraph'
      );
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      availableItems = availableItems.filter(item =>
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }
    
    return availableItems;
  };

  const filteredItems = getAvailableItems();

  // Reset selected index only when search query changes (not when navigating)
  useEffect(() => {
    if (prevSearchQueryRef.current !== searchQuery) {
      setSelectedIndex(0);
      prevSearchQueryRef.current = searchQuery;
    }
  }, [searchQuery]);

  // Ensure selectedIndex stays within bounds when filteredItems change
  useEffect(() => {
    if (selectedIndex >= filteredItems.length && filteredItems.length > 0) {
      setSelectedIndex(filteredItems.length - 1);
    }
  }, [filteredItems.length, selectedIndex]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedItemRef.current && menuRef.current) {
      const selectedElement = selectedItemRef.current;
      const menuElement = menuRef.current;
      
      // Get the selected item's position relative to the menu
      const itemRect = selectedElement.getBoundingClientRect();
      const menuRect = menuElement.getBoundingClientRect();
      
      // Check if item is above the visible area
      if (itemRect.top < menuRect.top) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      // Check if item is below the visible area
      else if (itemRect.bottom > menuRect.bottom) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Expose keyboard handler to parent
  useImperativeHandle(ref, () => ({
    handleKeyDown: (key: string): boolean => {
      if (filteredItems.length === 0) return false;
      
      switch (key) {
        case 'ArrowDown':
          setSelectedIndex(prev => (prev + 1) % filteredItems.length);
          return true;
        case 'ArrowUp':
          setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
          return true;
        case 'Enter':
          if (filteredItems[selectedIndex]) {
            onSelectType(filteredItems[selectedIndex].id);
            onClose();
          }
          return true;
        case 'Escape':
          onClose();
          return true;
        default:
          return false;
      }
    }
  }), [filteredItems, selectedIndex, onSelectType, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || filteredItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[280px] max-h-60 overflow-y-auto"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        BASIC BLOCKS
      </div>
      {filteredItems.map((item, index) => (
        <button
          key={item.id}
          ref={selectedIndex === index ? selectedItemRef : null}
          className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-start gap-3 ${
            selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500 dark:border-blue-400' : ''
          }`}
          onClick={() => {
            onSelectType(item.id);
            onClose();
          }}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="text-lg mt-0.5 w-6 text-center">{item.icon}</span>
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">{item.label}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
});
