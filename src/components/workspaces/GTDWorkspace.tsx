'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Page } from '@/types/index';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { GlobalDragProvider, useGlobalDrag } from '@/contexts/GlobalDragContext';
import { Editor } from '@/components/editor/Editor';
import { GTD_PAGES } from '@/types/workspace';
import { db } from '@/firebase/client';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { SmartView } from '@/components/tasks/SmartView';
import { getTaskMirrorService } from '@/lib/taskMirror';

// Extended Page interface for GTD pages with emoji and description
interface GTDPage extends Page {
  emoji?: string;
  description?: string;
}

export function GTDWorkspace() {
  const { user } = useAuth();
  const [gtdPages, setGtdPages] = useState<GTDPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [showTaskOverview, setShowTaskOverview] = useState(false);
  const [activeView, setActiveView] = useState<'editor' | 'smart'>('editor');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize task mirror service
  useEffect(() => {
    if (!user || !currentPageId) return;
    
    const mirrorService = getTaskMirrorService(user.uid);
    const unsubscribe = mirrorService.subscribeToPageBlocks(currentPageId);
    
    return () => unsubscribe();
  }, [user, currentPageId]);

  // Listen to GTD pages from Firestore
  useEffect(() => {
    if (!user) {
      setGtdPages([]);
      setIsLoading(false);
      return;
    }

    const gtdPagesRef = collection(db, 'users', user.uid, 'workspaces', 'gtd', 'pages');
    const gtdPagesQuery = query(gtdPagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(gtdPagesQuery, (snapshot) => {
      const pages: GTDPage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GTDPage));
      
      setGtdPages(pages);
      setIsLoading(false);

      // Auto-select first page if none selected
      if (pages.length > 0 && !currentPageId) {
        setCurrentPageId(pages[0].id);
      }
    }, (error) => {
      console.error('Error fetching GTD pages:', error);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user, currentPageId, setCurrentPageId]);

  // Create GTD pages based on config
  const handleCreateGTDPages = useCallback(async () => {
    if (!user) return;

    try {
      const gtdPagesRef = collection(db, 'users', user.uid, 'workspaces', 'gtd', 'pages');
      
      for (const pageConfig of GTD_PAGES) {
        await addDoc(gtdPagesRef, {
          title: pageConfig.title,
          emoji: pageConfig.emoji,
          description: pageConfig.description,
          order: 0,
          isFixed: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error creating GTD pages:', error);
    }
  }, [user]);

  const handlePageClick = useCallback((pageId: string) => {
    setCurrentPageId(pageId);
    setShowTaskOverview(false); // Close task overview when selecting a page
  }, [setCurrentPageId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-gray-600">Loading GTD workspace...</div>
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

  if (gtdPages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to GTD</h1>
          <p className="text-gray-600 mb-6">
            Get started with the Getting Things Done methodology by creating your workflow pages.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">GTD Pages Include:</h3>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>📥 <strong>Inbox:</strong> Quick capture of thoughts, tasks, and ideas</li>
              <li>⚡ <strong>Next Actions:</strong> Single concrete actions you can take right now</li>
              <li>⏳ <strong>Waiting For:</strong> Things delegated to others or pending external events</li>
              <li>� <strong>Someday/Maybe:</strong> Ideas and possibilities for potential future action</li>
            </ul>
          </div>
          <button
            onClick={handleCreateGTDPages}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create GTD Pages
          </button>
        </div>
      </div>
    );
  }

  return (
    <GlobalDragProvider currentPageId={currentPageId || ''}>
      <div className="flex flex-1">
        {/* GTD Sidebar with Drop Zones */}
        <GTDSidebar 
          gtdPages={gtdPages}
          currentPageId={currentPageId}
          activeView={activeView}
          onPageClick={handlePageClick}
          onViewChange={setActiveView}
        />
        
        {/* Main Content */}
        <div className="flex-1 min-h-screen bg-white">
          {activeView === 'smart' ? (
            <SmartView />
          ) : currentPageId ? (
            <BlocksProvider pageId={currentPageId}>
              <Editor pageId={currentPageId} />
            </BlocksProvider>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a GTD page</h3>
                <p className="text-gray-500">Choose a page from the sidebar to start organizing your tasks.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlobalDragProvider>
  );
}

// GTD Sidebar Component with Drop Zones
interface GTDSidebarProps {
  gtdPages: GTDPage[];
  currentPageId: string | null;
  activeView: 'editor' | 'smart';
  onPageClick: (pageId: string) => void;
  onViewChange: (view: 'editor' | 'smart') => void;
}

function GTDSidebar({ gtdPages, currentPageId, activeView, onPageClick, onViewChange }: GTDSidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 GTD Workflow</h2>
        
        {/* View Toggles */}
        <div className="mb-4 space-y-2">
          <button
            onClick={() => onViewChange('smart')}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
              activeView === 'smart' 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">🧠</span>
            <div className="flex-1 text-left">
              <div className="font-medium">Smart View</div>
              <div className="text-xs text-gray-500">Board, table, priority & AI chat</div>
            </div>
          </button>
        </div>
        
        {/* GTD Pages from Firestore */}
        <div className="space-y-1">
          {gtdPages.length > 0 ? (
            gtdPages.map((page) => (
              <GTDPageItem
                key={page.id}
                page={page}
                isActive={currentPageId === page.id && activeView === 'editor'}
                onClick={() => {
                  onPageClick(page.id);
                  onViewChange('editor');
                }}
              />
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              No GTD pages found
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
  );
}

// GTD Page Item with Drop Zone
interface GTDPageItemProps {
  page: GTDPage;
  isActive: boolean;
  onClick: () => void;
}

function GTDPageItem({ page, isActive, onClick }: GTDPageItemProps) {
  const { draggedBlock, isDragging, isValidDropTarget, moveBlockToNewPage } = useGlobalDrag();
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  
  const canDrop = isDragging && isValidDropTarget(page.id);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canDrop) {
      setIsDraggedOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only remove drag over if we're actually leaving the element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggedOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOver(false);
    
    if (canDrop && draggedBlock) {
      console.log(`Moving block from ${draggedBlock.sourcePageId} to ${page.id}`);
      const success = await moveBlockToNewPage(page.id, 0);
      if (success) {
        console.log(`Successfully moved block to ${page.title}`);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full transition-all ${
        isDraggedOver && canDrop
          ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50'
          : ''
      }`}
    >
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
          isActive 
            ? 'bg-blue-50 border-blue-200 text-blue-700' 
            : isDraggedOver && canDrop
            ? 'border-blue-300 bg-blue-25'
            : 'border-gray-200 hover:bg-gray-50'
        }`}
      >
        <span className="text-lg">{page.emoji}</span>
        <div className="flex-1">
          <div className="font-medium">{page.title}</div>
          {page.description && (
            <div className="text-xs text-gray-500">{page.description}</div>
          )}
          {isDraggedOver && canDrop && (
            <div className="text-xs text-blue-600 font-medium mt-1">
              Drop to move block here
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

// Task Overview Component
interface TaskOverviewViewProps {
  gtdPages: GTDPage[];
}

function TaskOverviewView({ gtdPages }: TaskOverviewViewProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">📊 Task Overview</h1>
        <p className="text-gray-600">View and manage tasks across all your GTD pages</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gtdPages.map((page) => (
          <div key={page.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{page.emoji}</span>
              <h3 className="font-medium text-gray-900">{page.title}</h3>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              {page.description}
            </div>
            
            {/* TODO: Add task summary/preview here */}
            <div className="text-xs text-gray-400">
              Task summary coming soon...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
