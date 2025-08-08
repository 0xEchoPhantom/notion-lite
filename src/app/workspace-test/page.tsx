'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceToggle } from '@/components/ui/WorkspaceToggle';

function WorkspaceTestContent() {
  const { user } = useAuth();
  const { 
    currentMode, 
    currentWorkspace, 
    gtdWorkspace, 
    notesWorkspace, 
    isLoading, 
    error 
  } = useWorkspace();

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Workspace Test</h1>
        <p className="text-red-600">Please sign in to test workspaces</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Workspace Test</h1>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Initializing workspaces...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Workspace Test</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">Error:</p>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkspaceToggle />
      
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Workspace Foundation Test</h1>
        
        {/* Current State */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current State</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Mode:</span>
              <p className="text-lg">{currentMode}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Current Workspace:</span>
              <p className="text-lg">{currentWorkspace?.name || 'None'}</p>
            </div>
          </div>
        </div>

        {/* Workspaces Info */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* GTD Workspace */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">🎯 GTD Workspace</h3>
            {gtdWorkspace ? (
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Name:</span>
                  <p>{gtdWorkspace.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">ID:</span>
                  <p className="font-mono text-xs">{gtdWorkspace.id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Created:</span>
                  <p>{gtdWorkspace.createdAt.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Not created</p>
            )}
          </div>

          {/* Notes Workspace */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-600">📝 Notes Workspace</h3>
            {notesWorkspace ? (
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Name:</span>
                  <p>{notesWorkspace.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">ID:</span>
                  <p className="font-mono text-xs">{notesWorkspace.id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Created:</span>
                  <p>{notesWorkspace.createdAt.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Not created</p>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">User Info</h3>
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-500">Email:</span>
              <p>{user.email}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">User ID:</span>
              <p className="font-mono text-xs">{user.uid}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceTestPage() {
  return (
    <WorkspaceProvider>
      <WorkspaceTestContent />
    </WorkspaceProvider>
  );
}
