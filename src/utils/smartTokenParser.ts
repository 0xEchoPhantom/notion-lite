// Smart token parser with unified @ syntax

import { TaskToken, TaskCompany, TASK_RULES } from '@/types/task';

export interface ParsedTokens {
  cleanContent: string;
  tokens: TaskToken[];
  values: {
    value?: number;
    effort?: number;
    dueDate?: Date;
    assignee?: string;
    company?: TaskCompany;
  };
}

// Detect token type based on content
function detectTokenType(tokenContent: string): {
  type: TaskToken['type'];
  value: number | Date | string | TaskCompany;
} | null {
  // Remove @ prefix if present
  const content = tokenContent.startsWith('@') ? tokenContent.slice(1) : tokenContent;
  
  // Check for explicit type prefix (e.g., value:15M, effort:3h)
  if (content.includes(':')) {
    const [prefix, val] = content.split(':', 2);
    const lowerPrefix = prefix.toLowerCase();
    
    switch (lowerPrefix) {
      case 'value':
      case 'v':
        return { type: 'value', value: parseValue(val) };
      case 'effort':
      case 'e':
        return { type: 'effort', value: parseEffort(val) };
      case 'due':
      case 'd': {
        const d = parseDueDate(val);
        return d ? { type: 'due', value: d } : null;
      }
      case 'company':
      case 'c':
        return { type: 'company', value: val.toUpperCase() };
      case 'assignee':
      case 'a':
        return { type: 'assignee', value: val };
      default:
        return null;
    }
  }
  
  // Smart detection without prefix
  
  // Company codes (exact match)
  if (TASK_RULES.COMPANIES.includes(content.toUpperCase() as TaskCompany)) {
    return { type: 'company', value: content.toUpperCase() };
  }
  
  // Money values (number with K/M/B or starts with $)
  if (/^\$?\d+(\.\d+)?[KMB]?$/i.test(content)) {
    const cleanValue = content.replace('$', '');
    return { type: 'value', value: parseValue(cleanValue) };
  }
  
  // Time/effort (number with h/d/w/m)
  if (/^\d+(\.\d+)?[hdwm]$/i.test(content)) {
    return { type: 'effort', value: parseEffort(content) };
  }
  
  // Dates (ISO format, English, Vietnamese, and shortcuts)
  if (/^\d{4}-\d{2}-\d{2}$/.test(content) || 
      /^(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(content) ||
      /^(td|tmr|mon|tue|wed|thu|fri|sat|sun)$/i.test(content) ||
      /^(hôm\s*nay|ngày\s*mai|thứ\s*[2-8]|chủ\s*nhật)$/i.test(content)) {
    const date = parseDueDate(content);
    if (date) {
      return { type: 'due', value: date };
    }
  }
  
  // Person names (starts with uppercase or all lowercase)
  if (/^[A-Z][a-z]+$/.test(content) || /^[a-z]+$/.test(content)) {
    return { type: 'assignee', value: content };
  }
  
  // Unknown type -> ignore
  return null;
}

export function parseTaskTokens(rawContent: string): ParsedTokens {
  const tokens: TaskToken[] = [];
  const values: ParsedTokens['values'] = {} as ParsedTokens['values'];
  
  // Find all @ tokens
  const matches = Array.from(rawContent.matchAll(TASK_RULES.TOKEN_PATTERN));
  
  // Process each match
  for (const match of matches) {
    if (match.index === undefined) continue;
    
    const raw = match[0];
    const tokenContent = match[1];
    
    const detected = detectTokenType(tokenContent);
  if (!detected) continue;
    
    const token: TaskToken = {
      type: detected.type,
      raw,
      value: detected.value,
      position: {
        start: match.index,
        end: match.index + raw.length
      }
    };
    
    tokens.push(token);
    
    // Store parsed values
    switch (detected.type) {
      case 'value':
        values.value = typeof detected.value === 'number' ? detected.value : undefined;
        break;
      case 'effort':
        values.effort = typeof detected.value === 'number' ? detected.value : undefined;
        break;
      case 'due':
        values.dueDate = detected.value instanceof Date ? detected.value : undefined;
        break;
      case 'company':
        values.company = (typeof detected.value === 'string' ? detected.value : undefined) as TaskCompany | undefined;
        break;
      case 'assignee':
        values.assignee = typeof detected.value === 'string' ? detected.value : undefined;
        break;
    }
  }
  
  // Remove tokens from content
  let cleanContent = rawContent;
  tokens.sort((a, b) => b.position.start - a.position.start);
  for (const token of tokens) {
    cleanContent = 
      cleanContent.substring(0, token.position.start) + 
      cleanContent.substring(token.position.end);
  }
  
  // Clean up extra spaces
  cleanContent = cleanContent.replace(/\s+/g, ' ').trim();
  
  return {
    cleanContent,
    tokens,
    values
  };
}

// Parse value (money)
function parseValue(str: string): number {
  const match = str.match(/^(\d+(?:\.\d+)?)([KMB]?)$/i);
  if (!match) return 0;
  
  const [, numStr, multiplier] = match;
  const num = parseFloat(numStr);
  
  if (multiplier) {
    const multipliers: Record<string, number> = {
      K: 1000,
      M: 1000000,
      B: 1000000000
    };
    return num * multipliers[multiplier.toUpperCase()];
  }
  
  return num;
}

// Parse effort (time)
function parseEffort(str: string): number {
  const match = str.match(/^(\d+(?:\.\d+)?)([hdwm])$/i);
  if (!match) return 0;
  
  const [, numStr, unit] = match;
  const num = parseFloat(numStr);
  
  const multipliers: Record<string, number> = {
    h: 1,      // hours
    d: 8,      // 8 hours per day
    w: 40,     // 40 hours per week
    m: 160     // 160 hours per month
  };
  
  return num * multipliers[unit.toLowerCase()];
}

// Parse due date
function parseDueDate(str: string): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lowerStr = str.toLowerCase().replace(/\s+/g, '');
  
  // English shortcuts
  if (lowerStr === 'today' || lowerStr === 'td') {
    return today;
  }
  
  if (lowerStr === 'tomorrow' || lowerStr === 'tmr') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  // Vietnamese
  if (lowerStr === 'hômnay') {
    return today;
  }
  
  if (lowerStr === 'ngàymai') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  // English day names and shortcuts
  const dayMappings: Record<string, number> = {
    'sunday': 0, 'sun': 0, 'chủnhật': 0,
    'monday': 1, 'mon': 1, 'thứ2': 1, 'thu2': 1,
    'tuesday': 2, 'tue': 2, 'thứ3': 2, 'thu3': 2,
    'wednesday': 3, 'wed': 3, 'thứ4': 3, 'thu4': 3,
    'thursday': 4, 'thu': 4, 'thứ5': 4, 'thu5': 4,
    'friday': 5, 'fri': 5, 'thứ6': 5, 'thu6': 5,
    'saturday': 6, 'sat': 6, 'thứ7': 6, 'thu7': 6
  };
  
  const dayIndex = dayMappings[lowerStr];
  if (dayIndex !== undefined) {
    const targetDate = new Date(today);
    const currentDay = today.getDay();
    const daysUntilTarget = (dayIndex - currentDay + 7) % 7 || 7; // Next occurrence
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate;
  }
  
  // ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const date = new Date(str + 'T00:00:00');
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

// probability removed

// Format helpers
export function formatValue(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value}`;
}

export function formatEffort(hours: number): string {
  if (hours >= 160) {
    return `${(hours / 160).toFixed(1)}m`;
  }
  if (hours >= 40) {
    return `${(hours / 40).toFixed(1)}w`;
  }
  if (hours >= 8) {
    return `${(hours / 8).toFixed(1)}d`;
  }
  return `${hours}h`;
}

export function formatDueDate(date: Date | string | number | null | undefined): string {
  // Handle different input types
  let dateObj: Date;
  
  if (!date) {
    return 'no date';
  }
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    return 'invalid date';
  }
  
  // Check if the resulting date is valid
  if (isNaN(dateObj.getTime())) {
    return 'invalid date';
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const targetDate = new Date(dateObj);
  targetDate.setHours(0, 0, 0, 0);
  
  // Double-check targetDate is still valid after manipulation
  if (isNaN(targetDate.getTime())) {
    return 'invalid date';
  }
  
  if (targetDate.getTime() === today.getTime()) {
    return 'today';
  }
  if (targetDate.getTime() === tomorrow.getTime()) {
    return 'tmr';
  }
  
  // Check if it's within the next week - use short forms
  const daysUntil = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil > 0 && daysUntil <= 7) {
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return shortDays[targetDate.getDay()];
  }
  
  return targetDate.toISOString().split('T')[0];
}