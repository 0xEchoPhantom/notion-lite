/**
 * Editor configuration constants
 * Centralized configuration for better maintainability and AI collaboration
 */

/** Maximum nesting/indent level for blocks */
export const MAX_INDENT_LEVEL = 5;

/** Minimum nesting/indent level for blocks */
export const MIN_INDENT_LEVEL = 0;

/** Indent size in pixels per level */
export const INDENT_SIZE_PX = 24;

/** Keyboard shortcuts configuration */
export const KEYBOARD_SHORTCUTS = {
  // Block creation
  ENTER: 'Enter',
  TAB: 'Tab',
  ESCAPE: 'Escape',
  
  // Text formatting
  BOLD: 'b',
  ITALIC: 'i',
  UNDERLINE: 'u',
  INLINE_CODE: 'e',
  STRIKETHROUGH: 'S', // with Shift
  
  // Block operations
  DUPLICATE: 'd',
  DELETE: 'Backspace',
  MOVE_UP: 'ArrowUp',
  MOVE_DOWN: 'ArrowDown',
  
  // Block type conversion
  PARAGRAPH: '0',
  HEADING_1: '1',
  HEADING_2: '2',
  HEADING_3: '3',
  TODO_LIST: '4',
  BULLET_LIST: '5',
  
  // Menu
  SLASH_MENU: '/',
  BLOCK_MENU: '/',
} as const;

/** Markdown shortcuts for block creation */
export const MARKDOWN_SHORTCUTS = {
  BULLET_LIST: ['-', '*', '+'],
  TODO_LIST: ['[]', '[ ]'],
  HEADING_1: '#',
  HEADING_2: '##',
  HEADING_3: '###',
  QUOTE: '>',
  DIVIDER: '---',
} as const;

/** Block type metadata for AI understanding */
export const BLOCK_TYPE_CONFIG = {
  paragraph: {
    name: 'Paragraph',
    description: 'Regular text content',
    supportsIndent: true,
    placeholder: '',
    hasCheckbox: false,
    icon: undefined,
  },
  'bulleted-list': {
    name: 'Bulleted List',
    description: 'List with bullet points',
    supportsIndent: true,
    placeholder: 'List item',
    hasCheckbox: false,
    icon: '•',
  },
  'todo-list': {
    name: 'Todo List',
    description: 'List with checkboxes',
    supportsIndent: true,
    placeholder: 'To-do',
    hasCheckbox: true,
    icon: undefined,
  },
} as const;

/** Visual styling constants */
export const VISUAL_CONFIG = {
  SELECTION_BORDER_COLOR: 'border-l-blue-500',
  SELECTION_BACKGROUND: 'bg-blue-50',
  HOVER_BACKGROUND: 'hover:bg-gray-50',
  DRAG_HANDLE_SIZE: 'w-4 h-6',
  TRANSITION_DURATION: 'duration-150',
} as const;
