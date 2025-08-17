'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceMode } from '@/types/workspace';
import { EditablePageButton } from '@/components/ui/EditablePageButton';
import { Page } from '@/types/index';
import { SettingsModal } from './SettingsModal';
import { SidebarPageDropZone } from './SidebarPageDropZone';

interface UnifiedNoteSidebarProps {
  notesPages: Page[];
  currentPageId: string | null;
  onPageSelect: (pageId: string) => void;
  onCreateNewPage: () => void;
  onTitleUpdate: (pageId: string, newTitle: string) => void;
  creating: boolean;
}

export const UnifiedNoteSidebar: React.FC<UnifiedNoteSidebarProps> = ({
  notesPages,
  currentPageId,
  onPageSelect,
  onCreateNewPage,
  onTitleUpdate,
  creating
}) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { currentMode, switchMode, isLoading } = useWorkspace();
  const [isSwitching, setIsSwitching] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

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

  return (
    <div className="w-72 bg-[#FBFBFA] dark:bg-gray-800 border-r border-gray-200/80 dark:border-gray-700 h-screen flex flex-col">
      {/* User Section */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {user?.email?.split('@')[0] || 'User'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
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
        <div className="flex rounded-md bg-gray-100/50 dark:bg-gray-700/50 p-0.5">
          <button
            onClick={() => handleModeChange('gtd')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${
              currentMode === 'gtd'
                ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            disabled={isLoading || isSwitching}
          >
            🎯 GTD
          </button>
          <button
            onClick={() => handleModeChange('notes')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${
              currentMode === 'notes'
                ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            disabled={isLoading || isSwitching}
          >
            📝 Notes
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="flex items-center justify-between mb-3 px-3">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</h2>
        </div>
        
        {/* New Page Button */}
        <button 
          onClick={onCreateNewPage}
          disabled={creating}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md border border-dashed border-gray-300 dark:border-gray-600 mb-3 disabled:opacity-50 transition-colors"
        >
          <span className="text-base">{creating ? '⏳' : '+'}</span>
          <span>{creating ? 'Creating...' : 'New Page'}</span>
        </button>

        {/* Notes Pages List */}
        <div className="space-y-1">
          {notesPages.length > 0 ? (
            notesPages.map((page) => (
              <SidebarPageDropZone
                key={page.id}
                pageId={page.id}
                pageTitle={page.title}
                isCurrentPage={currentPageId === page.id}
              >
                <EditablePageButton 
                  page={page}
                  isActive={currentPageId === page.id}
                  onClick={() => onPageSelect(page.id)}
                  onTitleUpdate={onTitleUpdate}
                />
              </SidebarPageDropZone>
            ))
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-2">
              No pages yet. Create your first note!
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-3 py-3 border-t border-gray-200/50 dark:border-gray-700 space-y-1">
        <button 
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm hover:text-gray-900 dark:hover:text-gray-100">Settings</span>
        </button>
        <Link 
          href="/recycle-bin" 
          className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm">Recycle Bin</span>
        </Link>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};