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

// Detect token type based on symbol and content
function detectTokenType(fullToken: string): {
  type: TaskToken['type'];
  value: number | Date | string | TaskCompany;
} | null {
  if (!fullToken || fullToken.length < 2) return null;
  
  const symbol = fullToken[0];
  const content = fullToken.slice(1).trim();
  
  if (!content) return null;
  
  // Multi-symbol detection - each symbol has clear purpose
  switch (symbol) {
    case '$': // Money/Value ONLY - must be valid number format
      const value = parseValue(content);
      return value > 0 ? { type: 'value', value } : null;
      
    case '#': // Date/Due
      const date = parseDueDate(content);
      return date ? { type: 'due', value: date } : null;
      
    case '~': // Effort/Time ONLY - must be valid time format
      const effort = parseEffort(content);
      return effort > 0 ? { type: 'effort', value: effort } : null;
      
    case '&': // Company/Organization
      if (TASK_RULES.COMPANIES.includes(content.toUpperCase() as TaskCompany)) {
        return { type: 'company', value: content.toUpperCase() };
      }
      return null;
      
    case '@': // Assignee/Person ONLY
      // @ is strictly for people/assignees - no other type detection
      return { type: 'assignee', value: content };
      
    default:
      return null;
  }
}

// Legacy detection for @ tokens - NO LONGER USED
// Keeping for reference only - all symbols now strictly detect their own type
// @ = assignee, $ = value, # = date, ~ = effort, & = company
/*
function detectLegacyTokenType(content: string): {
  type: TaskToken['type'];
  value: number | Date | string | TaskCompany;
} | null {
  // This function is deprecated - each symbol now only detects its specific type
  return null;
}
*/

export function parseTaskTokens(rawContent: string): ParsedTokens {
  const tokens: TaskToken[] = [];
  const values: ParsedTokens['values'] = {} as ParsedTokens['values'];
  
  // Find all tokens (multi-symbol: @, $, #, ~, &)
  const matches = Array.from(rawContent.matchAll(TASK_RULES.TOKEN_PATTERN));
  
  // Process each match
  for (const match of matches) {
    if (match.index === undefined) continue;
    
    const raw = match[0]; // Full token including symbol
    
    const detected = detectTokenType(raw);
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
  const match = str.match(/^(\d+(?:\.\d+)?)([mhdw])$/i);
  if (!match) return 0;
  
  const [, numStr, unit] = match;
  const num = parseFloat(numStr);
  
  const multipliers: Record<string, number> = {
    m: 1/60,   // minutes (convert to hours)
    h: 1,      // hours
    d: 8,      // 8 hours per day
    w: 40,     // 40 hours per week
  };
  
  return num * multipliers[unit.toLowerCase()];
}

// Parse due date - Enhanced with Vietnamese and more formats
function parseDueDate(str: string): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Normalize string but preserve spaces for multi-word terms
  const normalizedStr = str.trim();
  const lowerStr = normalizedStr.toLowerCase();
  const noSpaceStr = lowerStr.replace(/\s+/g, '');
  
  // === TODAY/YESTERDAY/TOMORROW ===
  // English
  if (lowerStr === 'today' || lowerStr === 'td') {
    return today;
  }
  
  if (lowerStr === 'tomorrow' || lowerStr === 'tmr') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  if (lowerStr === 'yesterday' || lowerStr === 'yst') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  // Vietnamese
  if (noSpaceStr === 'hômnay' || noSpaceStr === 'homnay') {
    return today;
  }
  
  if (noSpaceStr === 'hômqua' || noSpaceStr === 'homqua') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  if (noSpaceStr === 'ngàymai' || noSpaceStr === 'ngaymai' || lowerStr === 'mai') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  // === RELATIVE DAYS (e.g., +3, 3d, +5d) ===
  const relativeDaysMatch = normalizedStr.match(/^\+?(\d+)d?$/i);
  if (relativeDaysMatch) {
    const days = parseInt(relativeDaysMatch[1]);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);
    return targetDate;
  }
  
  // === RELATIVE TIME EXPRESSIONS ===
  // "in X days/weeks/months" or "sau X ngày/tuần/tháng"
  const relativeMatch = normalizedStr.match(/^(in|sau)\s+(\d+)\s+(ngày|tuần|tháng|days?|weeks?|months?)$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[2]);
    const unit = relativeMatch[3].toLowerCase();
    const targetDate = new Date(today);
    
    if (unit === 'ngày' || unit === 'day' || unit === 'days') {
      targetDate.setDate(targetDate.getDate() + amount);
    } else if (unit === 'tuần' || unit === 'week' || unit === 'weeks') {
      targetDate.setDate(targetDate.getDate() + (amount * 7));
    } else if (unit === 'tháng' || unit === 'month' || unit === 'months') {
      targetDate.setMonth(targetDate.getMonth() + amount);
    }
    
    return targetDate;
  }
  
  // === WEEK RELATIVE DATES ===
  // Vietnamese
  if (noSpaceStr === 'tuầnnày' || noSpaceStr === 'tuannay') {
    // This week (next occurrence of the same weekday)
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 7);
    return targetDate;
  }
  
  if (noSpaceStr === 'tuầntới' || noSpaceStr === 'tuantoi' || 
      noSpaceStr === 'tuầnsau' || noSpaceStr === 'tuansau') {
    // Next week (7 days from now)
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 7);
    return targetDate;
  }
  
  if (noSpaceStr === 'cuốituần' || noSpaceStr === 'cuoituan') {
    // Weekend (next Saturday)
    const targetDate = new Date(today);
    const currentDay = today.getDay();
    const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
    targetDate.setDate(today.getDate() + daysUntilSaturday);
    return targetDate;
  }
  
  if (noSpaceStr === 'đầutuần' || noSpaceStr === 'dautuan') {
    // Beginning of week (next Monday)
    const targetDate = new Date(today);
    const currentDay = today.getDay();
    const daysUntilMonday = (1 - currentDay + 7) % 7 || 7;
    targetDate.setDate(today.getDate() + daysUntilMonday);
    return targetDate;
  }
  
  // English week terms
  if (lowerStr === 'next week' || lowerStr === 'nextweek') {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 7);
    return targetDate;
  }
  
  if (lowerStr === 'this week' || lowerStr === 'thisweek') {
    // End of this week (Friday)
    const targetDate = new Date(today);
    const currentDay = today.getDay();
    const daysUntilFriday = (5 - currentDay + 7) % 7 || 7;
    targetDate.setDate(today.getDate() + daysUntilFriday);
    return targetDate;
  }
  
  if (lowerStr === 'weekend') {
    // Next Saturday
    const targetDate = new Date(today);
    const currentDay = today.getDay();
    const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
    targetDate.setDate(today.getDate() + daysUntilSaturday);
    return targetDate;
  }
  
  // Shortcuts
  if (lowerStr === 'eow') { // End of week
    const targetDate = new Date(today);
    const currentDay = today.getDay();
    const daysUntilFriday = (5 - currentDay + 7) % 7 || 7;
    targetDate.setDate(today.getDate() + daysUntilFriday);
    return targetDate;
  }
  
  if (lowerStr === 'eom') { // End of month
    const targetDate = new Date(today);
    targetDate.setMonth(targetDate.getMonth() + 1, 0); // Last day of current month
    return targetDate;
  }
  
  if (lowerStr === 'eonw') { // End of next week
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 14 - today.getDay() + 5); // Next Friday
    return targetDate;
  }
  
  // === WEEKDAY NAMES ===
  const dayMappings: Record<string, number> = {
    // English
    'sunday': 0, 'sun': 0,
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6,
    // Vietnamese
    'chủnhật': 0, 'chunhat': 0, 'cn': 0,
    'thứ2': 1, 'thứhai': 1, 'thu2': 1, 'thuhai': 1, 't2': 1,
    'thứ3': 2, 'thứba': 2, 'thu3': 2, 'thuba': 2, 't3': 2,
    'thứ4': 3, 'thứtư': 3, 'thu4': 3, 'thutu': 3, 't4': 3,
    'thứ5': 4, 'thứnăm': 4, 'thu5': 4, 'thunam': 4, 't5': 4,
    'thứ6': 5, 'thứsáu': 5, 'thu6': 5, 'thusau': 5, 't6': 5,
    'thứ7': 6, 'thứbảy': 6, 'thu7': 6, 'thubay': 6, 't7': 6
  };
  
  const dayIndex = dayMappings[noSpaceStr];
  if (dayIndex !== undefined) {
    const targetDate = new Date(today);
    const currentDay = today.getDay();
    const daysUntilTarget = (dayIndex - currentDay + 7) % 7 || 7; // Next occurrence
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate;
  }
  
  // === DATE FORMATS ===
  // ISO date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedStr)) {
    const date = new Date(normalizedStr + 'T00:00:00');
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // DD/MM/YYYY or DD/MM (assumes current year)
  const slashDateMatch = normalizedStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashDateMatch) {
    const day = parseInt(slashDateMatch[1]);
    const month = parseInt(slashDateMatch[2]);
    const year = slashDateMatch[3] ? 
      (slashDateMatch[3].length === 2 ? 2000 + parseInt(slashDateMatch[3]) : parseInt(slashDateMatch[3])) : 
      today.getFullYear();
    
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (!isNaN(date.getTime()) && date.getDate() === day) { // Validate date
      return date;
    }
  }
  
  // DD-MM-YYYY or DD-MM (assumes current year)
  const dashDateMatch = normalizedStr.match(/^(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?$/);
  if (dashDateMatch) {
    const day = parseInt(dashDateMatch[1]);
    const month = parseInt(dashDateMatch[2]);
    const year = dashDateMatch[3] ? 
      (dashDateMatch[3].length === 2 ? 2000 + parseInt(dashDateMatch[3]) : parseInt(dashDateMatch[3])) : 
      today.getFullYear();
    
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (!isNaN(date.getTime()) && date.getDate() === day) { // Validate date
      return date;
    }
  }
  
  // DD.MM.YYYY or DD.MM (assumes current year)
  const dotDateMatch = normalizedStr.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
  if (dotDateMatch) {
    const day = parseInt(dotDateMatch[1]);
    const month = parseInt(dotDateMatch[2]);
    const year = dotDateMatch[3] ? 
      (dotDateMatch[3].length === 2 ? 2000 + parseInt(dotDateMatch[3]) : parseInt(dotDateMatch[3])) : 
      today.getFullYear();
    
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (!isNaN(date.getTime()) && date.getDate() === day) { // Validate date
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
  if (hours >= 40) {
    return `${(hours / 40).toFixed(1)}w`;
  }
  if (hours >= 8) {
    return `${(hours / 8).toFixed(1)}d`;
  }
  if (hours >= 1) {
    return `${hours}h`;
  }
  // For less than 1 hour, show minutes
  return `${Math.round(hours * 60)}m`;
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