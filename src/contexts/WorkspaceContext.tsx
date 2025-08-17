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
  const [currentMode, setCurrentMode] = useState<WorkspaceMode>('gtd'); // Default to GTD; notes mode disabled
  const [gtdWorkspace, setGtdWorkspace] = useState<Workspace | null>(null);
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
        
        const { gtdWorkspace } = await initializeUserWorkspaces(user.uid);
        
        setGtdWorkspace(gtdWorkspace);
        
        console.log('WorkspaceProvider: Workspaces initialized', {
          gtd: gtdWorkspace.name
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
    // Notes mode is disabled; only allow GTD
    if (mode !== 'gtd') {
      console.warn('Notes mode is disabled. Staying in GTD mode.');
      return;
    }
    if (mode === currentMode) return; // Prevent unnecessary switches

    console.log('WorkspaceProvider: Switching to mode:', mode);
    setCurrentMode('gtd');

    // Persist preference to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace-mode', 'gtd');
    }
  };

  // Load saved workspace preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('workspace-mode') as WorkspaceMode;
      // Force GTD regardless of saved value; notes mode disabled
      if (savedMode !== 'gtd') {
        localStorage.setItem('workspace-mode', 'gtd');
      }
      setCurrentMode('gtd');
    }
  }, []);

  // Calculate current workspace
  const currentWorkspace = gtdWorkspace;

  const value: WorkspaceContextType = {
    currentMode,
    currentWorkspace,
  gtdWorkspace,
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
