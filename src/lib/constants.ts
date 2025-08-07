// src/lib/constants.ts
import { BlockType } from './types';

export const MAX_INDENT = 5;

export const BLOCK_TYPES = [
  {
    type: 'paragraph' as BlockType,
    label: 'Text',
    description: 'Just start writing with plain text.',
    icon: '📝',
  },
  {
    type: 'h1' as BlockType,
    label: 'Heading 1',
    description: 'Big section heading.',
    icon: 'H1',
  },
  {
    type: 'h2' as BlockType,
    label: 'Heading 2',
    description: 'Medium section heading.',
    icon: 'H2',
  },
  {
    type: 'h3' as BlockType,
    label: 'Heading 3',
    description: 'Small section heading.',
    icon: 'H3',
  },
  {
    type: 'bulleted-list' as BlockType,
    label: 'Bulleted list',
    description: 'Create a simple bulleted list.',
    icon: '•',
  },
  {
    type: 'numbered-list' as BlockType,
    label: 'Numbered list',
    description: 'Create a list with numbering.',
    icon: '1.',
  },
  {
    type: 'todo-list' as BlockType,
    label: 'To-do list',
    description: 'Track tasks with a to-do list.',
    icon: '☑️',
  },
  {
    type: 'quote' as BlockType,
    label: 'Quote',
    description: 'Capture a quote.',
    icon: '”',
  },
  {
    type: 'code' as BlockType,
    label: 'Code',
    description: 'Capture a code snippet.',
    icon: '<>',
  },
];
