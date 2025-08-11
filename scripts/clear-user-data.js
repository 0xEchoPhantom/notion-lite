// Script to clear all data for a specific user
// Usage: node scripts/clear-user-data.js

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearUserData(email) {
  try {
    console.log(`Starting data cleanup for: ${email}`);
    
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;
    console.log(`Found user with ID: ${userId}`);
    
    // Function to delete all documents in a collection
    async function deleteCollection(collectionRef, batchSize = 100) {
      const query = collectionRef.limit(batchSize);
      const snapshot = await query.get();
      
      if (snapshot.size === 0) {
        return 0;
      }
      
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      if (snapshot.size === batchSize) {
        // Recurse on next batch
        return snapshot.size + await deleteCollection(collectionRef, batchSize);
      } else {
        return snapshot.size;
      }
    }
    
    // Delete all subcollections for the user
    const userRef = db.collection('users').doc(userId);
    
    // Delete pages collection
    console.log('Deleting pages...');
    const pagesDeleted = await deleteCollection(userRef.collection('pages'));
    console.log(`Deleted ${pagesDeleted} pages`);
    
    // Delete blocks in all pages
    console.log('Deleting blocks...');
    const pagesSnapshot = await userRef.collection('pages').get();
    let blocksDeleted = 0;
    for (const pageDoc of pagesSnapshot.docs) {
      const deleted = await deleteCollection(pageDoc.ref.collection('blocks'));
      blocksDeleted += deleted;
    }
    console.log(`Deleted ${blocksDeleted} blocks`);
    
    // Delete tasks
    console.log('Deleting tasks...');
    const tasksDeleted = await deleteCollection(userRef.collection('tasks'));
    console.log(`Deleted ${tasksDeleted} tasks`);
    
    // Delete workspaces
    console.log('Deleting workspaces...');
    const workspacesSnapshot = await userRef.collection('workspaces').get();
    for (const workspaceDoc of workspacesSnapshot.docs) {
      // Delete pages in workspace
      const workspacePagesDeleted = await deleteCollection(workspaceDoc.ref.collection('pages'));
      console.log(`Deleted ${workspacePagesDeleted} pages in workspace ${workspaceDoc.id}`);
      
      // Delete the workspace document itself
      await workspaceDoc.ref.delete();
    }
    
    // Delete archived items
    console.log('Deleting archived items...');
    const archivedPagesDeleted = await deleteCollection(userRef.collection('archivedPages'));
    console.log(`Deleted ${archivedPagesDeleted} archived pages`);
    
    const archivedBlocksDeleted = await deleteCollection(userRef.collection('archivedBlocks'));
    console.log(`Deleted ${archivedBlocksDeleted} archived blocks`);
    
    // Delete settings
    console.log('Deleting settings...');
    const settingsDeleted = await deleteCollection(userRef.collection('settings'));
    console.log(`Deleted ${settingsDeleted} settings documents`);
    
    // Delete the user document itself (if it exists)
    console.log('Deleting user document...');
    await userRef.delete();
    
    console.log(`\n✅ Successfully cleared all data for ${email}`);
    console.log('The user account still exists and can log in again with fresh data.');
    
  } catch (error) {
    console.error('Error clearing user data:', error);
    process.exit(1);
  }
}

// Check if email is provided
const email = 'admin@dev.com'; // Hardcoded for safety

if (email !== 'admin@dev.com') {
  console.error('⚠️  This script is currently hardcoded to only work with admin@dev.com');
  console.error('To clear data for another user, please modify the script directly.');
  process.exit(1);
}

// Confirm before proceeding
console.log('⚠️  WARNING: This will delete ALL data for the user:', email);
console.log('The user account will remain but all their data will be removed.');
console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');

setTimeout(() => {
  clearUserData(email).then(() => {
    console.log('\nDone!');
    process.exit(0);
  });
}, 5000);