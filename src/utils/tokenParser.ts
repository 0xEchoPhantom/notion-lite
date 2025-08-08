import { TaskToken, ParsedTokens } from '@/types/task';

// Token patterns for parsing inline metadata
const TOKEN_PATTERNS = {
  netValue: /#(\d+(?:\.\d+)?)([kKmM]?)/g,    // #15M, #500k, #2.5M
  effort: /~(\d+(?:\.\d+)?)([hHdDwW]?)/g,     // ~3h, ~2d, ~1w
  due: />(\d{4}-\d{2}-\d{2}|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
  probability: /%(\d*\.?\d+)/g,               // %0.6, %60, %0.95
  assignee: /@([a-zA-Z0-9_]+)/g,              // @john, @team_lead
  project: /:([A-Z]{2,})/g,                   // :AIC, :WN, :BXV, :EA, :PERSONAL
};

// Multipliers for values
const VALUE_MULTIPLIERS: Record<string, number> = {
  'k': 0.001,     // thousands to millions
  'K': 0.001,
  'm': 1,         // millions
  'M': 1,
  '': 1,          // default to millions
};

const TIME_MULTIPLIERS: Record<string, number> = {
  'h': 1,         // hours
  'H': 1,
  'd': 8,         // days to hours (8h workday)
  'D': 8,
  'w': 40,        // weeks to hours (40h workweek)  
  'W': 40,
  '': 1,          // default to hours
};

/**
 * Parse relative dates like "today", "tomorrow", day names
 */
function parseRelativeDate(dateStr: string): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (dateStr.toLowerCase()) {
    case 'today':
      return today;
    
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    
    default:
      // Try parsing as ISO date first
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
      
      // Parse day names (monday, tuesday, etc.)
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayIndex = dayNames.findIndex(day => day === dateStr.toLowerCase());
      
      if (dayIndex !== -1) {
        const targetDate = new Date(today);
        const currentDay = today.getDay();
        let daysToAdd = dayIndex - currentDay;
        
        // If the target day is today or in the past this week, move to next week
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }
        
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        return targetDate;
      }
      
      // Fallback to today if unable to parse
      return today;
  }
}

/**
 * Extract and parse all tokens from task content
 */
export function parseTaskTokens(content: string): ParsedTokens {
  const tokens: TaskToken = {};
  const errors: string[] = [];
  let cleanContent = content;

  try {
    // Parse net value (#15M, #500k)
    const netValueMatches = Array.from(content.matchAll(TOKEN_PATTERNS.netValue));
    if (netValueMatches.length > 0) {
      const lastMatch = netValueMatches[netValueMatches.length - 1];
      const value = parseFloat(lastMatch[1]);
      const unit = lastMatch[2]?.toLowerCase() || 'm';
      const multiplier = VALUE_MULTIPLIERS[unit] || 1;
      tokens.netValue = value * multiplier;
      
      // Remove all net value tokens from clean content
      cleanContent = cleanContent.replace(TOKEN_PATTERNS.netValue, '').trim();
    }

    // Parse effort (~3h, ~2d)  
    const effortMatches = Array.from(content.matchAll(TOKEN_PATTERNS.effort));
    if (effortMatches.length > 0) {
      const lastMatch = effortMatches[effortMatches.length - 1];
      const value = parseFloat(lastMatch[1]);
      const unit = lastMatch[2]?.toLowerCase() || 'h';
      const multiplier = TIME_MULTIPLIERS[unit] || 1;
      tokens.effort = value * multiplier;
      
      cleanContent = cleanContent.replace(TOKEN_PATTERNS.effort, '').trim();
    }

    // Parse due date (>today, >2025-08-21)
    const dueMatches = Array.from(content.matchAll(TOKEN_PATTERNS.due));
    if (dueMatches.length > 0) {
      const lastMatch = dueMatches[dueMatches.length - 1];
      tokens.due = parseRelativeDate(lastMatch[1]);
      
      cleanContent = cleanContent.replace(TOKEN_PATTERNS.due, '').trim();
    }

    // Parse probability (%0.6, %60)
    const probMatches = Array.from(content.matchAll(TOKEN_PATTERNS.probability));
    if (probMatches.length > 0) {
      const lastMatch = probMatches[probMatches.length - 1];
      let prob = parseFloat(lastMatch[1]);
      
      // Convert percentage to decimal if > 1
      if (prob > 1) {
        prob = prob / 100;
      }
      
      // Clamp to 0-1 range
      tokens.probability = Math.max(0, Math.min(1, prob));
      
      cleanContent = cleanContent.replace(TOKEN_PATTERNS.probability, '').trim();
    }

    // Parse assignee (@john)
    const assigneeMatches = Array.from(content.matchAll(TOKEN_PATTERNS.assignee));
    if (assigneeMatches.length > 0) {
      const lastMatch = assigneeMatches[assigneeMatches.length - 1];
      tokens.assignee = lastMatch[1];
      
      cleanContent = cleanContent.replace(TOKEN_PATTERNS.assignee, '').trim();
    }

    // Parse project (:AIC, :PERSONAL)
    const projectMatches = Array.from(content.matchAll(TOKEN_PATTERNS.project));
    if (projectMatches.length > 0) {
      const lastMatch = projectMatches[projectMatches.length - 1];
      tokens.project = lastMatch[1];
      
      cleanContent = cleanContent.replace(TOKEN_PATTERNS.project, '').trim();
    }

    // Clean up extra whitespace
    cleanContent = cleanContent.replace(/\s+/g, ' ').trim();

  } catch (error) {
    errors.push(`Token parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    cleanContent,
    tokens,
    errors
  };
}

/**
 * Rebuild content with tokens for display/editing
 */
export function rebuildTaskContent(cleanContent: string, tokens: TaskToken): string {
  let content = cleanContent;
  
  // Add tokens back in a consistent order
  if (tokens.netValue !== undefined) {
    content += ` #${tokens.netValue}M`;
  }
  
  if (tokens.effort !== undefined) {
    content += ` ~${tokens.effort}h`;
  }
  
  if (tokens.due) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format as relative dates when possible
    if (tokens.due.toDateString() === today.toDateString()) {
      content += ' >today';
    } else if (tokens.due.toDateString() === tomorrow.toDateString()) {
      content += ' >tomorrow';
    } else {
      content += ` >${tokens.due.toISOString().split('T')[0]}`;
    }
  }
  
  if (tokens.probability !== undefined) {
    content += ` %${tokens.probability}`;
  }
  
  if (tokens.assignee) {
    content += ` @${tokens.assignee}`;
  }
  
  if (tokens.project) {
    content += ` :${tokens.project}`;
  }
  
  return content.trim();
}

/**
 * Validate if a task has minimum required data for ROI calculation
 */
export function validateTaskData(tokens: TaskToken): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (tokens.netValue === undefined || tokens.netValue <= 0) {
    missing.push('Net Value');
  }
  
  if (tokens.effort === undefined || tokens.effort <= 0) {
    missing.push('Effort');
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

/**
 * Calculate ROI from tokens
 */
export function calculateROI(tokens: TaskToken): number | null {
  if (!tokens.netValue || !tokens.effort || tokens.effort === 0) {
    return null;
  }
  
  return tokens.netValue / tokens.effort;
}

/**
 * Calculate expected value (ROI * probability)
 */
export function calculateExpectedValue(tokens: TaskToken): number | null {
  const roi = calculateROI(tokens);
  if (roi === null || tokens.probability === undefined) {
    return null;
  }
  
  return roi * tokens.probability;
}

/**
 * Check if content contains any task tokens
 */
export function hasTaskTokens(content: string): boolean {
  return Object.values(TOKEN_PATTERNS).some(pattern => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(content);
  });
}

/**
 * Simple token parser for the simple task interface
 */
export function parseTokens(content: string): {
  netValue?: number;
  effort?: number;
  assignee?: string;
  project?: string;
  due?: Date;
  probability?: number;
} {
  const parsed = parseTaskTokens(content);
  return parsed.tokens;
}

/**
 * Simple ROI calculator that takes individual values
 */
export function calculateSimpleROI(netValue?: number, effort?: number): number | undefined {
  if (!netValue || !effort || effort === 0) {
    return undefined;
  }
  return netValue / effort;
}
