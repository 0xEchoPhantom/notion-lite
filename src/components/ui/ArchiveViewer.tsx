'use client';

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { ArchivedPage, ArchivedBlock } from '@/types/index';
import { 
  getArchivedPages, 
  getArchivedBlocks, 
  restoreArchivedPage, 
  restoreArchivedBlock,
  permanentlyDeleteArchivedPage,
  permanentlyDeleteArchivedBlock,
  flushAllArchived
} from '@/lib/firestore';

interface ArchiveViewerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentPageId?: string;
}

export const ArchiveViewer: React.FC<ArchiveViewerProps> = ({
  isOpen,
  onClose,
  userId,
  currentPageId
}) => {
  const [archivedPages, setArchivedPages] = useState<ArchivedPage[]>([]);
  const [archivedBlocks, setArchivedBlocks] = useState<ArchivedBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pages' | 'blocks'>('pages');

  useEffect(() => {
    if (isOpen && userId) {
      loadArchivedItems();
    }
  }, [isOpen, userId]);

  const loadArchivedItems = async () => {
    setLoading(true);
    try {
      const [pages, blocks] = await Promise.all([
        getArchivedPages(userId),
        getArchivedBlocks(userId)
      ]);
      setArchivedPages(pages);
      setArchivedBlocks(blocks);
    } catch (error) {
      console.error('Error loading archived items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePage = async (archivedPageId: string) => {
    try {
      await restoreArchivedPage(userId, archivedPageId);
      await loadArchivedItems(); // Refresh the list
    } catch (error) {
      console.error('Error restoring page:', error);
      alert('Failed to restore page. Please try again.');
    }
  };

  const handleRestoreBlock = async (archivedBlockId: string) => {
    if (!currentPageId) {
      alert('Please select a page to restore the block to.');
      return;
    }

    try {
      await restoreArchivedBlock(userId, archivedBlockId, currentPageId);
      await loadArchivedItems(); // Refresh the list
    } catch (error) {
      console.error('Error restoring block:', error);
      alert('Failed to restore block. Please try again.');
    }
  };

  const handlePermanentlyDeletePage = async (archivedPageId: string, title: string) => {
                        const confirmed = window.confirm(
                          `Permanently delete &quot;${title}&quot;? This action cannot be undone.`
                        );    if (confirmed) {
      try {
        await permanentlyDeleteArchivedPage(userId, archivedPageId);
        await loadArchivedItems(); // Refresh the list
      } catch (error) {
        console.error('Error permanently deleting page:', error);
        alert('Failed to delete page. Please try again.');
      }
    }
  };

  const handlePermanentlyDeleteBlock = async (archivedBlockId: string) => {
    const confirmed = window.confirm(
      `Permanently delete this block? This action cannot be undone.`
    );
    
    if (confirmed) {
      try {
        await permanentlyDeleteArchivedBlock(userId, archivedBlockId);
        await loadArchivedItems(); // Refresh the list
      } catch (error) {
        console.error('Error permanently deleting block:', error);
        alert('Failed to delete block. Please try again.');
      }
    }
  };

  const handleFlushAll = async () => {
    const confirmed = window.confirm(
      'Permanently delete ALL archived items? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await flushAllArchived(userId);
        await loadArchivedItems(); // Refresh the list
      } catch (error) {
        console.error('Error flushing archive:', error);
        alert('Failed to flush archive. Please try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <h2 className="text-xl font-semibold">Archive</h2>
          </div>
          <div className="flex items-center gap-2">
            {(archivedPages.length > 0 || archivedBlocks.length > 0) && (
              <button
                onClick={handleFlushAll}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              >
                Flush All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('pages')}
            className={clsx(
              'px-6 py-3 font-medium transition-colors',
              activeTab === 'pages'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            )}
          >
            Pages ({archivedPages.length})
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={clsx(
              'px-6 py-3 font-medium transition-colors',
              activeTab === 'blocks'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            )}
          >
            Blocks ({archivedBlocks.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading archived items...</div>
            </div>
          ) : (
            <>
              {activeTab === 'pages' && (
                <div className="space-y-3">
                  {archivedPages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No archived pages
                    </div>
                  ) : (
                    archivedPages.map((page) => (
                      <div
                        key={page.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{page.title}</h3>
                          <p className="text-sm text-gray-500">
                            Archived on {page.archivedAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestorePage(page.id)}
                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentlyDeletePage(page.id, page.title)}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'blocks' && (
                <div className="space-y-3">
                  {archivedBlocks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No archived blocks
                    </div>
                  ) : (
                    archivedBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {block.type}
                            </span>
                            <span className="text-sm text-gray-500">
                              from &quot;{block.pageTitle}&quot;
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">
                            {block.content || '(Empty block)'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Archived on {block.archivedAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentPageId && (
                            <button
                              onClick={() => handleRestoreBlock(block.id)}
                              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            >
                              Restore
                            </button>
                          )}
                          <button
                            onClick={() => handlePermanentlyDeleteBlock(block.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {archivedBlocks.length > 0 && !currentPageId && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      Select a page to restore blocks to
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
