'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { GTD_PAGES } from '@/types/workspace';

export function GTDWorkspace() {
  const { user } = useAuth();
  const { gtdWorkspace } = useWorkspace();

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

  return (
    <div className="flex flex-1">
      {/* GTD Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 GTD Workflow</h2>
          
          {/* Fixed GTD Pages */}
          <div className="space-y-1">
            {GTD_PAGES.map((page) => (
              <div
                key={page.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
              >
                <span className="text-lg">{page.emoji}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{page.title}</div>
                  <div className="text-xs text-gray-500">{page.description}</div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-blue-600 font-medium">Fixed</span>
                </div>
              </div>
            ))}
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
      </div>
    </div>
  );
}
