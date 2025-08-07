/**
 * Editor configuration constants
 * Centralized configuration for better maintainability and AI collaboration
 */

/** Maximum nesting/indent level for blocks */
export const MAX_INDENT_LEVEL = 10; // Increased from 5 to 10 for deeper nesting

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
  BULLET_LIST: ['*', '+'], // Removed '-' from bullet list
  TODO_LIST: ['[]', '[ ]', '-'], // Added '-' to todo list for easier access
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
  'heading-1': {
    name: 'Heading 1',
    description: 'Big section heading',
    supportsIndent: false,
    placeholder: 'Heading 1',
    hasCheckbox: false,
    icon: 'H1',
  },
  'heading-2': {
    name: 'Heading 2',
    description: 'Medium section heading',
    supportsIndent: false,
    placeholder: 'Heading 2',
    hasCheckbox: false,
    icon: 'H2',
  },
  'heading-3': {
    name: 'Heading 3',
    description: 'Small section heading',
    supportsIndent: false,
    placeholder: 'Heading 3',
    hasCheckbox: false,
    icon: 'H3',
  },
  'bulleted-list': {
    name: 'Bulleted List',
    description: 'List with bullet points',
    supportsIndent: true,
    placeholder: 'List item',
    hasCheckbox: false,
    icon: '•',
  },
  'numbered-list': {
    name: 'Numbered List',
    description: 'List with numbering',
    supportsIndent: true,
    placeholder: 'List item',
    hasCheckbox: false,
    icon: '1.',
  },
  'todo-list': {
    name: 'Todo List',
    description: 'List with checkboxes',
    supportsIndent: true,
    placeholder: 'To-do',
    hasCheckbox: true,
    icon: '☐',
  },
  quote: {
    name: 'Quote',
    description: 'Capture a quote',
    supportsIndent: true,
    placeholder: 'Empty quote',
    hasCheckbox: false,
    icon: '"',
  },
  code: {
    name: 'Code',
    description: 'Code snippet',
    supportsIndent: false,
    placeholder: 'Enter code',
    hasCheckbox: false,
    icon: '{}',
  },
  divider: {
    name: 'Divider',
    description: 'Visual divider',
    supportsIndent: false,
    placeholder: '',
    hasCheckbox: false,
    icon: '—',
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
