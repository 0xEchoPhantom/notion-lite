import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Block, Page, BlockType } from '@/types/index';

// Page operations
export const createPage = async (userId: string, title: string): Promise<string> => {
  if (!userId) {
    throw new Error('User ID is required to create a page');
  }
  if (!title) {
    throw new Error('Title is required to create a page');
  }
  
  const pagesRef = collection(db, 'users', userId, 'pages');
  const docRef = await addDoc(pagesRef, {
    title,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getPages = async (userId: string): Promise<Page[]> => {
  if (!userId) {
    throw new Error('User ID is required to fetch pages');
  }
  
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

export const deletePage = async (userId: string, pageId: string): Promise<void> => {
  if (!userId || !pageId) {
    throw new Error('User ID and Page ID are required to delete a page');
  }

  try {
    // First delete all blocks in the page
    const blocksRef = collection(db, 'users', userId, 'pages', pageId, 'blocks');
    const blocksSnapshot = await getDocs(blocksRef);
    
    // Delete all blocks
    const deletePromises = blocksSnapshot.docs.map(blockDoc => deleteDoc(blockDoc.ref));
    await Promise.all(deletePromises);
    
    // Then delete the page itself
    const pageRef = doc(db, 'users', userId, 'pages', pageId);
    await deleteDoc(pageRef);
  } catch (error) {
    console.error('Error deleting page:', error);
    throw error;
  }
};

// Block operations
export const createBlock = async (
  userId: string,
  pageId: string,
  block: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  if (!userId) {
    throw new Error('User ID is required to create a block');
  }
  if (!pageId) {
    throw new Error('Page ID is required to create a block');
  }
  
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

export const moveBlockToPage = async (
  userId: string,
  fromPageId: string,
  toPageId: string,
  blockId: string,
  newOrder: number
) => {
  // Get the block data from the source page
  const sourceBlockRef = doc(db, 'users', userId, 'pages', fromPageId, 'blocks', blockId);
  const sourceSnapshot = await getDoc(sourceBlockRef);
  
  if (!sourceSnapshot.exists()) {
    throw new Error('Block not found');
  }
  
  const blockData = sourceSnapshot.data();
  
  // Create the block in the destination page
  const destBlocksRef = collection(db, 'users', userId, 'pages', toPageId, 'blocks');
  const cleanBlockData = Object.fromEntries(
    Object.entries({
      ...blockData,
      order: newOrder,
      updatedAt: Timestamp.now(),
    }).filter(([_, value]) => value !== undefined)
  );
  
  // Use batch to ensure atomicity
  const batch = writeBatch(db);
  
  // Add to destination page
  const newBlockRef = doc(destBlocksRef);
  batch.set(newBlockRef, cleanBlockData);
  
  // Delete from source page
  batch.delete(sourceBlockRef);
  
  await batch.commit();
  
  return newBlockRef.id;
};
