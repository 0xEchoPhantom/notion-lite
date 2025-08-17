// ===== WORKSPACE TYPES =====

export type WorkspaceMode = 'gtd';

export interface Workspace {
  id: string;
  name: string;
  mode: WorkspaceMode;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface PageReference {
  id: string;
  title: string;
  emoji?: string;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  userId: string;
  isFixed?: boolean;
}

// ===== GTD FIXED PAGES CONFIGURATION =====

export const GTD_PAGES = [
  {
    id: 'inbox',
    title: 'Inbox',
    emoji: '📥',
    description: 'Quick capture of thoughts, tasks, and ideas'
  },
  {
    id: 'next-actions',
    title: 'Next Actions',
    emoji: '⚡',
    description: 'Single concrete actions you can take right now'
  },
  {
    id: 'waiting-for',
    title: 'Waiting For',
    emoji: '⏳',
    description: 'Things delegated to others or pending external events'
  },
  {
    id: 'someday-maybe',
    title: 'Someday/Maybe',
    emoji: '💭',
    description: 'Ideas and possibilities for potential future action'
  }
] as const;

export type GTDPageId = typeof GTD_PAGES[number]['id'];