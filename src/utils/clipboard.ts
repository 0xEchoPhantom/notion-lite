import { BlockType } from '@/types/index';

export interface ParsedBlock {
  type: BlockType;
  content: string;
  completed?: boolean;
  indentLevel?: number;
}

/**
 * Detects the indentation level of a line
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  
  const spaces = match[1];
  // Count tabs as 4 spaces, regular spaces as 1
  return spaces.replace(/\t/g, '    ').length;
}

/**
 * Parses clipboard content from Notion and converts it to our block format
 */
export function parseNotionClipboard(text: string): ParsedBlock[] {
  const lines = text.split('\n');
  const blocks: ParsedBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;

    const indentLevel = Math.min(getIndentLevel(line) / 2, 5); // Max 5 indent levels, 2 spaces per level

    // Parse todo items (completed and uncompleted)
    // Pattern: "☐ content", "☑ content", "- [ ] content" or "- [x] content" or "- [X] content"
    const todoMatch = trimmedLine.match(/^(?:☐|☑|-?\s*\[([ xX☑☐])\])\s*(.*)$/);
    if (todoMatch) {
      const [, checkState, content] = todoMatch;
      const completed = checkState && (checkState.toLowerCase() === 'x' || checkState === '☑');
      
      // Collect all content including nested lines
      let fullContent = content.trim();
      let j = i + 1;
      
      // Look for subsequent lines that are more indented and should be part of this item
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        
        if (!nextTrimmed) {
          j++;
          continue;
        }
        
        const nextIndent = getIndentLevel(nextLine);
        
        // If the next line is more indented, it's part of this item
        if (nextIndent > getIndentLevel(line)) {
          if (fullContent) {
            fullContent += '\n' + nextTrimmed;
          } else {
            fullContent = nextTrimmed;
          }
          j++;
        } else {
          break;
        }
      }
      
      blocks.push({
        type: 'todo-list',
        content: fullContent,
        completed: completed || false,
        indentLevel
      });
      
      // Skip the lines we've already processed
      i = j - 1;
      continue;
    }

    // Parse bullet points
    // Pattern: "- content" or "• content"
    const bulletMatch = trimmedLine.match(/^[-•]\s*(.*)$/);
    if (bulletMatch) {
      const [, content] = bulletMatch;
      
      // Collect all content including nested lines
      let fullContent = content.trim();
      let j = i + 1;
      
      // Look for subsequent lines that are more indented and should be part of this item
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        
        if (!nextTrimmed) {
          j++;
          continue;
        }
        
        const nextIndent = getIndentLevel(nextLine);
        
        // If the next line is more indented, it's part of this item
        if (nextIndent > getIndentLevel(line)) {
          if (fullContent) {
            fullContent += '\n' + nextTrimmed;
          } else {
            fullContent = nextTrimmed;
          }
          j++;
        } else {
          break;
        }
      }
      
      blocks.push({
        type: 'bulleted-list',
        content: fullContent,
        indentLevel
      });
      
      // Skip the lines we've already processed
      i = j - 1;
      continue;
    }

    // Parse numbered lists
    // Pattern: "1. content" or "1) content"
    const numberedMatch = trimmedLine.match(/^\d+[.)]\s*(.*)$/);
    if (numberedMatch) {
      const [, content] = numberedMatch;
      
      // Check if there are subsequent indented lines that should be part of this block
      let fullContent = content.trim();
      let j = i + 1;
      while (j < lines.length && lines[j].trim() && getIndentLevel(lines[j]) > getIndentLevel(line)) {
        const nextLine = lines[j].trim();
        if (nextLine) {
          fullContent += '\n' + nextLine;
        }
        j++;
      }
      
      blocks.push({
        type: 'numbered-list',
        content: fullContent,
        indentLevel
      });
      
      // Skip the lines we've already processed
      i = j - 1;
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
        content: content.trim(),
        indentLevel
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
        content: content.trim(),
        indentLevel
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
        content: content.trim(),
        indentLevel
      });
      continue;
    }

    // Default to paragraph for any other content
    blocks.push({
      type: 'paragraph',
      content: trimmedLine,
      indentLevel
    });
  }

  return blocks;
}

/**
 * Cleans up content by preserving mentions and formatting
 */
export function cleanContent(content: string): string {
  // Preserve @mentions but clean up extra whitespace
  const cleaned = content.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Checks if the clipboard content looks like it came from Notion
 */
export function isNotionContent(text: string): boolean {
  const notionPatterns = [
    /^(?:☐|☑|-?\s*\[([ xX☑☐])\])\s*/, // Todo items (Notion checkbox symbols or markdown)
    /^[-•]\s*/, // Bullet points
    /^\d+[.)]\s*/, // Numbered lists
    /^#{1,3}\s*/, // Headings
    /^>\s*/, // Quotes
  ];
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // If more than 20% of lines match Notion patterns, consider it Notion content
  const matchingLines = lines.filter(line => 
    notionPatterns.some(pattern => pattern.test(line.trim()))
  );
  
  return matchingLines.length / lines.length > 0.2;
}
