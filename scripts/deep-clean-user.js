const admin = require('firebase-admin');

// Check if service account exists
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  try {
    serviceAccount = require('../serviceAccount.json');
  } catch (error2) {
    console.error('❌ serviceAccountKey.json or serviceAccount.json not found!');
    process.exit(1);
  }
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findAllBlocksForUser(userId) {
  console.log(`\n🔍 DEEP SEARCH for all blocks belonging to user: ${userId}`);
  console.log('=' + '='.repeat(60));
  
  const foundBlocks = [];
  
  try {
    const userRef = db.collection('users').doc(userId);
    
    // 1. Check unified blocks collection
    console.log('\n📁 Checking unified blocks collection...');
    const blocksRef = userRef.collection('blocks');
    const blocksSnapshot = await blocksRef.get();
    if (!blocksSnapshot.empty) {
      console.log(`   Found ${blocksSnapshot.size} blocks in /users/${userId}/blocks`);
      blocksSnapshot.forEach(doc => {
        foundBlocks.push({
          path: `users/${userId}/blocks/${doc.id}`,
          id: doc.id,
          data: doc.data()
        });
      });
    }
    
    // 2. Check pages/*/blocks
    console.log('\n📁 Checking pages subcollections...');
    const pagesSnapshot = await userRef.collection('pages').get();
    for (const pageDoc of pagesSnapshot.docs) {
      const pageBlocksRef = pageDoc.ref.collection('blocks');
      const pageBlocksSnapshot = await pageBlocksRef.get();
      if (!pageBlocksSnapshot.empty) {
        console.log(`   Found ${pageBlocksSnapshot.size} blocks in pages/${pageDoc.id}/blocks`);
        pageBlocksSnapshot.forEach(doc => {
          foundBlocks.push({
            path: `users/${userId}/pages/${pageDoc.id}/blocks/${doc.id}`,
            id: doc.id,
            data: doc.data()
          });
        });
      }
    }
    
    // 3. Check gtd/*/blocks
    console.log('\n📁 Checking GTD subcollections...');
    const gtdSnapshot = await userRef.collection('gtd').get();
    for (const gtdDoc of gtdSnapshot.docs) {
      const gtdBlocksRef = gtdDoc.ref.collection('blocks');
      const gtdBlocksSnapshot = await gtdBlocksRef.get();
      if (!gtdBlocksSnapshot.empty) {
        console.log(`   Found ${gtdBlocksSnapshot.size} blocks in gtd/${gtdDoc.id}/blocks`);
        gtdBlocksSnapshot.forEach(doc => {
          foundBlocks.push({
            path: `users/${userId}/gtd/${gtdDoc.id}/blocks/${doc.id}`,
            id: doc.id,
            data: doc.data()
          });
        });
      }
    }
    
    // 4. Check for any blocks with pageId = inbox or gtd-inbox
    console.log('\n📁 Checking for inbox-specific blocks...');
    const inboxQuery1 = blocksRef.where('pageId', '==', 'inbox');
    const inboxSnapshot1 = await inboxQuery1.get();
    if (!inboxSnapshot1.empty) {
      console.log(`   Found ${inboxSnapshot1.size} blocks with pageId='inbox'`);
    }
    
    const inboxQuery2 = blocksRef.where('pageId', '==', 'gtd-inbox');
    const inboxSnapshot2 = await inboxQuery2.get();
    if (!inboxSnapshot2.empty) {
      console.log(`   Found ${inboxSnapshot2.size} blocks with pageId='gtd-inbox'`);
    }
    
    console.log(`\n📊 TOTAL BLOCKS FOUND: ${foundBlocks.length}`);
    
    if (foundBlocks.length > 0) {
      console.log('\nSample blocks:');
      foundBlocks.slice(0, 3).forEach(block => {
        console.log(`  - ${block.id}: "${block.data.content?.substring(0, 50)}..." at ${block.path}`);
      });
    }
    
    return foundBlocks;
    
  } catch (error) {
    console.error('\n❌ Error during search:', error);
    throw error;
  }
}

async function deleteEverythingForUser(userId) {
  console.log(`\n🗑️ NUCLEAR DELETE - Removing EVERYTHING for user: ${userId}`);
  console.log('=' + '='.repeat(60));
  
  let totalDeleted = 0;
  
  try {
    // First, find all blocks
    const allBlocks = await findAllBlocksForUser(userId);
    
    // Delete each block individually
    if (allBlocks.length > 0) {
      console.log(`\n🗑️ Deleting ${allBlocks.length} blocks...`);
      for (const block of allBlocks) {
        const docRef = db.doc(block.path);
        await docRef.delete();
        totalDeleted++;
      }
      console.log(`   ✅ Deleted all blocks`);
    }
    
    const userRef = db.collection('users').doc(userId);
    
    // Delete all other collections
    const collections = [
      'pages', 'gtd', 'tasks', 'taskEvents', 
      'archivedPages', 'archivedBlocks', 'workspaces', 
      'assignees', 'settings'
    ];
    
    for (const collectionName of collections) {
      console.log(`\n📁 Deleting ${collectionName}...`);
      const collectionRef = userRef.collection(collectionName);
      const snapshot = await collectionRef.get();
      
      if (!snapshot.empty) {
        // For pages and gtd, check for nested blocks
        if (collectionName === 'pages' || collectionName === 'gtd') {
          for (const doc of snapshot.docs) {
            const blocksRef = doc.ref.collection('blocks');
            const blocksSnapshot = await blocksRef.get();
            if (!blocksSnapshot.empty) {
              const batch = db.batch();
              blocksSnapshot.forEach(blockDoc => {
                batch.delete(blockDoc.ref);
                totalDeleted++;
              });
              await batch.commit();
              console.log(`   Deleted ${blocksSnapshot.size} nested blocks from ${collectionName}/${doc.id}`);
            }
          }
        }
        
        // Delete the documents
        const batch = db.batch();
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
          totalDeleted++;
        });
        await batch.commit();
        console.log(`   ✅ Deleted ${snapshot.size} documents from ${collectionName}`);
      }
    }
    
    // Delete root workspaces
    console.log('\n📁 Deleting root workspaces...');
    const workspacesQuery = db.collection('workspaces').where('userId', '==', userId);
    const workspacesSnapshot = await workspacesQuery.get();
    if (!workspacesSnapshot.empty) {
      const batch = db.batch();
      workspacesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      await batch.commit();
      console.log(`   ✅ Deleted ${workspacesSnapshot.size} workspaces`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ NUCLEAR DELETE COMPLETE: ${totalDeleted} total items deleted`);
    console.log('='.repeat(60));
    
    // Verify no blocks remain
    console.log('\n🔍 Verifying deletion...');
    const remainingBlocks = await findAllBlocksForUser(userId);
    if (remainingBlocks.length > 0) {
      console.error(`\n⚠️ WARNING: ${remainingBlocks.length} blocks still remain!`);
      remainingBlocks.forEach(block => {
        console.log(`  - ${block.id} at ${block.path}`);
      });
    } else {
      console.log('✅ Verified: No blocks remaining');
    }
    
    return totalDeleted;
    
  } catch (error) {
    console.error('\n❌ Error during deletion:', error);
    throw error;
  }
}

async function getUserIdByEmail(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    return user.uid;
  } catch (error) {
    console.error(`User with email ${email} not found:`, error.message);
    return null;
  }
}

async function main() {
  const email = process.argv[2] || 'admin@dev.com';
  
  console.log('\n💣 NUCLEAR DATA DELETION 💣');
  console.log(`Target: ${email}`);
  
  const userId = await getUserIdByEmail(email);
  if (!userId) {
    console.log('❌ User not found!');
    process.exit(1);
  }
  
  console.log(`Found user ID: ${userId}`);
  console.log('\n⚠️  THIS WILL DELETE EVERYTHING! Starting in 3 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const deletedCount = await deleteEverythingForUser(userId);
    console.log(`\n✨ Successfully nuked all data for ${email}`);
    console.log(`📊 Total items deleted: ${deletedCount}`);
    console.log('\n🎉 User has a completely fresh start!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Nuclear deletion failed:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});