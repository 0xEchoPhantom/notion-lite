import { Timestamp } from 'firebase/firestore';

export type WorkspaceMode = 'gtd' | 'notes';

export interface Workspace {
  id: string;
  name: string;
  mode: WorkspaceMode;
  userId: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageReference {
  id: string;
  originalPageId: string;
  originalWorkspaceId: string;
  gtdWorkspaceId: string;
  gtdPageId: string;
  createdAt: Date;
}

// GTD fixed pages configuration
export interface GTDPageConfig {
  id: string;
  title: string;
  emoji: string;
  order: number;
  description: string;
}

export const GTD_PAGES: GTDPageConfig[] = [
  {
    id: 'inbox',
    title: 'Inbox',
    emoji: '�',
    order: 1,
    description: 'Capture everything that needs your attention'
  },
  {
    id: 'actions',
    title: 'Actions',
    emoji: '🎯',
    order: 2,
    description: 'Next actions you can take now'
  },
  {
    id: 'waiting',
    title: 'Waiting',
    emoji: '⏳',
    order: 3,
    description: 'Tasks waiting on others'
  },
  {
    id: 'someday',
    title: 'Someday',
    emoji: '�',
    order: 4,
    description: 'Ideas for the future'
  }
];
