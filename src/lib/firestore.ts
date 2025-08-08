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
import { Block, Page, BlockType, ArchivedPage, ArchivedBlock } from '@/types/index';

// Page operations
export const createPage = async (userId: string, title: string): Promise<string> => {
  if (!userId) {
    throw new Error('User ID is required to create a page');
  }
  if (!title) {
    throw new Error('Title is required to create a page');
  }
  
  // Get the current highest order to append the new page at the end
  const pagesRef = collection(db, 'users', userId, 'pages');
  const snapshot = await getDocs(pagesRef);
  const maxOrder = snapshot.docs.reduce((max, doc) => {
    const order = doc.data().order || 0;
    return Math.max(max, order);
  }, 0);
  
  const docRef = await addDoc(pagesRef, {
    title,
    order: maxOrder + 1,
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
  
  // First try to get pages ordered by 'order' field
  try {
    const q = query(pagesRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.docs.length > 0) {
      return snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        order: doc.data().order || 0,
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      }));
    }
  } catch (error) {
    console.log('No pages with order field found, trying legacy query...');
  }
  
  // Fallback: get all pages and migrate them
  const snapshot = await getDocs(pagesRef);
  const pages = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      order: data.order || 0,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  });
  
  // If we found pages without order, migrate them
  if (pages.length > 0 && pages.some(p => !p.order)) {
    await migratePages(userId, pages);
    // Re-fetch with proper ordering
    const q = query(pagesRef, orderBy('order', 'asc'));
    const newSnapshot = await getDocs(q);
    return newSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      order: doc.data().order || 0,
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    }));
  }
  
  return pages.sort((a, b) => a.order - b.order);
};

export const updatePageTitle = async (userId: string, pageId: string, title: string) => {
  const pageRef = doc(db, 'users', userId, 'pages', pageId);
  await updateDoc(pageRef, {
    title,
    updatedAt: Timestamp.now(),
  });
};

export const updatePageOrder = async (userId: string, pageId: string, order: number) => {
  const pageRef = doc(db, 'users', userId, 'pages', pageId);
  await updateDoc(pageRef, {
    order,
    updatedAt: Timestamp.now(),
  });
};

export const reorderPages = async (userId: string, pageUpdates: { id: string; order: number }[]) => {
  const batch = writeBatch(db);
  
  pageUpdates.forEach(({ id, order }) => {
    const pageRef = doc(db, 'users', userId, 'pages', id);
    batch.update(pageRef, {
      order,
      updatedAt: Timestamp.now(),
    });
  });
  
  await batch.commit();
};

// Migration function to add order field to existing pages
export const migratePages = async (userId: string, pages: Page[]) => {
  console.log('🔄 Migrating pages to add order field...');
  const batch = writeBatch(db);
  
  pages.forEach((page, index) => {
    if (!page.order) {
      const pageRef = doc(db, 'users', userId, 'pages', page.id);
      batch.update(pageRef, {
        order: index + 1,
        updatedAt: Timestamp.now(),
      });
    }
  });
  
  await batch.commit();
  console.log('✅ Pages migration completed');
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

export const archivePage = async (userId: string, pageId: string) => {
  if (!userId || !pageId) {
    throw new Error('Missing required parameters: userId or pageId');
  }

  try {
    const pageRef = doc(db, 'users', userId, 'pages', pageId);
    const pageDoc = await getDoc(pageRef);
    
    if (!pageDoc.exists()) {
      throw new Error('Page not found');
    }
    
    const pageData = pageDoc.data() as Page;
    
    // Create archived page with simplified structure
    const archivedPagesRef = collection(db, 'users', userId, 'archivedPages');
    const archivedPage = {
      originalId: pageId,
      title: pageData.title || 'Untitled Page',
      order: pageData.order || 0,
      archivedAt: Timestamp.now(),
      originalCreatedAt: pageData.createdAt,
      originalUpdatedAt: pageData.updatedAt,
    };
    
    // Create the archived page first
    await addDoc(archivedPagesRef, archivedPage);
    
    // Archive all blocks from this page
    const blocksRef = collection(db, 'users', userId, 'pages', pageId, 'blocks');
    const blocksSnapshot = await getDocs(blocksRef);
    
    const archivedBlocksRef = collection(db, 'users', userId, 'archivedBlocks');
    
    // Archive blocks and delete them individually (Firestore doesn't cascade delete subcollections)
    for (const blockDoc of blocksSnapshot.docs) {
      const blockData = blockDoc.data() as Block;
      const archivedBlock = {
        originalId: blockDoc.id,
        pageId: pageId,
        pageTitle: pageData.title || 'Untitled Page',
        type: blockData.type,
        content: blockData.content || '',
        indentLevel: blockData.indentLevel || 0,
        isChecked: blockData.isChecked || false,
        order: blockData.order || 0,
        archivedAt: Timestamp.now(),
        originalCreatedAt: blockData.createdAt,
        originalUpdatedAt: blockData.updatedAt,
      };
      
      // Archive the block
      await addDoc(archivedBlocksRef, archivedBlock);
      
      // Delete the original block
      await deleteDoc(blockDoc.ref);
    }
    
    // Finally delete the original page
    await deleteDoc(pageRef);
    
  } catch (error) {
    console.error('Error in archivePage:', error);
    throw error;
  }
};

export const archiveBlock = async (userId: string, pageId: string, blockId: string) => {
  if (!userId || !pageId || !blockId) {
    throw new Error('Missing required parameters: userId, pageId, or blockId');
  }

  try {
    const blockRef = doc(db, 'users', userId, 'pages', pageId, 'blocks', blockId);
    const blockDoc = await getDoc(blockRef);
    
    if (!blockDoc.exists()) {
      throw new Error('Block not found');
    }

    const blockData = blockDoc.data() as Block;
    
    // Get page title for reference
    const pageRef = doc(db, 'users', userId, 'pages', pageId);
    const pageDoc = await getDoc(pageRef);
    const pageTitle = pageDoc.exists() ? (pageDoc.data()?.title || 'Unknown Page') : 'Unknown Page';
    
    // Create archived block with simplified structure
    const archivedBlocksRef = collection(db, 'users', userId, 'archivedBlocks');
    const archivedBlock = {
      originalId: blockId,
      pageId: pageId,
      pageTitle: pageTitle,
      type: blockData.type,
      content: blockData.content || '',
      indentLevel: blockData.indentLevel || 0,
      isChecked: blockData.isChecked || false,
      order: blockData.order || 0,
      archivedAt: Timestamp.now(),
      originalCreatedAt: blockData.createdAt,
      originalUpdatedAt: blockData.updatedAt,
    };
    
    // Create the archived block first
    await addDoc(archivedBlocksRef, archivedBlock);
    
    // Then delete the original block
    await deleteDoc(blockRef);
    
  } catch (error) {
    console.error('Error in archiveBlock:', error);
    throw error;
  }
};

export const deleteBlock = async (userId: string, pageId: string, blockId: string) => {
  const blockRef = doc(db, 'users', userId, 'pages', pageId, 'blocks', blockId);
  await deleteDoc(blockRef);
};

// Archive management functions
export const getArchivedPages = async (userId: string): Promise<ArchivedPage[]> => {
  const archivedPagesRef = collection(db, 'users', userId, 'archivedPages');
  const q = query(archivedPagesRef, orderBy('archivedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    archivedAt: doc.data().archivedAt.toDate(),
    originalCreatedAt: doc.data().originalCreatedAt.toDate(),
    originalUpdatedAt: doc.data().originalUpdatedAt.toDate(),
  })) as ArchivedPage[];
};

export const getArchivedBlocks = async (userId: string): Promise<ArchivedBlock[]> => {
  const archivedBlocksRef = collection(db, 'users', userId, 'archivedBlocks');
  const q = query(archivedBlocksRef, orderBy('archivedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    archivedAt: doc.data().archivedAt.toDate(),
    originalCreatedAt: doc.data().originalCreatedAt.toDate(),
    originalUpdatedAt: doc.data().originalUpdatedAt.toDate(),
  })) as ArchivedBlock[];
};

export const restoreArchivedPage = async (userId: string, archivedPageId: string) => {
  const archivedPageRef = doc(db, 'users', userId, 'archivedPages', archivedPageId);
  const archivedPageDoc = await getDoc(archivedPageRef);
  
  if (!archivedPageDoc.exists()) {
    throw new Error('Archived page not found');
  }
  
  const archivedPageData = archivedPageDoc.data() as ArchivedPage;
  
  // Create the restored page
  const pagesRef = collection(db, 'users', userId, 'pages');
  const restoredPage: Omit<Page, 'id'> = {
    title: archivedPageData.title,
    order: archivedPageData.order,
    createdAt: archivedPageData.originalCreatedAt,
    updatedAt: Timestamp.now() as unknown as Date,
  };
  
  const pageDocRef = await addDoc(pagesRef, restoredPage);
  const newPageId = pageDocRef.id;
  
  // Restore all blocks that belonged to this page
  const archivedBlocksRef = collection(db, 'users', userId, 'archivedBlocks');
  const blocksQuery = query(archivedBlocksRef, orderBy('order', 'asc'));
  const blocksSnapshot = await getDocs(blocksQuery);
  
  const blocksRef = collection(db, 'users', userId, 'pages', newPageId, 'blocks');
  
  for (const blockDoc of blocksSnapshot.docs) {
    const blockData = blockDoc.data() as ArchivedBlock;
    
    if (blockData.pageId === archivedPageData.originalId) {
      const restoredBlock: Omit<Block, 'id'> = {
        type: blockData.type,
        content: blockData.content,
        indentLevel: blockData.indentLevel,
        isChecked: blockData.isChecked,
        order: blockData.order,
        createdAt: blockData.originalCreatedAt,
        updatedAt: Timestamp.now() as unknown as Date,
      };
      
      await addDoc(blocksRef, restoredBlock);
      
      // Delete the archived block
      await deleteDoc(blockDoc.ref);
    }
  }
  
  // Delete the archived page
  await deleteDoc(archivedPageRef);
  
  return newPageId;
};

export const restoreArchivedBlock = async (userId: string, archivedBlockId: string, targetPageId: string) => {
  const archivedBlockRef = doc(db, 'users', userId, 'archivedBlocks', archivedBlockId);
  const archivedBlockDoc = await getDoc(archivedBlockRef);
  
  if (!archivedBlockDoc.exists()) {
    throw new Error('Archived block not found');
  }
  
  const archivedBlockData = archivedBlockDoc.data() as ArchivedBlock;
  
  // Create the restored block in the target page
  const blocksRef = collection(db, 'users', userId, 'pages', targetPageId, 'blocks');
  const restoredBlock: Omit<Block, 'id'> = {
    type: archivedBlockData.type,
    content: archivedBlockData.content,
    indentLevel: archivedBlockData.indentLevel,
    isChecked: archivedBlockData.isChecked,
    order: archivedBlockData.order,
    createdAt: archivedBlockData.originalCreatedAt,
    updatedAt: Timestamp.now() as unknown as Date,
  };
  
  const blockDocRef = await addDoc(blocksRef, restoredBlock);
  
  // Delete the archived block
  await deleteDoc(archivedBlockRef);
  
  return blockDocRef.id;
};

export const permanentlyDeleteArchivedPage = async (userId: string, archivedPageId: string) => {
  const archivedPageRef = doc(db, 'users', userId, 'archivedPages', archivedPageId);
  const archivedPageDoc = await getDoc(archivedPageRef);
  
  if (!archivedPageDoc.exists()) {
    throw new Error('Archived page not found');
  }
  
  const archivedPageData = archivedPageDoc.data() as ArchivedPage;
  
  // Delete all archived blocks that belonged to this page
  const archivedBlocksRef = collection(db, 'users', userId, 'archivedBlocks');
  const blocksSnapshot = await getDocs(archivedBlocksRef);
  
  for (const blockDoc of blocksSnapshot.docs) {
    const blockData = blockDoc.data() as ArchivedBlock;
    if (blockData.pageId === archivedPageData.originalId) {
      await deleteDoc(blockDoc.ref);
    }
  }
  
  // Delete the archived page
  await deleteDoc(archivedPageRef);
};

export const permanentlyDeleteArchivedBlock = async (userId: string, archivedBlockId: string) => {
  const archivedBlockRef = doc(db, 'users', userId, 'archivedBlocks', archivedBlockId);
  await deleteDoc(archivedBlockRef);
};

export const flushAllArchived = async (userId: string) => {
  // Delete all archived pages
  const archivedPagesRef = collection(db, 'users', userId, 'archivedPages');
  const pagesSnapshot = await getDocs(archivedPagesRef);
  
  // Delete all archived blocks
  const archivedBlocksRef = collection(db, 'users', userId, 'archivedBlocks');
  const blocksSnapshot = await getDocs(archivedBlocksRef);
  
  const batch = writeBatch(db);
  
  pagesSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  blocksSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
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
