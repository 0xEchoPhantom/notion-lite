// src/lib/types.ts

export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bulleted-list'
  | 'numbered-list'
  | 'todo-list'
  | 'quote'
  | 'code';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  order: number;
  indent: number;
  pageId: string;
  authorId: string;
  createdAt: Date | { seconds: number; nanoseconds: number }; // Firestore timestamp
  updatedAt: Date | { seconds: number; nanoseconds: number }; // Firestore timestamp
  completed?: boolean;
}
