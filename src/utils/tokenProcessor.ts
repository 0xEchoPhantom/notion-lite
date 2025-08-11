/**
 * Comprehensive @ Token Processing Utilities
 * Handles multiple tokens, validation, and edge cases
 */

import { parseTaskTokens } from './smartTokenParser';

export interface TokenMatch {
  fullMatch: string;      // The complete match including @
  value: string;          // The value without @
  startIndex: number;     // Position in the string
  endIndex: number;       // End position
  type?: 'value' | 'effort' | 'due' | 'company' | 'assignee';
}

export interface ProcessedContent {
  cleanContent: string;   // Content with all @ tokens removed
  tokens: TokenMatch[];    // All found tokens
  metadata: Record<string, unknown>; // Combined metadata from all tokens
}

/**
 * Find all @ tokens in content
 * Handles edge cases like emails, special characters, etc.
 */
export function findAllTokens(content: string): TokenMatch[] {
  const tokens: TokenMatch[] = [];
  
  // Regex to match @ tokens but exclude emails
  // Matches: @word, @123, @10k, @2h, @ACME, @John-Smith, @João
  // Excludes: email@domain.com
  const tokenRegex = /(?<![a-zA-Z0-9._%+-])@([a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]+(?:[-_.]?[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]+)*(?:\d+[kmhwdKMHWD]?)?)/g;
  
  let match;
  while ((match = tokenRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const value = match[1];
    
    // Skip if this looks like part of an email
    if (isLikelyEmail(content, match.index)) {
      continue;
    }
    
    tokens.push({
      fullMatch,
      value,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
      type: inferTokenType(value)
    });
  }
  
  return tokens;
}

/**
 * Check if @ is likely part of an email address
 */
function isLikelyEmail(content: string, atIndex: number): boolean {
  // Check characters before @
  if (atIndex > 0) {
    const before = content[atIndex - 1];
    if (/[a-zA-Z0-9._%+-]/.test(before)) {
      return true;
    }
  }
  
  // Check if followed by domain-like pattern
  const after = content.substring(atIndex + 1, atIndex + 20);
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(after)) {
    return true;
  }
  
  return false;
}

/**
 * Infer token type from its value
 */
function inferTokenType(value: string): TokenMatch['type'] {
  const lower = value.toLowerCase();
  
  // Value patterns: 10k, 1M, 5000
  if (/^\d+(?:\.\d+)?[kmb]?$/i.test(value)) {
    return 'value';
  }
  
  // Effort patterns: 2h, 30m, 1d, 2w
  if (/^\d+(?:\.\d+)?[mhdw]$/i.test(value)) {
    return 'effort';
  }
  
  // Date patterns: 2024-12-25, today, tomorrow
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) || 
      /^(today|tomorrow|yesterday)$/i.test(lower)) {
    return 'due';
  }
  
  // Company patterns: All uppercase, 2-8 chars
  if (/^[A-Z]{2,8}$/.test(value)) {
    return 'company';
  }
  
  // Default to assignee for names
  return 'assignee';
}

/**
 * Process all @ tokens in content
 * Returns clean content and combined metadata
 */
export function processAllTokens(content: string): ProcessedContent {
  const tokens = findAllTokens(content);
  
  // Sort tokens by position (reverse order for removal)
  const sortedTokens = [...tokens].sort((a, b) => b.startIndex - a.startIndex);
  
  // Remove tokens from content (from end to start to preserve indices)
  let cleanContent = content;
  for (const token of sortedTokens) {
    cleanContent = 
      cleanContent.substring(0, token.startIndex) + 
      cleanContent.substring(token.endIndex);
  }
  
  // Clean up extra spaces
  cleanContent = cleanContent
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .replace(/\s+([.,!?])/g, '$1')  // Remove space before punctuation
    .trim();
  
  // Combine metadata from all tokens
  const metadata: Record<string, unknown> = {};
  
  for (const token of tokens) {
    const parsed = parseTaskTokens(`@${token.value}`);
    
    // Merge parsed values into metadata
    // Later tokens override earlier ones for the same field
    if (parsed.values.value !== undefined) {
      metadata.value = parsed.values.value;
    }
    if (parsed.values.effort !== undefined) {
      metadata.effort = parsed.values.effort;
    }
    if (parsed.values.dueDate !== undefined) {
      metadata.dueDate = parsed.values.dueDate;
    }
    if (parsed.values.assignee !== undefined) {
      metadata.assignee = parsed.values.assignee;
    }
    if (parsed.values.company !== undefined) {
      metadata.company = parsed.values.company;
    }
  }
  
  return {
    cleanContent,
    tokens,
    metadata
  };
}

/**
 * Validate token values
 */
export function validateToken(value: string, type: TokenMatch['type']): {
  valid: boolean;
  error?: string;
} {
  switch (type) {
    case 'value':
      const parsedValue = parseFloat(value.replace(/[kmb]/i, ''));
      if (isNaN(parsedValue) || parsedValue < 0) {
        return { valid: false, error: 'Invalid value' };
      }
      if (parsedValue > 1000000000000) {
        return { valid: false, error: 'Value too large' };
      }
      return { valid: true };
      
    case 'effort':
      const parsedEffort = parseFloat(value.replace(/[mhdw]/i, ''));
      if (isNaN(parsedEffort) || parsedEffort <= 0) {
        return { valid: false, error: 'Invalid effort' };
      }
      if (parsedEffort > 10000) {
        return { valid: false, error: 'Effort too large' };
      }
      return { valid: true };
      
    case 'assignee':
      if (value.length < 1 || value.length > 50) {
        return { valid: false, error: 'Name must be 1-50 characters' };
      }
      return { valid: true };
      
    case 'company':
      if (value.length < 1 || value.length > 10) {
        return { valid: false, error: 'Company code must be 1-10 characters' };
      }
      return { valid: true };
      
    default:
      return { valid: true };
  }
}

/**
 * Handle special cases for token processing
 */
export function handleSpecialCases(content: string): string {
  // Handle double @@ (escape sequence)
  content = content.replace(/@@/g, '@');
  
  // Handle @'s in possessives (e.g., "@John's report")
  // This is handled by the regex pattern
  
  return content;
}

/**
 * Extract token context for better parsing
 */
export function getTokenContext(
  content: string, 
  tokenIndex: number
): {
  before: string;
  after: string;
  inSentence: boolean;
} {
  const before = content.substring(Math.max(0, tokenIndex - 20), tokenIndex);
  const after = content.substring(
    tokenIndex, 
    Math.min(content.length, tokenIndex + 20)
  );
  
  // Check if token is in middle of sentence
  const beforeHasPeriod = before.lastIndexOf('.') > before.lastIndexOf(' ');
  const afterHasPeriod = after.indexOf('.') !== -1;
  const inSentence = !beforeHasPeriod || afterHasPeriod;
  
  return { before, after, inSentence };
}

/**
 * Merge multiple metadata objects intelligently
 */
export function mergeMetadata(
  existing: Record<string, unknown>,
  ...updates: Record<string, unknown>[]
): Record<string, unknown> {
  const result = { ...existing };
  
  for (const update of updates) {
    for (const [key, value] of Object.entries(update)) {
      if (value !== undefined && value !== null) {
        // Special handling for arrays (e.g., multiple assignees)
        if (Array.isArray(result[key]) && !Array.isArray(value)) {
          (result[key] as unknown[]).push(value);
        } else {
          result[key] = value;
        }
      }
    }
  }
  
  return result;
}

/**
 * Track token positions for undo/redo
 */
export interface TokenSnapshot {
  content: string;
  tokens: TokenMatch[];
  metadata: Record<string, unknown>;
  timestamp: number;
}

export class TokenHistory {
  private history: TokenSnapshot[] = [];
  private currentIndex: number = -1;
  private maxSize: number = 50;
  
  push(snapshot: TokenSnapshot): void {
    // Remove any history after current index
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add new snapshot
    this.history.push(snapshot);
    
    // Limit history size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }
  
  undo(): TokenSnapshot | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }
  
  redo(): TokenSnapshot | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }
  
  canUndo(): boolean {
    return this.currentIndex > 0;
  }
  
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
}