import React, { ReactNode } from 'react';
import { extractNotionUrls } from '@/utils/notionDetection';

interface ContentWithNotionLinksProps {
  content: string;
  className?: string;
}

interface NotionLinkChipProps {
  url: string;
}

function NotionLinkChip({ url }: NotionLinkChipProps) {
  // Extract page title from URL if it has a slug
  const getPageTitle = () => {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Check if the last part has a slug before the ID
    const match = lastPart.match(/^(.+?)-([a-f0-9]{32})$/);
    if (match) {
      // Convert slug to readable title
      return match[1].split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Check for UUID format
    const uuidMatch = lastPart.match(/^(.+?)-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/);
    if (uuidMatch) {
      return uuidMatch[1].split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    return 'Notion Page';
  };

  const title = getPageTitle();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      contentEditable={false}
      className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm no-underline transition-colors"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, '_blank');
      }}
    >
      {/* Notion icon */}
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l2.196 1.606c-.471-.296-.698-.514-.698-.514s.373.42.926.88z" fill="currentColor"/>
        <path d="M5.765 20.242c.793 0 .979-.466.979-.466l8.896-14.243L5.765 6.982v13.26z" fill="currentColor" opacity="0.6"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M17.86 5.533c.028-.048.023-.094.005-.134a.181.181 0 00-.058-.077.203.203 0 00-.087-.035l-11.955.7c-.233.024-.326.224-.326.467v12.284c0 .376.13.607.28.793l1.913 1.729c.56.466.839.419 1.866.419l10.159-.7c.794-.047 1.12-.373 1.12-1.026V7.439c0-.187-.186-.653-.746-1.026l-2.17-.88z" fill="currentColor"/>
      </svg>
      <span>{title}</span>
      {/* External link icon */}
      <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

export function ContentWithNotionLinks({ content, className = '' }: ContentWithNotionLinksProps) {
  const notionUrls = extractNotionUrls(content);
  
  if (notionUrls.length === 0) {
    return <span className={className}>{content}</span>;
  }
  
  // Split content by Notion URLs and render them as chips
  let remaining = content;
  const parts: ReactNode[] = [];
  let key = 0;
  
  notionUrls.forEach(url => {
    const index = remaining.indexOf(url);
    if (index !== -1) {
      // Add text before the URL
      if (index > 0) {
        parts.push(remaining.substring(0, index));
      }
      // Add the Notion link chip
      parts.push(<NotionLinkChip key={`notion-${key++}`} url={url} />);
      // Update remaining text
      remaining = remaining.substring(index + url.length);
    }
  });
  
  // Add any remaining text
  if (remaining) {
    parts.push(remaining);
  }
  
  return <span className={className}>{parts}</span>;
}