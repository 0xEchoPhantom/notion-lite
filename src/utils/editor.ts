/**
 * Editor utility functions
 * Centralized utilities for better maintainability and AI collaboration
 */

import { Block, BlockType } from '@/types/index';
import { 
  MAX_INDENT_LEVEL, 
  MIN_INDENT_LEVEL, 
  INDENT_SIZE_PX,
  MARKDOWN_SHORTCUTS,
  BLOCK_TYPE_CONFIG 
} from '@/constants/editor';

/**
 * Calculates the margin-left style for a given indent level
 * @param indentLevel - The indent level of the block
 * @returns CSS style object with margin-left
 */
export const getIndentStyle = (indentLevel: number) => ({
  marginLeft: `${indentLevel * INDENT_SIZE_PX}px`
});

/**
 * Checks if a block can be indented further
 * @param block - The block to check
 * @returns True if the block can be indented
 */
export const canIndentBlock = (block: Block): boolean => {
  return block.indentLevel < MAX_INDENT_LEVEL;
};

/**
 * Checks if a block can be outdented
 * @param block - The block to check
 * @returns True if the block can be outdented
 */
export const canOutdentBlock = (block: Block): boolean => {
  return block.indentLevel > MIN_INDENT_LEVEL;
};

/**
 * Checks if content matches a markdown shortcut pattern
 * @param content - The content to check
 * @returns Object with matching shortcut info or null
 */
export const getMarkdownShortcut = (content: string): {
  type: BlockType;
  shouldClearContent: boolean;
} | null => {
  const trimmed = content.trim();
  
  console.log('getMarkdownShortcut called:', {
    original: `"${content}"`,
    trimmed: `"${trimmed}"`,
    length: content.length,
    trimmedLength: trimmed.length
  });
  
  // Check for exact patterns with space at the end
  switch (content) { // Use content directly, not trimmed
    case '- ':
      console.log('Matched: dash todo');
      return { type: 'todo-list', shouldClearContent: true };
    case '* ':
      console.log('Matched: asterisk bullet');
      return { type: 'bulleted-list', shouldClearContent: true };
    case '+ ':
      console.log('Matched: plus bullet');
      return { type: 'bulleted-list', shouldClearContent: true };
    case '[] ':
      console.log('Matched: bracket todo');
      return { type: 'todo-list', shouldClearContent: true };
    case '[ ] ':
      console.log('Matched: spaced bracket todo');
      return { type: 'todo-list', shouldClearContent: true };
  }
  
  // Numbered list (convert to bullet for now)
  if (/^\d+\. $/.test(content)) {
    console.log('Matched: numbered list');
    return { type: 'bulleted-list', shouldClearContent: true };
  }

  // Heading shortcuts (don't clear content, just add prefix)
  if (content === `${MARKDOWN_SHORTCUTS.HEADING_1} `) {
    console.log('Matched: heading 1');
    return { type: 'paragraph', shouldClearContent: false };
  }

  if (content === `${MARKDOWN_SHORTCUTS.HEADING_2} `) {
    console.log('Matched: heading 2');
    return { type: 'paragraph', shouldClearContent: false };
  }

  if (content === `${MARKDOWN_SHORTCUTS.HEADING_3} `) {
    console.log('Matched: heading 3');
    return { type: 'paragraph', shouldClearContent: false };
  }

  if (content === `${MARKDOWN_SHORTCUTS.QUOTE} `) {
    console.log('Matched: quote');
    return { type: 'paragraph', shouldClearContent: false };
  }

  if (content === `${MARKDOWN_SHORTCUTS.DIVIDER} `) {
    console.log('Matched: divider');
    return { type: 'paragraph', shouldClearContent: false };
  }

  console.log('No markdown match found');
  return null;
};

/**
 * Gets the appropriate placeholder text for a block
 * @param block - The block to get placeholder for
 * @param hasContent - Whether the block has content
 * @returns Placeholder text
 */
export const getBlockPlaceholder = (block: Block, hasContent: boolean, isFocused: boolean = false): string => {
  if (hasContent) return '';
  
  // Only show "Type / for commands" when block is focused and empty
  if (isFocused && !hasContent) {
    return 'Type / for commands';
  }
  
  // When not focused, show empty placeholder for clean look
  return '';
};

/**
 * Checks if a block type supports certain features
 * @param blockType - The block type to check
 * @returns Feature support object
 */
export const getBlockFeatures = (blockType: BlockType) => {
  const config = BLOCK_TYPE_CONFIG[blockType];
  return {
    supportsIndent: config?.supportsIndent ?? true,
    hasCheckbox: config?.hasCheckbox ?? false,
    icon: config?.icon,
  };
};

/**
 * Checks if a block is a sub-todo (has a parent task)
 * @param block - The block to check
 * @returns True if the block is a sub-todo
 */
export const isSubTodo = (block: Block): boolean => {
  return block.type === 'todo-list' && !!block.taskMetadata?.parentTaskId;
};

/**
 * Checks if a block has sub-todos
 * @param block - The block to check
 * @returns True if the block has sub-todos
 */
export const hasSubTodos = (block: Block): boolean => {
  return block.type === 'todo-list' && 
         !!block.taskMetadata?.subtaskIds && 
         block.taskMetadata.subtaskIds.length > 0;
};

/**
 * Applies text formatting to selected text
 * @param content - The full content
 * @param start - Selection start position
 * @param end - Selection end position
 * @param format - The format to apply ('bold', 'italic', etc.)
 * @returns Object with new content and cursor position
 */
export const applyTextFormatting = (
  content: string,
  start: number,
  end: number,
  format: 'bold' | 'italic' | 'underline' | 'code' | 'strikethrough'
): { content: string; cursorPosition: number } => {
  const selectedText = content.substring(start, end);
  let formattedText: string;
  let additionalOffset: number;
  
  switch (format) {
    case 'bold':
      formattedText = `**${selectedText}**`;
      additionalOffset = 4;
      break;
    case 'italic':
      formattedText = `*${selectedText}*`;
      additionalOffset = 2;
      break;
    case 'underline':
      formattedText = `__${selectedText}__`;
      additionalOffset = 4;
      break;
    case 'code':
      formattedText = `\`${selectedText}\``;
      additionalOffset = 2;
      break;
    case 'strikethrough':
      formattedText = `~~${selectedText}~~`;
      additionalOffset = 4;
      break;
    default:
      return { content, cursorPosition: end };
  }
  
  const newContent = content.substring(0, start) + formattedText + content.substring(end);
  const cursorPosition = end + additionalOffset;
  
  return { content: newContent, cursorPosition };
};
