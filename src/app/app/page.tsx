'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { GlobalDragProvider } from '@/contexts/GlobalDragContext';
import { Editor } from '@/components/editor/Editor';
import { getPages, createPage, deletePage, updatePageTitle, reorderPages } from '@/lib/firestore';
import { Page } from '@/types/index';
import { RecycleBin } from '@/components/ui/RecycleBin';
import { EditablePageButton } from '@/components/ui/EditablePageButton';

export default function AppPage() {
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draggedPage, setDraggedPage] = useState<Page | null>(null);
  const [isRecycleBinHovered, setIsRecycleBinHovered] = useState(false);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
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
    setIsRecycleBinHovered(false);
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

  const handleDeletePage = async () => {
    if (!user || !draggedPage) return;

    try {
      // Prevent deleting the last page
      if (pages.length <= 1) {
        alert('Cannot delete the last page. Create another page first.');
        return;
      }

      await deletePage(user.uid, draggedPage.id);
      
      // Update local state
      const updatedPages = pages.filter(p => p.id !== draggedPage.id);
      setPages(updatedPages);
      
      // If deleted page was current, switch to another page
      if (currentPageId === draggedPage.id) {
        setCurrentPageId(updatedPages[0]?.id || null);
      }
      
      setDraggedPage(null);
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page. Please try again.');
    }
  };

  const handleRecycleBinDragOver = () => {
    if (draggedPage) {
      setIsRecycleBinHovered(true);
    }
  };

  const handleRecycleBinDragLeave = () => {
    setIsRecycleBinHovered(false);
  };

  if (loading) {
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

            {/* Recycle Bin */}
            <div
              onDragOver={handleRecycleBinDragOver}
              onDragLeave={handleRecycleBinDragLeave}
            >
              <RecycleBin
                onDelete={handleDeletePage}
                isDraggedOver={isRecycleBinHovered && !!draggedPage}
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="p-6">
            {/* Page title */}
            <div className="mb-6">
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
                className="text-4xl font-bold text-gray-900 bg-transparent border-none outline-none w-full placeholder-gray-400"
                placeholder="Untitled"
              />
            </div>

            {/* Editor */}
            <BlocksProvider pageId={currentPageId}>
              <Editor pageId={currentPageId} />
            </BlocksProvider>
          </div>
        </div>
      </div>
    </GlobalDragProvider>
  );
}
