export type BlockType = 
  | 'paragraph'
  | 'heading-1'
  | 'heading-2' 
  | 'heading-3'
  | 'bulleted-list'
  | 'numbered-list'
  | 'todo-list'
  | 'quote'
  | 'code'
  | 'divider';

export interface TaskMetadata {
  // Task status and completion
  status?: 'now' | 'next' | 'waiting' | 'someday' | 'done';
  completedAt?: Date;
  
  // Value and effort for ROI calculation
  value?: number;
  effort?: number; // in hours
  roi?: number; // computed: value / effort
  
  // Task details
  dueDate?: Date;
  assignee?: string;
  company?: string;
  
  // Hierarchy
  subtaskIds?: string[];
  parentTaskId?: string;
  
  // Tracking
  promotedToNextAt?: Date;
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  pageId: string; // Required: which page this block belongs to
  workspaceId?: string; // Optional: which workspace (for faster queries)
  indentLevel: number;
  isChecked?: boolean; // For todo-list blocks
  order: number;
  // Single source of truth for task data
  taskMetadata?: TaskMetadata; // Only present for todo-list blocks
  createdAt: Date;
  updatedAt: Date;
}

export interface Page {
  id: string;
  title: string;
  order: number;
  workspaceId?: string; // New: Links page to workspace
  isFixed?: boolean; // New: Marks GTD fixed pages
  tags?: string[]; // New: For cross-workspace tagging
  createdAt: Date;
  updatedAt: Date;
}

export interface ArchivedPage {
  id: string;
  originalId: string;
  title: string;
  order: number;
  archivedAt: Date;
  originalCreatedAt: Date;
  originalUpdatedAt: Date;
}

export interface ArchivedBlock {
  id: string;
  originalId: string;
  pageId: string;
  pageTitle: string;
  type: BlockType;
  content: string;
  indentLevel: number;
  isChecked?: boolean;
  order: number;
  archivedAt: Date;
  originalCreatedAt: Date;
  originalUpdatedAt: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}
