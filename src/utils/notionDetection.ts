import { getNotionService } from '@/lib/notion';

// Regex patterns for different Notion URL formats
const NOTION_URL_PATTERNS = [
  // Standard Notion URLs
  /https:\/\/www\.notion\.so\/[^\/\s]+\/[a-f0-9]{32}/gi,
  /https:\/\/www\.notion\.so\/[a-f0-9]{32}/gi,
  
  // Short Notion URLs
  /https:\/\/notion\.so\/[a-f0-9]{32}/gi,
  
  // URLs with dashes (UUID format)
  /https:\/\/www\.notion\.so\/[^\/\s]+\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
  /https:\/\/www\.notion\.so\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
  
  // Custom domain patterns
  /https:\/\/[^\/\s]+\.notion\.site\/[^\/\s]+\/[a-f0-9]{32}/gi,
  /https:\/\/[^\/\s]+\.notion\.site\/[a-f0-9]{32}/gi,
];

/**
 * Detect if text contains Notion URLs
 */
export function containsNotionUrl(text: string): boolean {
  return NOTION_URL_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Extract all Notion URLs from text
 */
export function extractNotionUrls(text: string): string[] {
  const urls: string[] = [];
  
  for (const pattern of NOTION_URL_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      urls.push(...matches);
    }
  }
  
  // Remove duplicates
  return [...new Set(urls)];
}

/**
 * Check if a URL is a valid Notion URL
 */
export function isNotionUrl(url: string): boolean {
  try {
    const service = getNotionService();
    return service.isNotionUrl(url);
  } catch {
    return NOTION_URL_PATTERNS.some(pattern => pattern.test(url));
  }
}

/**
 * Extract page ID from Notion URL
 */
export function extractNotionPageId(url: string): string | null {
  try {
    const service = getNotionService();
    return service.extractPageId(url);
  } catch {
    return null;
  }
}

/**
 * Replace Notion URLs in text with placeholders for rendering
 */
export function replaceNotionUrlsWithPlaceholders(text: string): {
  processedText: string;
  notionUrls: Array<{ url: string; placeholder: string; index: number }>;
} {
  const notionUrls = extractNotionUrls(text);
  let processedText = text;
  const urlData: Array<{ url: string; placeholder: string; index: number }> = [];
  
  notionUrls.forEach((url, index) => {
    const placeholder = `__NOTION_EMBED_${index}__`;
    const urlIndex = processedText.indexOf(url);
    
    if (urlIndex !== -1) {
      urlData.push({ url, placeholder, index: urlIndex });
      processedText = processedText.replace(url, placeholder);
    }
  });
  
  return { processedText, notionUrls: urlData };
}

/**
 * Check if block content should be treated as a Notion embed
 * (when the entire block is just a Notion URL)
 */
export function isNotionOnlyBlock(content: string): boolean {
  const trimmed = content.trim();
  const notionUrls = extractNotionUrls(trimmed);
  
  // Check if the entire content is just one Notion URL
  if (notionUrls.length === 1) {
    const urlText = notionUrls[0];
    return trimmed === urlText || trimmed.replace(/\s+/g, '') === urlText.replace(/\s+/g, '');
  }
  
  return false;
}

/**
 * Parse content and identify inline Notion URLs vs dedicated Notion blocks
 */
export function parseNotionContent(content: string): {
  type: 'notion-only' | 'mixed' | 'regular';
  notionUrls: string[];
  cleanContent: string;
} {
  const notionUrls = extractNotionUrls(content);
  
  if (notionUrls.length === 0) {
    return {
      type: 'regular',
      notionUrls: [],
      cleanContent: content
    };
  }
  
  if (isNotionOnlyBlock(content)) {
    return {
      type: 'notion-only',
      notionUrls,
      cleanContent: content.trim()
    };
  }
  
  return {
    type: 'mixed',
    notionUrls,
    cleanContent: content
  };
}