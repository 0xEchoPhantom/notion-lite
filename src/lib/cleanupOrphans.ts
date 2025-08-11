import { collection, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';

/**
 * Clean up orphaned block references that no longer exist
 * This helps prevent "Block not found" errors
 */
export async function cleanupOrphanedBlocks(userId: string) {
  console.log('Starting cleanup of orphaned blocks...');
  
  try {
    // Get all blocks from unified collection
    const blocksRef = collection(db, 'users', userId, 'blocks');
    const blocksSnapshot = await getDocs(blocksRef);
    
    const existingBlockIds = new Set(blocksSnapshot.docs.map(doc => doc.id));
    console.log(`Found ${existingBlockIds.size} blocks in unified collection`);
    
    // Check for orphaned task references
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const tasksSnapshot = await getDocs(tasksRef);
    
    let orphanedTasks = 0;
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      const blockId = taskData.blockId || taskDoc.id;
      
      if (!existingBlockIds.has(blockId)) {
        console.log(`Found orphaned task ${taskDoc.id} referencing non-existent block ${blockId}`);
        await deleteDoc(taskDoc.ref);
        orphanedTasks++;
      }
    }
    
    if (orphanedTasks > 0) {
      console.log(`Deleted ${orphanedTasks} orphaned task references`);
    }
    
    // Check for blocks in old locations that should be migrated
    const pagesRef = collection(db, 'users', userId, 'pages');
    const pagesSnapshot = await getDocs(pagesRef);
    
    let migratedBlocks = 0;
    for (const pageDoc of pagesSnapshot.docs) {
      const oldBlocksRef = collection(pageDoc.ref, 'blocks');
      const oldBlocksSnapshot = await getDocs(oldBlocksRef);
      
      if (oldBlocksSnapshot.size > 0) {
        console.log(`Found ${oldBlocksSnapshot.size} blocks in old location for page ${pageDoc.id}`);
        migratedBlocks += oldBlocksSnapshot.size;
      }
    }
    
    // Check GTD old locations
    const gtdRef = collection(db, 'users', userId, 'gtd');
    const gtdSnapshot = await getDocs(gtdRef);
    
    for (const gtdDoc of gtdSnapshot.docs) {
      const oldBlocksRef = collection(gtdDoc.ref, 'blocks');
      const oldBlocksSnapshot = await getDocs(oldBlocksRef);
      
      if (oldBlocksSnapshot.size > 0) {
        console.log(`Found ${oldBlocksSnapshot.size} blocks in old GTD location for ${gtdDoc.id}`);
        migratedBlocks += oldBlocksSnapshot.size;
      }
    }
    
    if (migratedBlocks > 0) {
      console.log(`Found ${migratedBlocks} blocks that need migration to unified collection`);
    }
    
    console.log('Cleanup completed');
    
    return {
      orphanedTasks,
      blocksNeedingMigration: migratedBlocks,
      totalBlocks: existingBlockIds.size
    };
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

/**
 * Verify block exists before operations
 */
export async function verifyBlockExists(userId: string, blockId: string): Promise<boolean> {
  try {
    // Check unified collection
    const blockRef = doc(db, 'users', userId, 'blocks', blockId);
    const blockDoc = await getDoc(blockRef);
    
    return blockDoc.exists();
  } catch (error) {
    console.error('Error verifying block existence:', error);
    return false;
  }
}