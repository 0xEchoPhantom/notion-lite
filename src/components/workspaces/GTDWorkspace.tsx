'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { GlobalDragProvider } from '@/contexts/GlobalDragContext';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { Editor } from '@/components/editor/Editor';
import { GTD_PAGES } from '@/types/workspace';
import { getWorkspacePages, initializeUserWorkspaces } from '@/lib/workspaceOperations';
import { Page } from '@/types/index';

export function GTDWorkspace() {
  const { user } = useAuth();
  const { gtdWorkspace } = useWorkspace();
  const [gtdPages, setGtdPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load GTD pages from Firestore
  useEffect(() => {
    if (!user || !gtdWorkspace) return;

    const loadGTDPages = async () => {
      try {
        setLoading(true);
        console.log('Loading GTD pages for workspace:', gtdWorkspace.id);
        const pages = await getWorkspacePages(user.uid, gtdWorkspace.id);
        setGtdPages(pages as Page[]);
        
        // Auto-select first page
        if (pages.length > 0 && !currentPageId) {
          setCurrentPageId(pages[0].id);
        }
        
        console.log('Loaded GTD pages:', pages.length, pages);
      } catch (error) {
        console.error('Error loading GTD pages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGTDPages();
  }, [user, gtdWorkspace, currentPageId]);

  const handlePageClick = (pageId: string) => {
    setCurrentPageId(pageId);
  };

  const handleCreateGTDPages = async () => {
    if (!user) return;
    
    try {
      console.log('Creating GTD pages...');
      await initializeUserWorkspaces(user.uid);
      // Reload pages
      if (gtdWorkspace) {
        const pages = await getWorkspacePages(user.uid, gtdWorkspace.id);
        setGtdPages(pages as Page[]);
        if (pages.length > 0) {
          setCurrentPageId(pages[0].id);
        }
      }
    } catch (error) {
      console.error('Error creating GTD pages:', error);
    }
  };

  const currentPage = gtdPages.find(page => page.id === currentPageId);

  if (!user || !gtdWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading GTD workspace...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1">
        <div className="w-64 bg-white border-r border-gray-200 h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading pages...</p>
          </div>
        </div>
        <div className="flex-1 bg-gray-50"></div>
      </div>
    );
  }

  // If no currentPageId is selected, don't render GlobalDragProvider yet
  if (!currentPageId) {
    return (
      <div className="flex flex-1">
        {/* GTD Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 GTD Workflow</h2>
            
            {/* GTD Pages from Firestore */}
            <div className="space-y-1">
              {gtdPages.length > 0 ? (
                gtdPages.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => handlePageClick(page.id)}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer group transition-colors hover:bg-gray-50"
                  >
                    <span className="text-lg">
                      {page.title.includes('📬') ? '📬' :
                       page.title.includes('🎯') ? '🎯' :
                       page.title.includes('⏳') ? '⏳' :
                       page.title.includes('📅') ? '📅' : '📄'}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {page.title}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-blue-600 font-medium">Fixed</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4">
                  <div className="text-sm text-gray-500 mb-3">
                    No GTD pages found
                  </div>
                  <button
                    onClick={handleCreateGTDPages}
                    className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Create GTD Pages
                  </button>
                </div>
              )}
            </div>

            {/* Tagged Notes Section */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-500 mb-3">📎 Tagged Notes</h3>
              <div className="text-sm text-gray-400">
                Notes from your workspace will appear here when tagged
              </div>
            </div>
          </div>
        </div>

        {/* GTD Main Content */}
        <div className="flex-1 bg-gray-50">
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">GTD Workflow</h1>
              <p className="text-gray-600 mb-6">
                Select a page from the sidebar to start organizing your tasks
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GlobalDragProvider currentPageId={currentPageId}>
      <div className="flex flex-1">
      {/* GTD Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 GTD Workflow</h2>
          
          {/* GTD Pages from Firestore */}
          <div className="space-y-1">
            {gtdPages.length > 0 ? (
              gtdPages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => handlePageClick(page.id)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer group transition-colors ${
                    currentPageId === page.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">
                    {page.title.includes('📥') ? '📥' :
                     page.title.includes('⚡') ? '⚡' :
                     page.title.includes('🎯') ? '🎯' :
                     page.title.includes('👥') ? '👥' : '📄'}
                  </span>
                  <div className="flex-1">
                    <div className={`font-medium ${currentPageId === page.id ? 'text-blue-900' : 'text-gray-900'}`}>
                      {page.title}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-blue-600 font-medium">Fixed</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-4">
                <div className="text-sm text-gray-500 mb-3">
                  No GTD pages found
                </div>
                <button
                  onClick={handleCreateGTDPages}
                  className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Create GTD Pages
                </button>
              </div>
            )}
          </div>

          {/* Tagged Notes Section */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 mb-3">📎 Tagged Notes</h3>
            <div className="text-sm text-gray-400">
              Notes from your workspace will appear here when tagged
            </div>
          </div>
        </div>
      </div>

      {/* GTD Main Content */}
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
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">GTD Workflow</h1>
              <p className="text-gray-600 mb-6">
                Select a workflow step from the sidebar to start organizing your tasks and ideas.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Getting Started</h3>
                <ul className="text-sm text-blue-800 space-y-1 text-left">
                  <li>📥 <strong>Capture:</strong> Quick thoughts and ideas</li>
                  <li>⚡ <strong>2 min:</strong> Tasks that take 2 minutes or less</li>
                  <li>🎯 <strong>Next Step:</strong> Next actions to take</li>
                  <li>👥 <strong>Delegate:</strong> Tasks waiting on others</li>
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