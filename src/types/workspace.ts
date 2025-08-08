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
    id: 'capture',
    title: 'Capture',
    emoji: '📥',
    order: 1,
    description: 'Quick thoughts and ideas'
  },
  {
    id: '2min',
    title: '2 min',
    emoji: '⚡',
    order: 2,
    description: 'Tasks that take 2 minutes or less'
  },
  {
    id: 'next-step',
    title: 'Next Step',
    emoji: '🎯',
    order: 3,
    description: 'Next actions to take'
  },
  {
    id: 'delegate',
    title: 'Delegate',
    emoji: '👥',
    order: 4,
    description: 'Tasks waiting on others'
  }
];
