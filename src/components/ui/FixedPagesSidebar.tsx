'use client';

import React from 'react';
import { FIXED_PAGES, FixedPage } from '@/constants/fixedPages';
import { useSettings } from '@/contexts/SettingsContext';

interface FixedPagesSidebarProps {
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onTasksViewSelect: () => void;
  showTasksView?: boolean;
}

export const FixedPagesSidebar: React.FC<FixedPagesSidebarProps> = ({
  currentPageId,
  onPageSelect,
  onTasksViewSelect,
  showTasksView = false
}) => {
  const { settings } = useSettings();

  const PageItem: React.FC<{ page: FixedPage; isActive: boolean }> = ({ page, isActive }) => (
    <button
      onClick={() => onPageSelect(page.id)}
      className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
        isActive 
          ? `${page.bgColor} ${page.color} border-current shadow-sm` 
          : 'hover:bg-gray-50 border-transparent'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${
          isActive 
            ? page.bgColor.replace('bg-', 'bg-').replace('-100', '-500')
            : page.bgColor.replace('-100', '-300')
        }`}>
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{page.icon}</span>
            <span className="font-medium">{page.title}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{page.description}</p>
        </div>
      </div>
    </button>
  );

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full p-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Workflow</h2>
        <p className="text-sm text-gray-600">Organized task management</p>
      </div>

      {/* Tasks Overview */}
      {settings.showTasksView && (
        <div className="mb-6">
          <button
            onClick={onTasksViewSelect}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
              showTasksView
                ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                : 'hover:bg-gray-50 border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                showTasksView ? 'bg-blue-500' : 'bg-blue-300'
              }`}></div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📊</span>
                  <span className="font-medium">All Tasks</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Overview & analytics</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Fixed Pages */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Pages</h3>
        {FIXED_PAGES.map(page => (
          <PageItem
            key={page.id}
            page={page}
            isActive={currentPageId === page.id}
          />
        ))}
      </div>

      {/* Settings Note */}
      {!settings.allowNewPageCreation && (
        <div className="mt-8 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Fixed pages mode:</span> New page creation is disabled.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Stats</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Active pages:</span>
            <span>{FIXED_PAGES.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Page creation:</span>
            <span className={settings.allowNewPageCreation ? 'text-green-600' : 'text-red-600'}>
              {settings.allowNewPageCreation ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
