'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { GlobalDragProvider } from '@/contexts/GlobalDragContext';
import { Editor } from '@/components/editor/Editor';
import { getPages, createPage, updatePageTitle, reorderPages, archivePage, archiveBlock } from '@/lib/firestore';
import { Page } from '@/types/index';
import { Archive } from '@/components/ui/Archive';
import { ArchiveViewer } from '@/components/ui/ArchiveViewer';
import { EditablePageButton } from '@/components/ui/EditablePageButton';
import { SettingsPanel } from '@/components/ui/SettingsPanel';
import { FixedPageIndicator } from '@/components/ui/FixedPageIndicator';
import { useSettings } from '@/contexts/SettingsContext';
import { useFixedPages } from '@/hooks/useFixedPages';

export default function AppPage() {
  console.log('📱 AppPage render start');
  
  const { user } = useAuth();
  const { isGTDMode, isFreeMode } = useSettings();
  
  console.log('📱 AppPage hooks loaded:', { hasUser: !!user, isGTDMode, isFreeMode });
  
  // Only initialize fixed pages in GTD mode
  const { fixedPages, isInitialized } = useFixedPages();
  
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draggedPage, setDraggedPage] = useState<Page | null>(null);
  const [isArchiveHovered, setIsArchiveHovered] = useState(false);
  const [isArchiveViewerOpen, setIsArchiveViewerOpen] = useState(false);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [showTasksView, setShowTasksView] = useState(false);
  const [dropTargetInfo, setDropTargetInfo] = useState<{
    pageId: string;
    position: 'above' | 'below';
  } | null>(null);

  // Clear state when user changes
  useEffect(() => {
    if (!user) {
      setPages([]);
      setCurrentPageId(null);
      setCurrentUserId(null);
      setLoading(false);
      return;
    }

    // If user changed, clear previous user's data
    if (user.uid !== currentUserId) {
      console.log('👤 User changed from', currentUserId, 'to', user.uid);
      setPages([]);
      setCurrentPageId(null);
      setCurrentUserId(user.uid);
    }
  }, [user, currentUserId]);

  useEffect(() => {
    if (!user || !user.uid) return;

    const loadPages = async () => {
      try {
        console.log('🔄 Loading pages for user:', user.uid);
        const userPages = await getPages(user.uid);
        console.log('📄 Pages loaded:', userPages);
        
        setPages(userPages);
        setCurrentPageId(userPages[0]?.id || null);
      } catch (error) {
        console.error('❌ Error loading pages:', error);
        setError(error instanceof Error ? error.message : 'Failed to load pages');
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    loadPages();
  }, [user]);

  const handlePageDragStart = (page: Page) => {
    setDraggedPage(page);
    setDraggedPageId(page.id);
  };

  const handlePageDragEnd = () => {
    setDraggedPage(null);
    setDraggedPageId(null);
    setDropTargetInfo(null);
    setIsArchiveHovered(false);
  };

  const handlePageDragOver = (e: React.DragEvent, targetPageId: string) => {
    if (!draggedPageId || draggedPageId === targetPageId) return;
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'above' : 'below';
    
    setDropTargetInfo({ pageId: targetPageId, position });
  };

  const handlePageDrop = async (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    if (!user || !draggedPageId || !dropTargetInfo) return;

    try {
      const draggedIndex = pages.findIndex(p => p.id === draggedPageId);
      const targetIndex = pages.findIndex(p => p.id === targetPageId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      // Create new order for pages
      const newPages = [...pages];
      const [draggedPage] = newPages.splice(draggedIndex, 1);
      
      const insertIndex = dropTargetInfo.position === 'above' ? targetIndex : targetIndex + 1;
      newPages.splice(insertIndex, 0, draggedPage);

      // Update order values
      const pageUpdates = newPages.map((page, index) => ({
        id: page.id,
        order: index + 1,
      }));

      // Update in Firestore
      await reorderPages(user.uid, pageUpdates);
      
      // Update local state
      const updatedPages = newPages.map((page, index) => ({
        ...page,
        order: index + 1,
      }));
      setPages(updatedPages);
      
    } catch (error) {
      console.error('Error reordering pages:', error);
      alert('Failed to reorder pages. Please try again.');
    } finally {
      setDropTargetInfo(null);
    }
  };

  const handleTitleUpdate = async (pageId: string, newTitle: string) => {
    if (!user) return;

    try {
      await updatePageTitle(user.uid, pageId, newTitle);
      
      // Update local state
      setPages(prevPages => 
        prevPages.map(page => 
          page.id === pageId 
            ? { ...page, title: newTitle, updatedAt: new Date() }
            : page
        )
      );
    } catch (error) {
      console.error('Error updating page title:', error);
      alert('Failed to update page title. Please try again.');
    }
  };

  const handleArchivePage = async () => {
    if (!user || !draggedPage) return;

    try {
      // Prevent archiving the last page
      if (pages.length <= 1) {
        alert('Cannot archive the last page. Create another page first.');
        return;
      }

      await archivePage(user.uid, draggedPage.id);
      
      // Update local state
      const updatedPages = pages.filter(p => p.id !== draggedPage.id);
      setPages(updatedPages);
      
      // If archived page was current, switch to another page
      if (currentPageId === draggedPage.id) {
        setCurrentPageId(updatedPages[0]?.id || null);
      }
      
      setDraggedPage(null);
    } catch (error) {
      console.error('Error archiving page:', error);
      alert('Failed to archive page. Please try again.');
    }
  };

  const handleArchiveBlock = async (blockId: string) => {
    if (!user || !currentPageId) return;

    try {
      await archiveBlock(user.uid, currentPageId, blockId);
      // The block will be removed from the UI automatically via the real-time subscription
    } catch (error) {
      console.error('Error archiving block:', error);
      alert('Failed to archive block. Please try again.');
    }
  };

  const handleArchiveDragOver = () => {
    if (draggedPage) {
      setIsArchiveHovered(true);
    }
  };

  const handleArchiveDragLeave = () => {
    setIsArchiveHovered(false);
  };

  console.log('📱 AppPage state check:', { loading, error, hasUser: !!user });

  if (loading) {
    console.log('⏳ AppPage: showing loading state');
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading your pages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ AppPage: showing error state', error);
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-lg font-medium text-red-600 mb-2">Error Loading Pages</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Make sure Firestore is enabled in your Firebase project
          </p>
        </div>
      </div>
    );
  }

  if (!currentPageId || pages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-8">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Notion Lite!</h2>
            <p className="text-gray-600">
              Start by creating your first page. You can write notes, organize thoughts, and create content just like in Notion.
            </p>
          </div>
          
          <button
            onClick={async () => {
              if (user) {
                const pageId = await createPage(user.uid, 'My First Page');
                const updatedPages = await getPages(user.uid);
                setPages(updatedPages);
                setCurrentPageId(pageId);
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Create Your First Page
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            You can always create more pages later using the &quot;+ New page&quot; button
          </p>
        </div>
      </div>
    );
  }

  const currentPage = pages.find(p => p.id === currentPageId);

  return (
    <GlobalDragProvider currentPageId={currentPageId || ''}>
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <h2 className="text-sm font-medium text-gray-900 mb-4">Pages</h2>
            <div className="space-y-1">
              {pages.map((page) => (
                <EditablePageButton
                  key={page.id}
                  page={page}
                  isActive={page.id === currentPageId}
                  onClick={() => setCurrentPageId(page.id)}
                  onTitleUpdate={handleTitleUpdate}
                  onDragStart={handlePageDragStart}
                  onDragEnd={handlePageDragEnd}
                  onDragOver={handlePageDragOver}
                  onDrop={handlePageDrop}
                  draggedPageId={draggedPageId}
                  insertPosition={
                    dropTargetInfo?.pageId === page.id ? dropTargetInfo.position : null
                  }
                />
              ))}
            </div>

            {/* Tasks View Button - Only in GTD mode */}
            {isGTDMode && (
              <button
                onClick={() => setShowTasksView(!showTasksView)}
                className={`w-full mt-2 px-2 py-1 text-left text-sm rounded flex items-center space-x-2 ${
                  showTasksView 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>📊</span>
                <span>Task Overview</span>
              </button>
            )}
          
            {/* New Page Button - Only in Free mode */}
            {isFreeMode && (
              <button
                onClick={async () => {
                  if (user) {
                    const pageId = await createPage(user.uid, 'Untitled');
                    const updatedPages = await getPages(user.uid);
                    setPages(updatedPages);
                    setCurrentPageId(pageId);
                  }
                }}
                className="w-full mt-4 px-2 py-1 text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                + New page
              </button>
            )}
            
            {/* GTD Mode Info */}
            {isGTDMode && (
              <div className="mt-4 px-2 py-1 text-xs text-gray-400 italic">
                GTD Mode: Fixed workflow pages
              </div>
            )}

            {/* Archive */}
            <div
              onDragOver={handleArchiveDragOver}
              onDragLeave={handleArchiveDragLeave}
            >
              <Archive
                onDeletePage={handleArchivePage}
                onDeleteBlock={handleArchiveBlock}
                onViewArchive={() => setIsArchiveViewerOpen(true)}
                isDraggedOver={isArchiveHovered && !!draggedPage}
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="p-6">
            {showTasksView ? (
              /* Task Overview */
              <div>
                <div className="mb-6">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Task Overview</h1>
                  <p className="text-gray-600">Analytics and insights across all your tasks</p>
                </div>
                
                {/* Placeholder for DecisionViews - will integrate with real task data */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4">Task Analytics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">0</div>
                      <div className="text-sm text-blue-800">Total Tasks</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">0</div>
                      <div className="text-sm text-green-800">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">N/A</div>
                      <div className="text-sm text-orange-800">Avg ROI</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 text-center text-gray-500">
                    <p>Task integration coming soon...</p>
                    <p className="text-sm mt-2">Create todo-list blocks in your pages to see task analytics here</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Regular Page Content */
              <>
                {/* Page title */}
                <div className="mb-6 flex items-center">
                  <input
                    type="text"
                    value={currentPage?.title || ''}
                    onChange={(e) => {
                      // Update page title - this would need implementation
                      const updatedPages = pages.map(p => 
                        p.id === currentPageId 
                          ? { ...p, title: e.target.value }
                          : p
                      );
                      setPages(updatedPages);
                    }}
                    className="text-4xl font-bold text-gray-900 bg-transparent border-none outline-none flex-1 placeholder-gray-400"
                    placeholder="Untitled"
                  />
                  <FixedPageIndicator pageTitle={currentPage?.title || ''} />
                </div>

                {/* Editor */}
                <BlocksProvider pageId={currentPageId}>
                  <Editor pageId={currentPageId} />
                </BlocksProvider>
              </>
            )}
          </div>
        </div>

        {/* Archive Viewer Modal */}
        <ArchiveViewer
          isOpen={isArchiveViewerOpen}
          onClose={() => setIsArchiveViewerOpen(false)}
          userId={user?.uid || ''}
          currentPageId={currentPageId || undefined}
        />

        {/* Settings Panel */}
        <SettingsPanel />
      </div>
    </GlobalDragProvider>
  );
}
