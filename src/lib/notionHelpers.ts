// Client-side helper functions for Notion integration

export function extractPageId(url: string): string | null {
  // Remove query parameters first to clean the URL
  const cleanUrl = url.split('?')[0];
  
  const patterns = [
    // URLs with slugs - extract the 32 char hex at the end
    /([a-f0-9]{32})$/,
    // UUID with dashes
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      let id = match[1];
      // Remove dashes if present
      id = id.replace(/-/g, '');
      // Add dashes in UUID format
      return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;
    }
  }

  // Also check for page ID in query parameters (p parameter in database views)
  const urlParams = new URLSearchParams(url.split('?')[1] || '');
  const pParam = urlParams.get('p');
  if (pParam && /^[a-f0-9]{32}$/.test(pParam)) {
    return `${pParam.slice(0, 8)}-${pParam.slice(8, 12)}-${pParam.slice(12, 16)}-${pParam.slice(16, 20)}-${pParam.slice(20, 32)}`;
  }

  return null;
}

export function isNotionUrl(url: string): boolean {
  return /https:\/\/(www\.)?notion\.so\//.test(url);
}