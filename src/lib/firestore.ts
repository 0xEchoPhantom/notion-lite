/**
 * Firestore v3.0 - Unified Schema Implementation
 * 
 * This is the final, clean implementation with:
 * - Single unified blocks collection at /users/{userId}/blocks
 * - taskMetadata embedded in blocks (no separate tasks collection)
 * - No fallback logic for old schema
 * - Clean, consistent API
 */

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
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  QueryConstraint,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Block, Page, ArchivedPage, ArchivedBlock, TaskMetadata } from '@/types/index';
import { updateTaskMetadataForPage } from '@/utils/gtdStatusMapper';
import { withRetry, isRetryableError } from '@/utils/retryUtils';

// ===== CONSTANTS =====
const GTD_PAGES = ['inbox', 'next-actions', 'waiting-for', 'someday-maybe'];
const DEFAULT_PAGE_SIZE = 50;

// ===== HELPER FUNCTIONS =====

/**
 * Normalizes pageId to include workspace prefix for GTD pages
 */
export const normalizePageId = (pageId: string): string => {
  if (GTD_PAGES.includes(pageId)) {
    return `gtd-${pageId}`;
  }
  return pageId;
};

/**
 * Gets the workspace ID for a page
 */
export const getWorkspaceId = (pageId: string): string => {
  // Notes mode disabled; treat non-gtd-prefixed IDs as user pages without notes workspace label
  if (pageId.startsWith('gtd-')) {
    return 'gtd';
  }
  return 'gtd';
};

// ===== PAGE OPERATIONS =====

export const createPage = async (userId: string, title: string): Promise<string> => {
  const pagesRef = collection(db, 'users', userId, 'pages');
  
  // Get max order
  const snapshot = await getDocs(pagesRef);
  const maxOrder = snapshot.docs.reduce((max, doc) => 
    Math.max(max, doc.data().order || 0), 0
  );
  
  const docRef = await addDoc(pagesRef, {
    title,
    order: maxOrder + 1,
    // Notes mode disabled; omit or set to gtd-neutral value
    workspaceId: 'gtd',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  return docRef.id;
};

export const getPages = async (userId: string): Promise<Page[]> => {
  const pagesRef = collection(db, 'users', userId, 'pages');
  const q = query(pagesRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Page[];
};

export const updatePageTitle = async (
  userId: string, 
  pageId: string, 
  title: string
): Promise<void> => {
  const pageRef = doc(db, 'users', userId, 'pages', pageId);
  await updateDoc(pageRef, {
    title,
    updatedAt: Timestamp.now(),
  });
};

export const deletePage = async (userId: string, pageId: string): Promise<void> => {
  // Delete all blocks for this page
  const blocksRef = collection(db, 'users', userId, 'blocks');
  const q = query(blocksRef, where('pageId', '==', normalizePageId(pageId)));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  // Delete the page
  const pageRef = doc(db, 'users', userId, 'pages', pageId);
  batch.delete(pageRef);
  
  await batch.commit();
};

// ===== BLOCK OPERATIONS =====

export const createBlock = async (
  userId: string,
  pageId: string,
  block: Omit<Block, 'id' | 'createdAt' | 'updatedAt' | 'pageId' | 'workspaceId'>
): Promise<string> => {
  const normalizedPageId = normalizePageId(pageId);
  const workspaceId = getWorkspaceId(normalizedPageId);
  
  const blocksRef = collection(db, 'users', userId, 'blocks');
  
  const blockData = {
    ...block,
    pageId: normalizedPageId,
    workspaceId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // Clean undefined values
  const cleanBlock = Object.fromEntries(
    Object.entries(blockData).filter(([, v]) => v !== undefined)
  );
  
  const docRef = await addDoc(blocksRef, cleanBlock);
  return docRef.id;
};

// Main updateBlock function
export const updateBlockById = async (
  userId: string,
  blockId: string,
  updates: Partial<Block>
): Promise<void> => {
  const blockRef = doc(db, 'users', userId, 'blocks', blockId);
  
  // Deep clean to remove undefined values
  const deepClean = (obj: unknown): unknown => {
    if (obj === null || obj === undefined) return undefined;
    if (obj instanceof Date || obj instanceof Timestamp) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClean).filter(v => v !== undefined);
    
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const cleanValue = deepClean(value);
      if (cleanValue !== undefined) {
        cleaned[key] = cleanValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  };
  
  const cleanUpdates = deepClean({
    ...updates,
    updatedAt: Timestamp.now(),
  });
  
  await updateDoc(blockRef, cleanUpdates as Record<string, unknown>);
};

// Backward compatibility with old signature (pageId was ignored anyway)
export const updateBlock = async (
  userId: string,
  pageId: string,
  blockId: string,
  updates: Partial<Block>
): Promise<void> => {
  return updateBlockById(userId, blockId, updates);
};

// Main deleteBlock function
export const deleteBlockById = async (
  userId: string,
  blockId: string
): Promise<void> => {
  const blockRef = doc(db, 'users', userId, 'blocks', blockId);
  await deleteDoc(blockRef);
};

// Backward compatibility with old signature
export const deleteBlock = async (
  userId: string,
  pageId: string,
  blockId: string
): Promise<void> => {
  return deleteBlockById(userId, blockId);
};

// Main getBlocks function with pagination support
export const getBlocksPaginated = async (
  userId: string,
  pageId: string,
  pageSize: number = DEFAULT_PAGE_SIZE,
  lastDoc?: DocumentSnapshot
): Promise<{ blocks: Block[]; lastDoc?: DocumentSnapshot }> => {
  const normalizedPageId = normalizePageId(pageId);
  const blocksRef = collection(db, 'users', userId, 'blocks');
  
  const constraints: QueryConstraint[] = [
    where('pageId', '==', normalizedPageId),
    orderBy('order', 'asc'),
    limit(pageSize)
  ];
  
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }
  
  const q = query(blocksRef, ...constraints);
  const snapshot = await getDocs(q);
  
  const blocks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    taskMetadata: doc.data().taskMetadata ? {
      ...doc.data().taskMetadata,
      dueDate: doc.data().taskMetadata.dueDate?.toDate(),
      completedAt: doc.data().taskMetadata.completedAt?.toDate(),
      promotedToNextAt: doc.data().taskMetadata.promotedToNextAt?.toDate(),
    } : undefined,
  })) as Block[];
  
  return {
    blocks,
    lastDoc: snapshot.docs[snapshot.docs.length - 1]
  };
};

// Simplified getBlocks for backward compatibility
export const getBlocks = async (
  userId: string,
  pageId: string
): Promise<Block[]> => {
  const result = await getBlocksPaginated(userId, pageId);
  return result.blocks;
};

export const subscribeToBlocks = (
  userId: string,
  pageId: string,
  callback: (blocks: Block[]) => void
): (() => void) => {
  const normalizedPageId = normalizePageId(pageId);
  const blocksRef = collection(db, 'users', userId, 'blocks');
  const q = query(
    blocksRef,
    where('pageId', '==', normalizedPageId),
    orderBy('order', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const blocks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      taskMetadata: doc.data().taskMetadata ? {
        ...doc.data().taskMetadata,
        dueDate: doc.data().taskMetadata.dueDate?.toDate(),
        completedAt: doc.data().taskMetadata.completedAt?.toDate(),
        promotedToNextAt: doc.data().taskMetadata.promotedToNextAt?.toDate(),
      } : undefined,
    })) as Block[];
    
    callback(blocks);
  });
};

export const reorderBlocks = async (
  userId: string,
  updates: { id: string; order: number }[]
): Promise<void> => {
  const batch = writeBatch(db);
  
  updates.forEach(({ id, order }) => {
    const blockRef = doc(db, 'users', userId, 'blocks', id);
    batch.update(blockRef, {
      order,
      updatedAt: Timestamp.now(),
    });
  });
  
  await batch.commit();
};

// ===== TASK OPERATIONS (using blocks with taskMetadata) =====

export const getTodoBlocks = async (
  userId: string,
  filters?: {
    status?: string;
    assignee?: string;
    hasValue?: boolean;
    pageId?: string;
  }
): Promise<Block[]> => {
  const blocksRef = collection(db, 'users', userId, 'blocks');
  const constraints: QueryConstraint[] = [
    where('type', '==', 'todo-list')
  ];
  
  if (filters?.pageId) {
    constraints.push(where('pageId', '==', normalizePageId(filters.pageId)));
  }
  
  const q = query(blocksRef, ...constraints);
  const snapshot = await getDocs(q);
  
  let blocks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    taskMetadata: doc.data().taskMetadata ? {
      ...doc.data().taskMetadata,
      dueDate: doc.data().taskMetadata.dueDate?.toDate(),
      completedAt: doc.data().taskMetadata.completedAt?.toDate(),
      promotedToNextAt: doc.data().taskMetadata.promotedToNextAt?.toDate(),
    } : undefined,
  })) as Block[];
  
  // Client-side filtering for complex queries
  if (filters?.status) {
    blocks = blocks.filter(b => b.taskMetadata?.status === filters.status);
  }
  if (filters?.assignee) {
    blocks = blocks.filter(b => b.taskMetadata?.assignee === filters.assignee);
  }
  if (filters?.hasValue) {
    blocks = blocks.filter(b => (b.taskMetadata?.value || 0) > 0);
  }
  
  // Sort by ROI if value is present
  blocks.sort((a, b) => {
    const roiA = (a.taskMetadata?.value || 0) / (a.taskMetadata?.effort || 1);
    const roiB = (b.taskMetadata?.value || 0) / (b.taskMetadata?.effort || 1);
    return roiB - roiA;
  });
  
  return blocks;
};

// Real-time subscription to todo blocks for Smart View
export const subscribeToTodoBlocks = (
  userId: string,
  callback: (blocks: Block[]) => void,
  filters?: {
    status?: string;
    assignee?: string;
    hasValue?: boolean;
    pageId?: string;
  }
): (() => void) => {
  const blocksRef = collection(db, 'users', userId, 'blocks');
  const constraints: QueryConstraint[] = [
    where('type', '==', 'todo-list')
  ];
  
  if (filters?.pageId) {
    constraints.push(where('pageId', '==', normalizePageId(filters.pageId)));
  }
  
  const q = query(blocksRef, ...constraints);
  
  return onSnapshot(q, (snapshot) => {
    let blocks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      taskMetadata: doc.data().taskMetadata ? {
        ...doc.data().taskMetadata,
        dueDate: doc.data().taskMetadata.dueDate?.toDate(),
        completedAt: doc.data().taskMetadata.completedAt?.toDate(),
        promotedToNextAt: doc.data().taskMetadata.promotedToNextAt?.toDate(),
      } : undefined,
    })) as Block[];
    
    // Client-side filtering for complex queries
    if (filters?.status) {
      blocks = blocks.filter(b => b.taskMetadata?.status === filters.status);
    }
    if (filters?.assignee) {
      blocks = blocks.filter(b => b.taskMetadata?.assignee === filters.assignee);
    }
    if (filters?.hasValue) {
      blocks = blocks.filter(b => (b.taskMetadata?.value || 0) > 0);
    }
    
    // Sort by ROI if value is present
    blocks.sort((a, b) => {
      const roiA = (a.taskMetadata?.value || 0) / (a.taskMetadata?.effort || 1);
      const roiB = (b.taskMetadata?.value || 0) / (b.taskMetadata?.effort || 1);
      return roiB - roiA;
    });
    
    callback(blocks);
  });
};

export const updateTaskMetadata = async (
  userId: string,
  blockId: string,
  taskMetadata: Partial<TaskMetadata>
): Promise<void> => {
  const blockRef = doc(db, 'users', userId, 'blocks', blockId);
  
  // Get current block to merge metadata
  const blockDoc = await getDoc(blockRef);
  if (!blockDoc.exists()) {
    console.warn(`Block ${blockId} not found when updating task metadata`);
    return; // Silently return instead of throwing error
  }
  
  const currentMetadata = blockDoc.data().taskMetadata || {};
  const updatedMetadata = {
    ...currentMetadata,
    ...taskMetadata,
    // Calculate ROI if value or effort changed
    roi: taskMetadata.value !== undefined || taskMetadata.effort !== undefined
      ? ((taskMetadata.value ?? currentMetadata.value ?? 0) / 
         (taskMetadata.effort ?? currentMetadata.effort ?? 1))
      : currentMetadata.roi
  };
  
  await updateDoc(blockRef, {
    taskMetadata: updatedMetadata,
    // Update isChecked if status changes to done
    ...(taskMetadata.status === 'done' ? { isChecked: true } : {}),
    ...(taskMetadata.status && taskMetadata.status !== 'done' ? { isChecked: false } : {}),
    updatedAt: Timestamp.now(),
  });
};

// ===== ARCHIVE OPERATIONS =====

// Main archiveBlock function
export const archiveBlockById = async (
  userId: string,
  blockId: string
): Promise<void> => {
  const blockRef = doc(db, 'users', userId, 'blocks', blockId);
  const blockDoc = await getDoc(blockRef);
  
  if (!blockDoc.exists()) {
    // Block already deleted, likely from rapid deletion - silently return
    console.log(`Block ${blockId} already deleted, skipping archive`);
    return;
  }
  
  const blockData = blockDoc.data() as Block;
  
  // Get page title
  let pageTitle = 'Unknown Page';
  if (blockData.pageId?.startsWith('gtd-')) {
    const gtdTitles: Record<string, string> = {
      'gtd-inbox': '📥 Inbox',
      'gtd-next-actions': '⚡ Next Actions',
      'gtd-waiting-for': '⏳ Waiting For',
      'gtd-someday-maybe': '💭 Someday/Maybe'
    };
    pageTitle = gtdTitles[blockData.pageId] || blockData.pageId;
  } else if (blockData.pageId) {
    const pageRef = doc(db, 'users', userId, 'pages', blockData.pageId);
    const pageDoc = await getDoc(pageRef);
    if (pageDoc.exists()) {
      pageTitle = pageDoc.data().title || 'Unknown Page';
    }
  }
  
  // Create archived block
  const archivedBlocksRef = collection(db, 'users', userId, 'archivedBlocks');
  await addDoc(archivedBlocksRef, {
    originalId: blockId,
    pageId: blockData.pageId,
    pageTitle,
    type: blockData.type,
    content: blockData.content || '',
    indentLevel: blockData.indentLevel || 0,
    isChecked: blockData.isChecked || false,
    order: blockData.order || 0,
    taskMetadata: blockData.taskMetadata || null,
    archivedAt: Timestamp.now(),
    originalCreatedAt: blockData.createdAt,
    originalUpdatedAt: blockData.updatedAt,
  });
  
  // Delete original
  await deleteDoc(blockRef);
};

// Backward compatibility with old signature
export const archiveBlock = async (
  userId: string,
  pageId: string,
  blockId: string
): Promise<void> => {
  return archiveBlockById(userId, blockId);
};

export const archivePage = async (
  userId: string,
  pageId: string
): Promise<void> => {
  const pageRef = doc(db, 'users', userId, 'pages', pageId);
  const pageDoc = await getDoc(pageRef);
  
  if (!pageDoc.exists()) {
    throw new Error('Page not found');
  }
  
  const pageData = pageDoc.data() as Page;
  
  // Archive all blocks first
  const blocksRef = collection(db, 'users', userId, 'blocks');
  const q = query(blocksRef, where('pageId', '==', pageId));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  
  // Archive each block
  for (const blockDoc of snapshot.docs) {
    const blockData = blockDoc.data() as Block;
    const archivedBlockRef = doc(collection(db, 'users', userId, 'archivedBlocks'));
    batch.set(archivedBlockRef, {
      originalId: blockDoc.id,
      pageId: pageId,
      pageTitle: pageData.title,
      type: blockData.type,
      content: blockData.content || '',
      indentLevel: blockData.indentLevel || 0,
      isChecked: blockData.isChecked || false,
      order: blockData.order || 0,
      taskMetadata: blockData.taskMetadata || null,
      archivedAt: Timestamp.now(),
      originalCreatedAt: blockData.createdAt,
      originalUpdatedAt: blockData.updatedAt,
    });
    batch.delete(blockDoc.ref);
  }
  
  // Archive the page
  const archivedPageRef = doc(collection(db, 'users', userId, 'archivedPages'));
  batch.set(archivedPageRef, {
    originalId: pageId,
    title: pageData.title,
    order: pageData.order,
  workspaceId: pageData.workspaceId || 'gtd',
    archivedAt: Timestamp.now(),
    originalCreatedAt: pageData.createdAt,
    originalUpdatedAt: pageData.updatedAt,
  });
  
  // Delete the page
  batch.delete(pageRef);
  
  await batch.commit();
};

export const getArchivedPages = async (userId: string): Promise<ArchivedPage[]> => {
  const archivedPagesRef = collection(db, 'users', userId, 'archivedPages');
  const q = query(archivedPagesRef, orderBy('archivedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    archivedAt: doc.data().archivedAt?.toDate() || new Date(),
    originalCreatedAt: doc.data().originalCreatedAt?.toDate() || new Date(),
    originalUpdatedAt: doc.data().originalUpdatedAt?.toDate() || new Date(),
  })) as ArchivedPage[];
};

export const getArchivedBlocks = async (userId: string): Promise<ArchivedBlock[]> => {
  const archivedBlocksRef = collection(db, 'users', userId, 'archivedBlocks');
  const q = query(archivedBlocksRef, orderBy('archivedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    archivedAt: doc.data().archivedAt?.toDate() || new Date(),
    originalCreatedAt: doc.data().originalCreatedAt?.toDate() || new Date(),
    originalUpdatedAt: doc.data().originalUpdatedAt?.toDate() || new Date(),
  })) as ArchivedBlock[];
};

// ===== CROSS-PAGE OPERATIONS =====

// Helper function to get the next order number for a page (always append to end)
const getNextOrderForPage = async (userId: string, pageId: string): Promise<number> => {
  const normalizedPageId = normalizePageId(pageId);
  const blocksRef = collection(db, 'users', userId, 'blocks');
  const q = query(
    blocksRef, 
    where('pageId', '==', normalizedPageId),
    orderBy('order', 'desc'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return 0; // First block on the page
  }
  
  const lastBlock = snapshot.docs[0].data();
  return (lastBlock.order || 0) + 1;
};

// Internal function for moving blocks
const _moveBlockToPage = async (
  userId: string,
  fromPageId: string,
  toPageId: string,
  blockId: string,
  newOrder?: number // Make this optional since we'll calculate it
): Promise<Block | null> => {
  const blockRef = doc(db, 'users', userId, 'blocks', blockId);
  const blockDoc = await getDoc(blockRef);
  
  if (!blockDoc.exists()) {
    console.warn(`Block ${blockId} not found`);
    return null;
  }
  
  const blockData = blockDoc.data() as Block;
  const normalizedToPageId = normalizePageId(toPageId);
  const workspaceId = getWorkspaceId(normalizedToPageId);
  
  // Always append to the end of the destination page
  const calculatedOrder = newOrder !== undefined ? newOrder : await getNextOrderForPage(userId, toPageId);
  
  // Prepare updates
  const updates: Record<string, unknown> = {
    pageId: normalizedToPageId,
    workspaceId,
    order: calculatedOrder,
    updatedAt: Timestamp.now(),
  };
  
  // For todo-list blocks, update status based on target GTD page
  if (blockData.type === 'todo-list') {
    const updatedTaskMetadata = updateTaskMetadataForPage(
      blockData.taskMetadata,
      toPageId, // Use original toPageId (not normalized) for status mapping
      {
        preserveCompleted: true, // Keep 'done' status when moving
        forceUpdate: true        // DO update status when moving to a different page
      }
    );
    updates.taskMetadata = updatedTaskMetadata;
  }
  
  await updateDoc(blockRef, updates);
  
  const updatedDoc = await getDoc(blockRef);
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
    createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
    updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
    taskMetadata: updatedDoc.data()?.taskMetadata ? {
      ...updatedDoc.data()?.taskMetadata,
      dueDate: updatedDoc.data()?.taskMetadata?.dueDate?.toDate(),
      completedAt: updatedDoc.data()?.taskMetadata?.completedAt?.toDate(),
      promotedToNextAt: updatedDoc.data()?.taskMetadata?.promotedToNextAt?.toDate(),
    } : undefined,
  } as Block;
};

// Public function with retry logic for moving blocks
export const moveBlockToPage = async (
  userId: string,
  fromPageId: string,
  toPageId: string,
  blockId: string,
  newOrder?: number
): Promise<Block | null> => {
  return withRetry(
    () => _moveBlockToPage(userId, fromPageId, toPageId, blockId, newOrder),
    {
      maxRetries: 3,
      initialDelay: 500,
      onRetry: (attempt, error) => {
        console.warn(`[moveBlockToPage] Retry attempt ${attempt} for block ${blockId}:`, error);
        
        // Only retry if it's a retryable error
        if (!isRetryableError(error)) {
          throw error; // Stop retrying for non-retryable errors
        }
      }
    }
  );
};

// Move multiple blocks to a new page atomically (for parent with children)
export const moveBlocksToPage = async (
  userId: string,
  fromPageId: string,
  toPageId: string,
  blockIds: string[]
): Promise<Block[]> => {
  if (blockIds.length === 0) return [];
  
  console.log(`[moveBlocksToPage] Moving ${blockIds.length} blocks from ${fromPageId} to ${toPageId}`);
  
  // Normalize page IDs
  const normalizedToPageId = normalizePageId(toPageId);
  const normalizedFromPageId = normalizePageId(fromPageId);
  
  console.log(`[moveBlocksToPage] Normalized: from ${normalizedFromPageId} to ${normalizedToPageId}`);
  
  const batch = writeBatch(db);
  const results: Block[] = [];
  const now = new Date();
  
  // Get the next order for the target page (getNextOrderForPage already normalizes internally)
  let nextOrder = await getNextOrderForPage(userId, toPageId);
  
  // Prepare all block updates in batch
  for (const blockId of blockIds) {
    const blockRef = doc(db, 'users', userId, 'blocks', blockId);
    const blockDoc = await getDoc(blockRef);
    
    if (!blockDoc.exists()) {
      console.warn(`Block ${blockId} not found`);
      continue;
    }
    
    const blockData = blockDoc.data();
    
    // Update the block with new pageId (normalized) and order
    const updates = {
      pageId: normalizedToPageId, // Use normalized page ID
      order: nextOrder,
      updatedAt: Timestamp.now(), // Use Firestore Timestamp
      // Update task metadata if it's a GTD page
      ...(blockData.type === 'todo-list' && {
        taskMetadata: updateTaskMetadataForPage(blockData.taskMetadata, toPageId) // Use original for status mapping
      })
    };
    
    batch.update(blockRef, updates);
    
    // Add to results for return
    results.push({
      id: blockId,
      ...blockData,
      ...updates,
      createdAt: blockData.createdAt?.toDate() || now,
      updatedAt: now,
      taskMetadata: updates.taskMetadata || blockData.taskMetadata
    } as Block);
    
    nextOrder += 1000;
  }
  
  // Execute all updates atomically
  try {
    if (results.length > 0) {
      await batch.commit();
      console.log(`[moveBlocksToPage] Successfully moved ${results.length} blocks to page ${normalizedToPageId}`);
    } else {
      console.warn('[moveBlocksToPage] No blocks to move');
    }
    return results;
  } catch (error) {
    console.error('[moveBlocksToPage] Batch commit failed:', error);
    console.error('Failed to move blocks:', blockIds);
    throw error;
  }
};

// ===== EXPORT ALL FUNCTIONS ======
const firestoreExports = {
  // Helpers
  normalizePageId,
  getWorkspaceId,
  
  // Pages
  createPage,
  getPages,
  updatePageTitle,
  deletePage,
  
  // Blocks
  createBlock,
  updateBlock,
  deleteBlock,
  getBlocks,
  subscribeToBlocks,
  reorderBlocks,
  
  // Tasks (using blocks)
  getTodoBlocks,
  subscribeToTodoBlocks,
  updateTaskMetadata,
  
  // Archive
  archiveBlock,
  archivePage,
  getArchivedPages,
  getArchivedBlocks,
  
  // Cross-page
  moveBlockToPage,
  moveBlocksToPage,
};

export default firestoreExports;