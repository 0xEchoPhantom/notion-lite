'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { Editor } from '@/components/editor/Editor';
import { getPages, createPage } from '@/lib/firestore';
import { Page } from '@/types';

export default function AppPage() {
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadPages = async () => {
      try {
        console.log('🔄 Loading pages for user:', user.uid);
        let userPages = await getPages(user.uid);
        console.log('📄 Pages loaded:', userPages);
        
        // If no pages exist, create the initial "Quick Capture" page
        if (userPages.length === 0) {
          console.log('🆕 Creating initial page...');
          await createPage(user.uid, 'Quick Capture');
          userPages = await getPages(user.uid);
          console.log('📄 Pages after creation:', userPages);
        }
        
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

  if (!currentPageId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">No pages found</h2>
          <p className="text-gray-500">Something went wrong loading your pages.</p>
        </div>
      </div>
    );
  }

  const currentPage = pages.find(p => p.id === currentPageId);

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
        <div className="p-4">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Pages</h2>
          <div className="space-y-1">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setCurrentPageId(page.id)}
                className={`w-full text-left px-2 py-1 rounded text-sm ${
                  page.id === currentPageId
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page.title}
              </button>
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
  );
}
