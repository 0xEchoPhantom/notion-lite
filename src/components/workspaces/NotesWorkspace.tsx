'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { GlobalDragProvider } from '@/contexts/GlobalDragContext';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { BlockDragProvider } from '@/contexts/BlockDragContext';
import { Editor } from '@/components/editor/Editor';
import { getWorkspacePages, createWorkspacePage } from '@/lib/workspaceOperations';
import { updatePageTitle } from '@/lib/firestore';
import { Page } from '@/types/index';
import { UnifiedNoteSidebar } from '@/components/ui/UnifiedNoteSidebar';

export function NotesWorkspace() {
  const { user } = useAuth();
  const { notesWorkspace } = useWorkspace();
  const [notesPages, setNotesPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Load Notes pages from Firestore
  useEffect(() => {
    if (!user || !notesWorkspace) return;

    const loadNotesPages = async () => {
      try {
        setLoading(true);
        const pages = await getWorkspacePages(user.uid, notesWorkspace.id);
        setNotesPages(pages as Page[]);
        
        // Auto-select first page if no current selection
        if (pages.length > 0 && !currentPageId) {
          setCurrentPageId(pages[0].id);
        }
        
        console.log('Loaded Notes pages:', pages.length);
      } catch (error) {
        console.error('Error loading Notes pages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotesPages();
  }, [user, notesWorkspace, currentPageId]);

  const handlePageClick = (pageId: string) => {
    setCurrentPageId(pageId);
  };

  const handleTitleUpdate = async (pageId: string, newTitle: string) => {
    if (!user) return;
    
    try {
      await updatePageTitle(user.uid, pageId, newTitle);
      // Update local state
      setNotesPages(prev => prev.map(page => 
        page.id === pageId ? { ...page, title: newTitle } : page
      ));
    } catch (error) {
      console.error('Error updating page title:', error);
    }
  };

  const handleCreateNewPage = async () => {
    if (!user || !notesWorkspace || creating) return;
    
    try {
      setCreating(true);
      // Create page in Notes workspace
      const newPageId = await createWorkspacePage(user.uid, notesWorkspace.id, 'Untitled');
      setCurrentPageId(newPageId);
      
      // Reload pages to include the new one
      const pages = await getWorkspacePages(user.uid, notesWorkspace.id);
      setNotesPages(pages as Page[]);
      
      console.log('Created new page:', newPageId);
    } catch (error) {
      console.error('Error creating page:', error);
    } finally {
      setCreating(false);
    }
  };

  const currentPage = notesPages.find(page => page.id === currentPageId);

  if (!user || !notesWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Notes workspace...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full">
        <div className="w-72 bg-[#FBFBFA] border-r border-gray-200/80 h-screen flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-10 w-48 bg-gray-200 rounded"></div>
              <div className="h-10 w-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Notes workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GlobalDragProvider currentPageId={currentPageId || ''}>
      <div className="flex h-screen w-full">
        {/* Unified Sidebar */}
        <UnifiedNoteSidebar
          notesPages={notesPages}
          currentPageId={currentPageId}
          onPageSelect={handlePageClick}
          onCreateNewPage={handleCreateNewPage}
          onTitleUpdate={handleTitleUpdate}
          creating={creating}
        />

        {/* Notes Main Content */}
        <div className="flex-1 bg-white overflow-y-auto">
        {currentPageId && currentPage ? (
          <div className="h-full">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <h1 className="text-xl font-semibold text-gray-900">{currentPage.title}</h1>
            </div>
            
            {/* Editor */}
            <div className="p-6">
              <BlocksProvider pageId={currentPageId}>
                <BlockDragProvider>
                  <Editor pageId={currentPageId} />
                </BlockDragProvider>
              </BlocksProvider>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">📝</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Notes</h1>
              <p className="text-gray-600 mb-6">
                Create unlimited pages and organize your thoughts freely.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">Getting Started</h3>
                <ul className="text-sm text-green-800 space-y-1 text-left">
                  <li>📄 <strong>Create Pages:</strong> Unlimited page creation</li>
                  <li>✏️ <strong>Rich Editing:</strong> Full Notion-like experience</li>
                  <li>🔍 <strong>Search & Organize:</strong> Find what you need fast</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </GlobalDragProvider>
  );
}
