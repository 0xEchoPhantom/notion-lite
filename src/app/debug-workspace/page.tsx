'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getWorkspacePages, initializeUserWorkspaces } from '@/lib/workspaceOperations';

export default function DebugWorkspacePage() {
  const { user } = useAuth();
  const { gtdWorkspace, notesWorkspace, isLoading } = useWorkspace();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (!user || isLoading) return;

    const loadDebugInfo = async () => {
      try {
        const info: any = {
          user: user.uid,
          gtdWorkspace,
          notesWorkspace,
        };

        if (gtdWorkspace) {
          const gtdPages = await getWorkspacePages(user.uid, gtdWorkspace.id);
          info.gtdPages = gtdPages;
        }

        if (notesWorkspace) {
          const notesPages = await getWorkspacePages(user.uid, notesWorkspace.id);
          info.notesPages = notesPages;
        }

        setDebugInfo(info);
      } catch (error) {
        console.error('Debug error:', error);
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    };

    loadDebugInfo();
  }, [user, gtdWorkspace, notesWorkspace, isLoading]);

  const reinitializeWorkspaces = async () => {
    if (!user) return;
    
    try {
      console.log('Reinitializing workspaces...');
      const result = await initializeUserWorkspaces(user.uid);
      console.log('Reinitialization result:', result);
      window.location.reload();
    } catch (error) {
      console.error('Reinitialization error:', error);
    }
  };

  if (!user) {
    return <div className="p-8">Please log in first</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Workspace Debug</h1>
      
      <button 
        onClick={reinitializeWorkspaces}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Reinitialize Workspaces
      </button>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    </div>
  );
}
