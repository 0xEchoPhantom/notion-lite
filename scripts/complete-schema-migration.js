#!/usr/bin/env node

/**
 * Complete Schema Migration Script
 * This script performs a complete migration to the unified schema v3.0:
 * 1. Migrates all blocks to unified collection
 * 2. Removes task duplication (deletes tasks collection)
 * 3. Ensures taskMetadata is the single source of truth
 * 4. Cleans up legacy collections
 * 5. Removes orphaned data
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migrateUserToUnifiedSchema(userId, userEmail) {
  console.log(`\n📦 Migrating user: ${userEmail} (${userId})`);
  
  const stats = {
    blocksMigrated: 0,
    tasksMigrated: 0,
    tasksDeleted: 0,
    legacyDeleted: 0,
    errors: []
  };

  try {
    const userRef = db.collection('users').doc(userId);
    
    // Step 1: Migrate blocks from old locations to unified collection
    console.log('  → Migrating blocks from legacy locations...');
    
    // Migrate from pages/{pageId}/blocks
    const pagesSnapshot = await userRef.collection('pages').get();
    for (const pageDoc of pagesSnapshot.docs) {
      const pageBlocksSnapshot = await pageDoc.ref.collection('blocks').get();
      
      for (const blockDoc of pageBlocksSnapshot.docs) {
        const blockData = blockDoc.data();
        const unifiedBlockRef = userRef.collection('blocks').doc(blockDoc.id);
        
        // Check if already exists in unified location
        const existingDoc = await unifiedBlockRef.get();
        if (!existingDoc.exists) {
          // Normalize the data structure
          const normalizedBlock = {
            ...blockData,
            id: blockDoc.id,
            pageId: pageDoc.id,
            workspaceId: 'notes',
            // Normalize field names
            indentLevel: blockData.indentLevel || blockData.indent || 0,
            isChecked: blockData.isChecked ?? blockData.completed ?? false,
            order: blockData.order || 0,
            createdAt: blockData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Remove old field names
          delete normalizedBlock.indent;
          delete normalizedBlock.completed;
          delete normalizedBlock.authorId;
          
          await unifiedBlockRef.set(normalizedBlock);
          stats.blocksMigrated++;
        }
        
        // Delete from old location
        await blockDoc.ref.delete();
        stats.legacyDeleted++;
      }
    }
    
    // Migrate from gtd/{pageId}/blocks
    const gtdSnapshot = await userRef.collection('gtd').get();
    for (const gtdDoc of gtdSnapshot.docs) {
      const gtdBlocksSnapshot = await gtdDoc.ref.collection('blocks').get();
      
      for (const blockDoc of gtdBlocksSnapshot.docs) {
        const blockData = blockDoc.data();
        const unifiedBlockRef = userRef.collection('blocks').doc(blockDoc.id);
        
        // Check if already exists
        const existingDoc = await unifiedBlockRef.get();
        if (!existingDoc.exists) {
          const normalizedBlock = {
            ...blockData,
            id: blockDoc.id,
            pageId: gtdDoc.id,
            workspaceId: 'gtd',
            indentLevel: blockData.indentLevel || blockData.indent || 0,
            isChecked: blockData.isChecked ?? blockData.completed ?? false,
            order: blockData.order || 0,
            createdAt: blockData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          delete normalizedBlock.indent;
          delete normalizedBlock.completed;
          delete normalizedBlock.authorId;
          
          await unifiedBlockRef.set(normalizedBlock);
          stats.blocksMigrated++;
        }
        
        // Delete from old location
        await blockDoc.ref.delete();
        stats.legacyDeleted++;
      }
    }
    
    // Step 2: Migrate task data to taskMetadata in blocks
    console.log('  → Migrating tasks to taskMetadata in blocks...');
    
    const tasksSnapshot = await userRef.collection('tasks').get();
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      const blockId = taskData.blockId || taskDoc.id;
      
      // Find the corresponding block
      const blockRef = userRef.collection('blocks').doc(blockId);
      const blockDoc = await blockRef.get();
      
      if (blockDoc.exists) {
        const blockData = blockDoc.data();
        
        // Only update todo-list blocks
        if (blockData.type === 'todo-list') {
          // Create comprehensive taskMetadata from task data
          const taskMetadata = {
            status: taskData.status || 'someday',
            value: taskData.value || 0,
            effort: taskData.effort || 1,
            roi: taskData.value && taskData.effort ? taskData.value / taskData.effort : 0,
            dueDate: taskData.dueDate || null,
            assignee: taskData.assignee || null,
            company: taskData.company || null,
            completedAt: taskData.completedAt || null,
            subtaskIds: taskData.subtaskIds || [],
            parentTaskId: taskData.parentTaskId || null
          };
          
          // Update block with taskMetadata
          await blockRef.update({
            taskMetadata,
            isChecked: taskData.isCompleted || false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          stats.tasksMigrated++;
        }
      }
      
      // Delete the task document (no longer needed)
      await taskDoc.ref.delete();
      stats.tasksDeleted++;
    }
    
    // Step 3: Delete taskEvents collection (will be recreated from blocks if needed)
    console.log('  → Cleaning up taskEvents...');
    const taskEventsSnapshot = await userRef.collection('taskEvents').get();
    const batch = db.batch();
    let batchCount = 0;
    
    taskEventsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      batchCount++;
      
      if (batchCount === 500) {
        batch.commit();
        batchCount = 0;
      }
    });
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // Step 4: Clean up empty gtd and pages subcollections
    console.log('  → Cleaning up empty collections...');
    
    // Delete empty gtd documents
    for (const gtdDoc of gtdSnapshot.docs) {
      const blocksCount = (await gtdDoc.ref.collection('blocks').get()).size;
      if (blocksCount === 0) {
        await gtdDoc.ref.delete();
      }
    }
    
    // Keep pages documents but ensure blocks subcollection is gone
    for (const pageDoc of pagesSnapshot.docs) {
      // Blocks already deleted above, just verify
      const blocksCount = (await pageDoc.ref.collection('blocks').get()).size;
      if (blocksCount > 0) {
        console.warn(`    ⚠️ Page ${pageDoc.id} still has ${blocksCount} blocks!`);
      }
    }
    
    console.log(`  ✅ Migration complete for ${userEmail}`);
    console.log(`     - Blocks migrated: ${stats.blocksMigrated}`);
    console.log(`     - Tasks migrated to metadata: ${stats.tasksMigrated}`);
    console.log(`     - Tasks deleted: ${stats.tasksDeleted}`);
    console.log(`     - Legacy documents deleted: ${stats.legacyDeleted}`);
    
  } catch (error) {
    console.error(`  ❌ Error migrating ${userEmail}:`, error);
    stats.errors.push(error.message);
  }
  
  return stats;
}

async function main() {
  console.log('🚀 Complete Schema Migration Script');
  console.log('====================================');
  console.log('This script will:');
  console.log('1. Migrate all blocks to unified collection');
  console.log('2. Convert tasks to taskMetadata in blocks');
  console.log('3. Delete the tasks collection');
  console.log('4. Clean up legacy collections');
  console.log('5. Normalize all data structures');
  console.log('');
  
  const mode = await question('Run for (1) all users or (2) specific user? [1/2]: ');
  
  let usersToMigrate = [];
  
  if (mode === '2') {
    const email = await question('Enter user email: ');
    try {
      const userRecord = await auth.getUserByEmail(email);
      usersToMigrate.push({
        uid: userRecord.uid,
        email: userRecord.email
      });
    } catch (error) {
      console.error('User not found:', error.message);
      process.exit(1);
    }
  } else {
    // Get all users
    const listUsersResult = await auth.listUsers(1000);
    usersToMigrate = listUsersResult.users.map(u => ({
      uid: u.uid,
      email: u.email || 'no-email'
    }));
  }
  
  console.log(`\nFound ${usersToMigrate.length} users to migrate`);
  const confirm = await question('Proceed with migration? [y/N]: ');
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('Migration cancelled');
    process.exit(0);
  }
  
  const totalStats = {
    usersProcessed: 0,
    totalBlocksMigrated: 0,
    totalTasksMigrated: 0,
    totalTasksDeleted: 0,
    totalLegacyDeleted: 0,
    errors: []
  };
  
  for (const user of usersToMigrate) {
    const stats = await migrateUserToUnifiedSchema(user.uid, user.email);
    
    totalStats.usersProcessed++;
    totalStats.totalBlocksMigrated += stats.blocksMigrated;
    totalStats.totalTasksMigrated += stats.tasksMigrated;
    totalStats.totalTasksDeleted += stats.tasksDeleted;
    totalStats.totalLegacyDeleted += stats.legacyDeleted;
    
    if (stats.errors.length > 0) {
      totalStats.errors.push({
        user: user.email,
        errors: stats.errors
      });
    }
  }
  
  console.log('\n========================================');
  console.log('📊 Migration Summary');
  console.log('========================================');
  console.log(`Users processed: ${totalStats.usersProcessed}`);
  console.log(`Blocks migrated: ${totalStats.totalBlocksMigrated}`);
  console.log(`Tasks migrated to metadata: ${totalStats.totalTasksMigrated}`);
  console.log(`Task documents deleted: ${totalStats.totalTasksDeleted}`);
  console.log(`Legacy documents deleted: ${totalStats.totalLegacyDeleted}`);
  
  if (totalStats.errors.length > 0) {
    console.log('\n⚠️ Errors encountered:');
    totalStats.errors.forEach(e => {
      console.log(`  - ${e.user}: ${e.errors.join(', ')}`);
    });
  }
  
  console.log('\n✅ Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Update the codebase to remove TaskMirrorService');
  console.log('2. Remove all fallback logic for old schema');
  console.log('3. Update type definitions to use single Block interface');
  console.log('4. Test the application thoroughly');
  
  rl.close();
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});