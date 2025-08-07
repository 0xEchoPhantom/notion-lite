import { BlockType } from '@/types/index';

export interface SlashMenuItem {
  id: BlockType;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
}

export const SLASH_MENU_ITEMS: SlashMenuItem[] = [
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
    keywords: ['bullet', 'list', 'unordered']
  },
  {
    id: 'numbered-list',
    label: 'Numbered list',
    description: 'Create a list with numbering.',
    icon: '1.',
    keywords: ['number', 'list', 'ordered']
  },
  {
    id: 'todo-list',
    label: 'To-do list',
    description: 'Track tasks with a to-do list.',
    icon: '☐',
    keywords: ['todo', 'task', 'check', 'checkbox']
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
