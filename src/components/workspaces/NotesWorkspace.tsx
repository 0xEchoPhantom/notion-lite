'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function NotesWorkspace() {
  const { user } = useAuth();
  const { notesWorkspace } = useWorkspace();

  if (!user || !notesWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Notes workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      {/* Notes Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📝 Notes & Ideas</h2>
          </div>
          
          {/* New Page Button */}
          <button className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-4">
            <span>+</span>
            <span>New Page</span>
          </button>

          {/* Pages List */}
          <div className="space-y-1">
            <div className="text-sm text-gray-400 p-2">
              Your pages will appear here
            </div>
          </div>

          {/* GTD Tagging Section */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 mb-3">🏷️ GTD Tags</h3>
            <div className="text-sm text-gray-400">
              Tag your notes to GTD workflow steps for better organization
            </div>
          </div>
        </div>
      </div>

      {/* Notes Main Content */}
      <div className="flex-1 bg-gray-50">
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📝</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Notes & Ideas</h1>
            <p className="text-gray-600 mb-6">
              Create unlimited pages and organize your thoughts freely. Tag important notes to your GTD workflow.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">Getting Started</h3>
              <ul className="text-sm text-green-800 space-y-1 text-left">
                <li>📄 <strong>Create Pages:</strong> Unlimited page creation</li>
                <li>✏️ <strong>Rich Editing:</strong> Full Notion-like experience</li>
                <li>🏷️ <strong>Tag to GTD:</strong> Connect notes to workflow</li>
                <li>🔍 <strong>Search & Organize:</strong> Find what you need fast</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
