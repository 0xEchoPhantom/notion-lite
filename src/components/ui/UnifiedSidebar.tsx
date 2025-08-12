'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceMode } from '@/types/workspace';
import { GTD_PAGES } from '@/types/workspace';
import { useSimpleDrag } from '@/contexts/SimpleDragContext';
import { SidebarPageDropZone } from './SidebarPageDropZone';
import { RecycleBinDropZone } from './RecycleBinDropZone';
import { X } from 'lucide-react';

interface UnifiedSidebarProps {
  currentPageId?: string;
  onPageSelect?: (pageId: string) => void;
  onTasksViewSelect?: () => void;
  isSmartViewActive?: boolean;
  mode: 'gtd' | 'notes';
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  currentPageId,
  onPageSelect,
  onTasksViewSelect,
  isSmartViewActive = false,
  mode,
  isMobileMenuOpen = false,
  onMobileMenuToggle
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { currentMode, switchMode, isLoading } = useWorkspace();
  const [isSwitching, setIsSwitching] = React.useState(false);
  const { isDragging } = useSimpleDrag();

  const handleModeChange = (mode: WorkspaceMode) => {
    if (mode === currentMode) return;
    setIsSwitching(true);
    switchMode(mode);
    setTimeout(() => setIsSwitching(false), 300);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };


  const PageItem: React.FC<{ page: typeof GTD_PAGES[number]; isActive: boolean }> = ({ page, isActive }) => {
    return (
      <SidebarPageDropZone 
        pageId={page.id} 
        pageTitle={page.title}
        isCurrentPage={isActive}
      >
        <button
          onClick={() => {
            onPageSelect?.(page.id);
            onMobileMenuToggle?.();
          }}
          className={`w-full text-left px-3 py-2 rounded-md transition-all duration-150 ${
            isActive 
            ? 'bg-gray-200/70 text-gray-900' 
            : 'hover:bg-gray-100 text-gray-700'
          } min-h-[44px]`}
      >
          <div className="flex items-center space-x-3">
            <span className="text-base">{page.emoji}</span>
            <span className="text-sm">{page.title}</span>
          </div>
        </button>
      </SidebarPageDropZone>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onMobileMenuToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-[#FBFBFA] border-r border-gray-200/80 
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col h-screen
      `}>
      
      {/* Mobile close button */}
      <div className="lg:hidden flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-800">Menu</span>
        <button
          onClick={onMobileMenuToggle}
          className="p-2 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {/* User Section */}
      <div className="px-4 pt-2 lg:pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-800 truncate">
              {user?.email?.split('@')[0] || 'User'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
            title="Sign out"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>


      {/* Workspace Toggle */}
      <div className="px-4 pb-4">
        <div className="flex rounded-md bg-gray-100/50 p-0.5">
          <button
            onClick={() => handleModeChange('gtd')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${
              currentMode === 'gtd'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={isLoading || isSwitching}
          >
            🎯 GTD
          </button>
          <button
            onClick={() => handleModeChange('notes')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${
              currentMode === 'notes'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={isLoading || isSwitching}
          >
            📝 Notes
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3">
        {mode === 'gtd' && (
          <>

            {/* Smart View Button */}
            <div className="mb-3">
              <button
                onClick={onTasksViewSelect}
                className={`w-full text-left px-3 py-2 rounded-md transition-all duration-150 ${
                  isSmartViewActive
                    ? 'bg-gray-200/70 text-gray-900'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-base">🧠</span>
                  <span className="text-sm font-medium">Smart View</span>
                </div>
              </button>
            </div>

            {/* GTD Pages */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mt-1">
                Workflow
              </div>
              {GTD_PAGES.map(page => (
                <PageItem
                  key={page.id}
                  page={page}
                  isActive={currentPageId === page.id}
                />
              ))}
            </div>
          </>
        )}

        {mode === 'notes' && (
          <div className="text-sm text-gray-600 px-3">
            Notes workspace
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="px-3 py-3 border-t border-gray-200/50 space-y-1">
        <Link 
          href="/settings"
          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm">Settings</span>
        </Link>
        <RecycleBinDropZone>
          <Link 
            href="/recycle-bin" 
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm">Recycle Bin</span>
          </Link>
        </RecycleBinDropZone>
      </div>
    </div>
    </>
  );
};