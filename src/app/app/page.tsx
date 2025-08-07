'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { GlobalDragProvider, useGlobalDrag } from '@/contexts/GlobalDragContext';
import { Editor } from '@/components/editor/Editor';
import { getPages, createPage, deletePage } from '@/lib/firestore';
import { Page } from '@/types/index';
import { RecycleBin } from '@/components/ui/RecycleBin';

interface PageButtonProps {
  page: Page;
  isActive: boolean;
  onClick: () => void;
  onDragStart?: (page: Page) => void;
  onDragEnd?: () => void;
}

const PageButton: React.FC<PageButtonProps> = ({ page, isActive, onClick, onDragStart, onDragEnd }) => {
  const { moveBlockToNewPage, isDragging } = useGlobalDrag();
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingPage, setIsDraggingPage] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (isDragging) {
      e.preventDefault();
      setIsHovered(true);
    }
  };

  const handleDragLeave = () => {
    setIsHovered(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    
    const blockData = e.dataTransfer.getData('application/json');
    if (blockData) {
      try {
        await moveBlockToNewPage(page.id, 0);
      } catch (error) {
        console.error('Error moving block:', error);
      }
    }
  };

  const handlePageDragStart = (e: React.DragEvent) => {
    setIsDraggingPage(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-page', JSON.stringify(page));
    if (onDragStart) {
      onDragStart(page);
    }
  };

  const handlePageDragEnd = () => {
    setIsDraggingPage(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-900'
            : isHovered && isDragging
            ? 'bg-green-100 text-green-900 border-2 border-green-300'
            : isDraggingPage
            ? 'opacity-50'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="flex-1">{page.title}</span>
          <div
            draggable
            onDragStart={handlePageDragStart}
            onDragEnd={handlePageDragEnd}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing"
            title="Drag to move or delete page"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 8 8">
              <circle cx="2" cy="2" r="1" />
              <circle cx="6" cy="2" r="1" />
              <circle cx="2" cy="6" r="1" />
              <circle cx="6" cy="6" r="1" />
            </svg>
          </div>
        </div>
        {isHovered && isDragging && (
          <span className="ml-2 text-xs text-green-600">(Drop block here)</span>
        )}
      </button>
    </div>
  );
};

export default function AppPage() {
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draggedPage, setDraggedPage] = useState<Page | null>(null);
  const [isRecycleBinHovered, setIsRecycleBinHovered] = useState(false);

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

  const handlePageDragEnd = () => {
    setDraggedPage(null);
    setIsRecycleBinHovered(false);
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
                <PageButton
                  key={page.id}
                  page={page}
                  isActive={page.id === currentPageId}
                  onClick={() => setCurrentPageId(page.id)}
                  onDragStart={handlePageDragStart}
                  onDragEnd={handlePageDragEnd}
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
