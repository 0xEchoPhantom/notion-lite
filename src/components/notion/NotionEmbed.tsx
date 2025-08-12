'use client';

import React, { useState, useEffect } from 'react';
import { getNotionService, NotionPageContent } from '@/lib/notion';

interface NotionEmbedProps {
  url: string;
  className?: string;
}

export function NotionEmbed({ url, className = '' }: NotionEmbedProps) {
  const [content, setContent] = useState<NotionPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchNotionContent = async () => {
      setLoading(true);
      setError(null);

      try {
        const service = getNotionService();
        const pageId = service.extractPageId(url);
        
        if (!pageId) {
          throw new Error('Invalid Notion URL');
        }

        const pageContent = await service.getPage(pageId);
        
        if (!pageContent) {
          throw new Error('Failed to fetch page content');
        }

        setContent(pageContent);
      } catch (err) {
        console.error('Failed to fetch Notion content:', err);
        
        const error = err as Error;
        if (error.message?.includes('API key')) {
          setError('Notion API not configured. Go to Settings → Notion Integration to set up.');
        } else if (error.message?.includes('permission')) {
          setError('Page not accessible. Make sure the page is shared with your integration.');
        } else {
          setError(error.message || 'Failed to load Notion content');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNotionContent();
  }, [url]);

  if (loading) {
    return (
      <div className={`notion-embed loading ${className}`}>
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <div className="flex-1">
            <div className="text-sm text-gray-600">Loading Notion page...</div>
            <div className="text-xs text-gray-400">{url}</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`notion-embed error ${className}`}>
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="w-5 h-5 text-red-500 mt-0.5">⚠️</div>
          <div className="flex-1">
            <div className="text-sm text-red-700 font-medium">Failed to load Notion page</div>
            <div className="text-xs text-red-600 mt-1">{error}</div>
            <div className="text-xs text-gray-500 mt-2">{url}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className={`notion-embed ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {content.icon && (
              <div className="text-lg flex-shrink-0">
                {content.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {content.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>notion.so</span>
                <span>•</span>
                <span>Last edited {content.lastEdited.toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cover Image */}
        {content.cover && (
          <div className="aspect-video bg-gray-100">
            <img 
              src={content.cover} 
              alt="Page cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content Preview */}
        {expanded && (
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {content.blocks.slice(0, 10).map((block, index) => (
              <NotionBlock key={block.id || index} block={block} />
            ))}
            
            {content.blocks.length > 10 && (
              <div className="text-center py-2">
                <span className="text-sm text-gray-500">
                  ... and {content.blocks.length - 10} more blocks
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-4 h-4">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.459 4.208c0-.212.139-.32.283-.32h4.546a.42.42 0 01.361.212l1.212 2.121a.42.42 0 00.364.212h8.546c.143 0 .283.108.283.32v11.213c0 .212-.139.32-.283.32H4.742c-.144 0-.283-.108-.283-.32V4.208z"/>
                </svg>
              </div>
              <span>Private Notion page</span>
            </div>
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Open in Notion →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component to render individual Notion blocks
function NotionBlock({ block }: { block: { type: string; content: string; children?: any[] } }) {
  const renderContent = () => {
    switch (block.type) {
      case 'heading_1':
        return <h1 className="text-xl font-bold text-gray-900">{block.content}</h1>;
      case 'heading_2':
        return <h2 className="text-lg font-semibold text-gray-900">{block.content}</h2>;
      case 'heading_3':
        return <h3 className="text-base font-medium text-gray-900">{block.content}</h3>;
      case 'paragraph':
        return block.content ? <p className="text-gray-700">{block.content}</p> : null;
      case 'bulleted_list_item':
        return (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 mt-1">•</span>
            <span className="text-gray-700">{block.content}</span>
          </div>
        );
      case 'numbered_list_item':
        return (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 mt-1">1.</span>
            <span className="text-gray-700">{block.content}</span>
          </div>
        );
      case 'to_do':
        return (
          <div className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" disabled />
            <span className="text-gray-700">{block.content}</span>
          </div>
        );
      case 'quote':
        return (
          <blockquote className="border-l-4 border-gray-200 pl-4 italic text-gray-600">
            {block.content}
          </blockquote>
        );
      case 'code':
        return (
          <pre className="bg-gray-100 p-3 rounded text-sm font-mono text-gray-800 overflow-x-auto">
            <code>{block.content}</code>
          </pre>
        );
      case 'divider':
        return <hr className="border-gray-200" />;
      case 'image':
        return block.content ? (
          <img 
            src={block.content} 
            alt="Notion image" 
            className="max-w-full h-auto rounded"
          />
        ) : null;
      default:
        return block.content ? <p className="text-gray-600 text-sm">{block.content}</p> : null;
    }
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <div className="notion-block">
      {content}
      {block.children && block.children.length > 0 && (
        <div className="ml-4 mt-2 space-y-2">
          {block.children.map((child, index: number) => (
            <NotionBlock key={child.id || index} block={child} />
          ))}
        </div>
      )}
    </div>
  );
}