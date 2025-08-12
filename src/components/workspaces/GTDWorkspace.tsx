'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Page } from '@/types/index';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { GlobalDragProvider } from '@/contexts/GlobalDragContext';
import { BlockDragProvider } from '@/contexts/BlockDragContext';
import { Editor } from '@/components/editor/Editor';
import { GTD_PAGES } from '@/types/workspace';
import { useAuth } from '@/contexts/AuthContext';
import { SmartView } from '@/components/tasks/SmartView';
// TaskMirrorService removed - using taskMetadata in blocks instead
import { getBlocks } from '@/lib/firestore';
import { getWorkspacePages } from '@/lib/workspaceOperations';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { UnifiedSidebar } from '@/components/ui/UnifiedSidebar';
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';
import { useMobileNav } from '@/hooks/useMobileNav';
import { Menu } from 'lucide-react';

// Extended Page interface for GTD pages with emoji and description
interface GTDPage extends Page {
  emoji?: string;
  description?: string;
}

export function GTDWorkspace() {
  const { user } = useAuth();
  const { notesWorkspace } = useWorkspace();
  const { isMobile, isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useMobileNav();
  const [gtdPages, setGtdPages] = useState<GTDPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'editor' | 'smart'>('editor');
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [taggedNotes, setTaggedNotes] = useState<Array<{ id: string; title: string; count: number }>>([]);

  // TaskMirrorService removed - taskMetadata is now stored directly in blocks

  // Listen to GTD pages from Firestore
  useEffect(() => {
    if (!user) {
      setGtdPages([]);
      setIsLoading(false);
      return;
    }

    // For now, use the static GTD_PAGES configuration
    // Map them to match the expected structure
    const staticPages: GTDPage[] = GTD_PAGES.map(page => ({
      ...page,
      order: GTD_PAGES.indexOf(page),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    setGtdPages(staticPages);
    setIsLoading(false);

    // Auto-select first page if none selected
    if (staticPages.length > 0 && !currentPageId) {
      console.log('Auto-selecting first GTD page:', staticPages[0].id, staticPages[0].title);
      setCurrentPageId(staticPages[0].id);
    }
  }, [user, currentPageId]);

  // Compute Tagged Notes: pages in Notes workspace mentioned with @ in any GTD page content
  useEffect(() => {
    if (!user || !notesWorkspace || gtdPages.length === 0) return;

    const loadTaggedNotes = async () => {
      try {
        // Load all Notes pages
        const notes = (await getWorkspacePages(user.uid, notesWorkspace.id)) as Page[];
        if (!notes || notes.length === 0) {
          setTaggedNotes([]);
          return;
        }

        // Build normalized title map
        const normalize = (s: string) => s
          .toLowerCase()
          .replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Extended_Pictographic}]/gu, '')
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const titleMap = new Map<string, { id: string; title: string }>();
        for (const p of notes) {
          const key = normalize(p.title || '');
          if (key) titleMap.set(key, { id: p.id, title: p.title });
        }

        const counts = new Map<string, number>();

        // Scan blocks from each GTD page
        for (const gp of gtdPages) {
          try {
            const blocks = await getBlocks(user.uid, gp.id);
            for (const b of blocks) {
              const content = (b.content || '').toString();
              if (!content.includes('@')) continue;
              // Extract possible mentions: @Title or @[Title]
              const matches = Array.from(content.matchAll(/@\[([^\]]+)\]|@([A-Za-z0-9][A-Za-z0-9\s]{0,80})/g));
              if (matches.length === 0) continue;
              for (const m of matches) {
                const raw = (m[1] || m[2] || '').trim();
                if (!raw) continue;
                const key = normalize(raw);
                const found = titleMap.get(key);
                if (found) {
                  counts.set(found.id, (counts.get(found.id) || 0) + 1);
                }
              }
            }
          } catch (e) {
            console.warn('Failed scanning blocks for page', gp.id, e);
          }
        }

        const result: Array<{ id: string; title: string; count: number }> = [];
        for (const [id, count] of counts.entries()) {
          const info = notes.find(n => n.id === id);
          if (info) result.push({ id, title: info.title, count });
        }
        result.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
        setTaggedNotes(result);
      } catch (err) {
        console.error('Error computing tagged notes:', err);
        setTaggedNotes([]);
      }
    };

    loadTaggedNotes();
  }, [user, notesWorkspace, gtdPages]);


  const handlePageClick = useCallback((pageId: string) => {
    console.log('Switching to GTD page:', pageId);
    setCurrentPageId(pageId);
    setActiveView('editor');
  }, []);

  if (isLoading) {
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading GTD workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600">Please log in to access your GTD workspace.</p>
        </div>
      </div>
    );
  }


  // Don't render with GlobalDragProvider until we have a valid page
  if (!currentPageId && activeView !== 'smart') {
    return (
      <div className="flex h-screen w-full">
        {/* Unified Sidebar */}
        <UnifiedSidebar 
          currentPageId={activeView === 'editor' ? currentPageId || undefined : undefined}
          onPageSelect={handlePageClick}
          onTasksViewSelect={() => {
            setActiveView('smart');
            setCurrentPageId(null);
          }}
          isSmartViewActive={false}
          mode="gtd"
        />
        
        {/* Main Content */}
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a GTD page</h3>
              <p className="text-gray-500">Choose a page from the sidebar to start organizing your tasks.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPage = gtdPages.find(p => p.id === currentPageId);
  const isSmartActive = activeView === 'smart';

  return (
    <GlobalDragProvider currentPageId={currentPageId || ''}>
      <div className="flex h-screen w-full relative">
        {/* Mobile menu button */}
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Unified Sidebar */}
        <UnifiedSidebar 
          currentPageId={activeView === 'editor' ? currentPageId || undefined : undefined}
          onPageSelect={handlePageClick}
          onTasksViewSelect={() => {
            setActiveView('smart');
            setCurrentPageId(null);
            closeMobileMenu();
          }}
          isSmartViewActive={isSmartActive}
          mode="gtd"
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={toggleMobileMenu}
        />
        
        {/* Main Content */}
        <div className="flex-1 bg-white overflow-y-auto pb-16 lg:pb-0">
          {activeView === 'smart' ? (
            <SmartView />
          ) : currentPageId && currentPage ? (
            <BlocksProvider pageId={currentPageId}>
              <div className="flex flex-col h-full">
                {/* Page Title Header */}
                <div className="px-8 py-6 border-b border-gray-200 bg-white">
                  <div className="flex items-center gap-3">
                    {currentPage.emoji && (
                      <span className="text-3xl">{currentPage.emoji}</span>
                    )}
                    <h1 className="text-3xl font-bold text-gray-900">
                      {currentPage.title || 'Untitled'}
                    </h1>
                  </div>
                  {currentPage.description && (
                    <p className="text-gray-600 mt-2 ml-12">
                      {currentPage.description}
                    </p>
                  )}
                </div>
                {/* Editor */}
                <div className="flex-1 overflow-y-auto">
                  <BlockDragProvider>
                    <Editor pageId={currentPageId} mode="gtd" />
                  </BlockDragProvider>
                </div>
              </div>
            </BlocksProvider>
          ) : null}
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeView={activeView === 'smart' ? 'smart' : currentPageId || 'inbox'}
          onNavigate={(view) => {
            if (view === 'smart') {
              setActiveView('smart');
              setCurrentPageId(null);
            } else if (view === 'inbox') {
              const inboxPage = gtdPages.find(p => p.id === 'inbox');
              if (inboxPage) {
                setCurrentPageId('inbox');
                setActiveView('editor');
              }
            } else if (view === 'notes') {
              // TODO: Switch to notes workspace
              console.log('Switch to notes workspace');
            }
          }}
          onQuickAdd={() => {
            // Navigate to inbox for quick capture
            setCurrentPageId('inbox');
            setActiveView('editor');
            // TODO: Focus on new block creation
          }}
          onMenuToggle={toggleMobileMenu}
        />
      </div>
    </GlobalDragProvider>
  );
}


