'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { WorkspaceMode, Workspace } from '@/types/workspace';
import { initializeUserWorkspaces } from '@/lib/workspaceOperations';

interface WorkspaceContextType {
  // Current state
  currentMode: WorkspaceMode;
  currentWorkspace: Workspace | null;
  
  // Workspaces
  gtdWorkspace: Workspace | null;
  notesWorkspace: Workspace | null;
  
  // Actions
  switchMode: (mode: WorkspaceMode) => void;
  
  // Status
  isLoading: boolean;
  error: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // State
  const [currentMode, setCurrentMode] = useState<WorkspaceMode>('notes'); // Default to notes
  const [gtdWorkspace, setGtdWorkspace] = useState<Workspace | null>(null);
  const [notesWorkspace, setNotesWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize workspaces when user loads
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const initializeWorkspaces = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('WorkspaceProvider: Initializing workspaces for user:', user.uid);
        
        const { gtdWorkspace, notesWorkspace } = await initializeUserWorkspaces(user.uid);
        
        setGtdWorkspace(gtdWorkspace);
        setNotesWorkspace(notesWorkspace);
        
        console.log('WorkspaceProvider: Workspaces initialized', {
          gtd: gtdWorkspace.name,
          notes: notesWorkspace.name
        });
        
      } catch (error) {
        console.error('WorkspaceProvider: Failed to initialize workspaces:', error);
        setError(error instanceof Error ? error.message : 'Failed to load workspaces');
      } finally {
        setIsLoading(false);
      }
    };

    initializeWorkspaces();
  }, [user]);

  // Switch workspace mode
  const switchMode = (mode: WorkspaceMode) => {
    console.log('WorkspaceProvider: Switching to mode:', mode);
    setCurrentMode(mode);
    
    // Persist preference to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace-mode', mode);
    }
  };

  // Load saved workspace preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('workspace-mode') as WorkspaceMode;
      if (savedMode === 'gtd' || savedMode === 'notes') {
        setCurrentMode(savedMode);
      }
    }
  }, []);

  // Calculate current workspace
  const currentWorkspace = currentMode === 'gtd' ? gtdWorkspace : notesWorkspace;

  const value: WorkspaceContextType = {
    currentMode,
    currentWorkspace,
    gtdWorkspace,
    notesWorkspace,
    switchMode,
    isLoading,
    error
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
