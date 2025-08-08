'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { GlobalDragProvider } from '@/contexts/GlobalDragContext';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { Editor } from '@/components/editor/Editor';
import { EditablePageButton } from '@/components/ui/EditablePageButton';
import { getWorkspacePages, createWorkspacePage } from '@/lib/workspaceOperations';
import { updatePageTitle } from '@/lib/firestore';
import { Page } from '@/types/index';

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
      <div className="flex flex-1">
        <div className="w-64 bg-white border-r border-gray-200 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading pages...</p>
          </div>
        </div>
        <div className="flex-1 bg-gray-50"></div>
      </div>
    );
  }

  return (
    <GlobalDragProvider currentPageId={currentPageId || ''}>
      <div className="flex flex-1">
      {/* Notes Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📝 Notes & Ideas</h2>
          </div>
          
          {/* New Page Button */}
          <button 
            onClick={handleCreateNewPage}
            disabled={creating}
            className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-4 disabled:opacity-50"
          >
            <span>{creating ? '⏳' : '+'}</span>
            <span>{creating ? 'Creating...' : 'New Page'}</span>
          </button>

          {/* Notes Pages List */}
          <div className="space-y-1">
            {notesPages.length > 0 ? (
              notesPages.map((page) => (
                <div
                  key={page.id}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors group ${
                    currentPageId === page.id ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <EditablePageButton 
                    page={page}
                    isActive={currentPageId === page.id}
                    onClick={() => handlePageClick(page.id)}
                    onTitleUpdate={handleTitleUpdate}
                  />
                  {/* GTD Tag Button - TODO: Implement */}
                  <button 
                    className="opacity-0 group-hover:opacity-100 text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded"
                    title="Tag to GTD"
                  >
                    🏷️
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 p-2">
                No pages yet. Create your first note!
              </div>
            )}
          </div>

          {/* GTD Tagging Section */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 mb-3">🏷️ GTD Tags</h3>
            <div className="text-sm text-gray-400">
              Tag your notes to GTD workflow steps for better organization
            </div>
          </div>
        </div>
      </div>

      {/* Notes Main Content */}
      <div className="flex-1 bg-gray-50">
        {currentPageId && currentPage ? (
          <div className="h-full">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <h1 className="text-xl font-semibold text-gray-900">{currentPage.title}</h1>
            </div>
            
            {/* Editor */}
            <div className="p-6">
              <BlocksProvider pageId={currentPageId}>
                <Editor pageId={currentPageId} />
              </BlocksProvider>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">📝</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Notes & Ideas</h1>
              <p className="text-gray-600 mb-6">
                Create unlimited pages and organize your thoughts freely. Tag important notes to your GTD workflow.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">Getting Started</h3>
                <ul className="text-sm text-green-800 space-y-1 text-left">
                  <li>📄 <strong>Create Pages:</strong> Unlimited page creation</li>
                  <li>✏️ <strong>Rich Editing:</strong> Full Notion-like experience</li>
                  <li>🏷️ <strong>Tag to GTD:</strong> Connect notes to workflow</li>
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
