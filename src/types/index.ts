export type BlockType = 'paragraph' | 'bulleted-list' | 'todo-list';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}
