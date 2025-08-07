/**
 * Editor utility functions
 * Centralized utilities for better maintainability and AI collaboration
 */

import { Block, BlockType } from '@/types';
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
  
  // Bullet list shortcuts
  if (MARKDOWN_SHORTCUTS.BULLET_LIST.some(marker => trimmed === `${marker} `)) {
    return { type: 'bulleted-list', shouldClearContent: true };
  }
  
  // Todo list shortcuts
  if (MARKDOWN_SHORTCUTS.TODO_LIST.some(marker => trimmed === `${marker} `)) {
    return { type: 'todo-list', shouldClearContent: true };
  }
  
  // Numbered list (convert to bullet for now)
  if (/^\d+\. $/.test(trimmed)) {
    return { type: 'bulleted-list', shouldClearContent: true };
  }
  
  // Heading shortcuts (don't clear content, just add prefix)
  if (trimmed === `${MARKDOWN_SHORTCUTS.HEADING_1} `) {
    return { type: 'paragraph', shouldClearContent: false };
  }
  
  if (trimmed === `${MARKDOWN_SHORTCUTS.HEADING_2} `) {
    return { type: 'paragraph', shouldClearContent: false };
  }
  
  if (trimmed === `${MARKDOWN_SHORTCUTS.HEADING_3} `) {
    return { type: 'paragraph', shouldClearContent: false };
  }
  
  if (trimmed === `${MARKDOWN_SHORTCUTS.QUOTE} `) {
    return { type: 'paragraph', shouldClearContent: false };
  }
  
  if (trimmed === `${MARKDOWN_SHORTCUTS.DIVIDER} `) {
    return { type: 'paragraph', shouldClearContent: false };
  }
  
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
