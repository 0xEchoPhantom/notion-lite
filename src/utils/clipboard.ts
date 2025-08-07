import { BlockType } from '@/types/index';

export interface ParsedBlock {
  type: BlockType;
  content: string;
  completed?: boolean;
}

/**
 * Parses clipboard content from Notion and converts it to our block format
 */
export function parseNotionClipboard(text: string): ParsedBlock[] {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const blocks: ParsedBlock[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;

    // Parse todo items (completed and uncompleted)
    // Pattern: "- [ ] content" or "- [x] content" or "- [X] content"
    const todoMatch = trimmedLine.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (todoMatch) {
      const [, checkState, content] = todoMatch;
      const completed = checkState.toLowerCase() === 'x';
      blocks.push({
        type: 'todo-list',
        content: content.trim(),
        completed
      });
      continue;
    }

    // Parse bullet points
    // Pattern: "- content" or "• content"
    const bulletMatch = trimmedLine.match(/^[-•]\s*(.*)$/);
    if (bulletMatch) {
      const [, content] = bulletMatch;
      blocks.push({
        type: 'bulleted-list',
        content: content.trim()
      });
      continue;
    }

    // Parse numbered lists
    // Pattern: "1. content" or "1) content"
    const numberedMatch = trimmedLine.match(/^\d+[.)]\s*(.*)$/);
    if (numberedMatch) {
      const [, content] = numberedMatch;
      blocks.push({
        type: 'numbered-list',
        content: content.trim()
      });
      continue;
    }

    // Parse headings
    // Pattern: "# Heading" or "## Heading" or "### Heading"
    const headingMatch = trimmedLine.match(/^(#{1,3})\s*(.*)$/);
    if (headingMatch) {
      const [, hashes, content] = headingMatch;
      const level = hashes.length;
      const headingType: BlockType = level === 1 ? 'heading-1' : 
                                   level === 2 ? 'heading-2' : 'heading-3';
      blocks.push({
        type: headingType,
        content: content.trim()
      });
      continue;
    }

    // Parse quotes
    // Pattern: "> quote content"
    const quoteMatch = trimmedLine.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      const [, content] = quoteMatch;
      blocks.push({
        type: 'quote',
        content: content.trim()
      });
      continue;
    }

    // Parse code blocks (single line)
    // Pattern: "`code`" or "```code```"
    const codeMatch = trimmedLine.match(/^`{1,3}(.+?)`{1,3}$/);
    if (codeMatch) {
      const [, content] = codeMatch;
      blocks.push({
        type: 'code',
        content: content.trim()
      });
      continue;
    }

    // Default to paragraph for any other content
    blocks.push({
      type: 'paragraph',
      content: trimmedLine
    });
  }

  return blocks;
}

/**
 * Cleans up content by removing mentions and extra formatting
 */
export function cleanContent(content: string): string {
  // Remove Notion-style mentions (@username)
  let cleaned = content.replace(/@[^\s]+/g, '').trim();
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Checks if the clipboard content looks like it came from Notion
 */
export function isNotionContent(text: string): boolean {
  const notionPatterns = [
    /^-\s*\[([ xX])\]\s*/, // Todo items
    /^[-•]\s*/, // Bullet points
    /^\d+[.)]\s*/, // Numbered lists
    /^#{1,3}\s*/, // Headings
    /^>\s*/, // Quotes
  ];
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // If more than 30% of lines match Notion patterns, consider it Notion content
  const matchingLines = lines.filter(line => 
    notionPatterns.some(pattern => pattern.test(line.trim()))
  );
  
  return matchingLines.length / lines.length > 0.3;
}
