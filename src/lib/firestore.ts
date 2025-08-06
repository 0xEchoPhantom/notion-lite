import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Block, Page, BlockType } from '@/types';

// Page operations
export const createPage = async (userId: string, title: string): Promise<string> => {
  const pagesRef = collection(db, 'users', userId, 'pages');
  const docRef = await addDoc(pagesRef, {
    title,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getPages = async (userId: string): Promise<Page[]> => {
  const pagesRef = collection(db, 'users', userId, 'pages');
  const q = query(pagesRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    title: doc.data().title,
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  }));
};

export const updatePageTitle = async (userId: string, pageId: string, title: string) => {
  const pageRef = doc(db, 'users', userId, 'pages', pageId);
  await updateDoc(pageRef, {
    title,
    updatedAt: Timestamp.now(),
  });
};

// Block operations
export const createBlock = async (
  userId: string,
  pageId: string,
  block: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const blocksRef = collection(db, 'users', userId, 'pages', pageId, 'blocks');
  
  // Filter out undefined values to avoid Firebase errors
  const cleanBlock = Object.fromEntries(
    Object.entries({
      ...block,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }).filter(([_, value]) => value !== undefined)
  );
  
  const docRef = await addDoc(blocksRef, cleanBlock);
  return docRef.id;
};

export const updateBlock = async (
  userId: string,
  pageId: string,
  blockId: string,
  updates: Partial<Block>
) => {
  const blockRef = doc(db, 'users', userId, 'pages', pageId, 'blocks', blockId);
  
  // Filter out undefined values to avoid Firebase errors
  const cleanUpdates = Object.fromEntries(
    Object.entries({
      ...updates,
      updatedAt: Timestamp.now(),
    }).filter(([_, value]) => value !== undefined)
  );
  
  await updateDoc(blockRef, cleanUpdates);
};

export const deleteBlock = async (userId: string, pageId: string, blockId: string) => {
  const blockRef = doc(db, 'users', userId, 'pages', pageId, 'blocks', blockId);
  await deleteDoc(blockRef);
};

export const getBlocks = async (userId: string, pageId: string): Promise<Block[]> => {
  const blocksRef = collection(db, 'users', userId, 'pages', pageId, 'blocks');
  const q = query(blocksRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  })) as Block[];
};

export const subscribeToBlocks = (
  userId: string,
  pageId: string,
  callback: (blocks: Block[]) => void
) => {
  const blocksRef = collection(db, 'users', userId, 'pages', pageId, 'blocks');
  const q = query(blocksRef, orderBy('order', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const blocks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as Block[];
    callback(blocks);
  });
};

export const reorderBlocks = async (
  userId: string,
  pageId: string,
  blockUpdates: { id: string; order: number }[]
) => {
  const batch = writeBatch(db);
  
  blockUpdates.forEach(({ id, order }) => {
    const blockRef = doc(db, 'users', userId, 'pages', pageId, 'blocks', id);
    batch.update(blockRef, { order, updatedAt: Timestamp.now() });
  });
  
  await batch.commit();
};
