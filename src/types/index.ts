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

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  indentLevel: number;
  isChecked?: boolean; // For todo-list blocks
  order: number;
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
