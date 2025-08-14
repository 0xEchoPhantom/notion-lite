import React from 'react';

interface NotionEmbedProps {
  url: string;
  className?: string;
  onRemove?: () => void;
}

export function NotionEmbed({ url, className = '', onRemove }: NotionEmbedProps) {
  // Extract page title from URL if it has a slug
  const getPageInfo = () => {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Check if the last part has a slug before the ID
    const match = lastPart.match(/^(.+?)-([a-f0-9]{32})$/);
    if (match) {
      // Convert slug to readable title
      const title = match[1].split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      return { title, hasSlug: true };
    }
    
    // Check for UUID format
    const uuidMatch = lastPart.match(/^(.+?)-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/);
    if (uuidMatch) {
      const title = uuidMatch[1].split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      return { title, hasSlug: true };
    }
    
    // Fallback to "Notion Page"
    return { title: 'Notion Page', hasSlug: false };
  };

  const { title } = getPageInfo();
  
  // Extract workspace name if present
  const getWorkspace = () => {
    const match = url.match(/notion\.so\/([^\/]+)\//);
    return match ? match[1] : null;
  };
  
  const workspace = getWorkspace();

  return (
    <div className={`notion-page-link group relative inline-flex ${className}`}>
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer">
          {/* Notion icon */}
          <div className="flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l2.196 1.606c-.471-.296-.698-.514-.698-.514s.373.42.926.88z" fill="currentColor"/>
              <path d="M5.765 20.242c.793 0 .979-.466.979-.466l8.896-14.243L5.765 6.982v13.26z" fill="currentColor" opacity="0.6"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M17.86 5.533c.028-.048.023-.094.005-.134a.181.181 0 00-.058-.077.203.203 0 00-.087-.035l-11.955.7c-.233.024-.326.224-.326.467v12.284c0 .376.13.607.28.793l1.913 1.729c.56.466.839.419 1.866.419l10.159-.7c.794-.047 1.12-.373 1.12-1.026V7.439c0-.187-.186-.653-.746-1.026l-2.17-.88z" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Page title and info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {title}
            </div>
            {workspace && (
              <div className="text-xs text-gray-500 truncate">
                {workspace}
              </div>
            )}
          </div>
          
          {/* External link icon */}
          <div className="flex-shrink-0 text-gray-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      </a>
      
      {/* Delete button - shows on hover */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-2 -top-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          title="Remove Notion link"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}