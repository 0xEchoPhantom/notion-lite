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
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}
