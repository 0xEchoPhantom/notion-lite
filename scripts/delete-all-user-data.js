const admin = require('firebase-admin');
const readline = require('readline');

// Check if service account exists
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  try {
    serviceAccount = require('../serviceAccount.json');
  } catch (error2) {
    console.error('❌ serviceAccountKey.json or serviceAccount.json not found!');
    console.log('Please create a serviceAccountKey.json file in the root directory.');
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteAllUserData(userId) {
  console.log(`\n🗑️ Starting complete data deletion for user: ${userId}`);
  console.log('=' + '='.repeat(60));
  
  let totalDeleted = 0;
  
  try {
    const userRef = db.collection('users').doc(userId);
    
    // List of all subcollections to delete
    const subcollections = [
      'blocks',
      'pages', 
      'gtd',
      'tasks',
      'taskEvents',
      'archivedPages',
      'archivedBlocks',
      'workspaces',
      'assignees',
      'settings'
    ];
    
    for (const collectionName of subcollections) {
      console.log(`\n📁 Deleting ${collectionName}...`);
      const collectionRef = userRef.collection(collectionName);
      const snapshot = await collectionRef.get();
      
      if (snapshot.empty) {
        console.log(`   ⚪ No documents in ${collectionName}`);
        continue;
      }
      
      // For collections that have subcollections, delete those first
      if (collectionName === 'pages' || collectionName === 'gtd') {
        for (const doc of snapshot.docs) {
          // Delete blocks subcollection
          const blocksRef = doc.ref.collection('blocks');
          const blocksSnapshot = await blocksRef.get();
          
          if (!blocksSnapshot.empty) {
            const batch = db.batch();
            let batchCount = 0;
            
            blocksSnapshot.forEach(blockDoc => {
              batch.delete(blockDoc.ref);
              batchCount++;
              
              // Firestore batch limit is 500
              if (batchCount === 500) {
                batch.commit();
                batch = db.batch();
                batchCount = 0;
              }
            });
            
            if (batchCount > 0) {
              await batch.commit();
            }
            
            console.log(`   🗑️ Deleted ${blocksSnapshot.size} blocks from ${collectionName}/${doc.id}`);
            totalDeleted += blocksSnapshot.size;
          }
        }
      }
      
      // Delete all documents in the collection
      const batch = db.batch();
      let batchCount = 0;
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        batchCount++;
        totalDeleted++;
        
        if (batchCount === 500) {
          batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      });
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`   ✅ Deleted ${snapshot.size} documents from ${collectionName}`);
    }
    
    // Also check and delete from root-level workspaces collection
    console.log('\n📁 Checking root workspaces collection...');
    const workspacesRef = db.collection('workspaces');
    const workspacesQuery = workspacesRef.where('userId', '==', userId);
    const workspacesSnapshot = await workspacesQuery.get();
    
    if (!workspacesSnapshot.empty) {
      const batch = db.batch();
      workspacesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      await batch.commit();
      console.log(`   ✅ Deleted ${workspacesSnapshot.size} workspaces`);
    } else {
      console.log('   ⚪ No workspaces found');
    }
    
    // Check for page references
    console.log('\n📁 Checking page references...');
    const pageRefsSnapshot = await db.collection('pageReferences').get();
    if (!pageRefsSnapshot.empty) {
      const batch = db.batch();
      let count = 0;
      pageRefsSnapshot.forEach(doc => {
        // Delete all page references (we're starting fresh)
        batch.delete(doc.ref);
        count++;
        totalDeleted++;
      });
      await batch.commit();
      console.log(`   ✅ Deleted ${count} page references`);
    } else {
      console.log('   ⚪ No page references found');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ COMPLETE: Deleted ${totalDeleted} total documents`);
    console.log('='.repeat(60));
    
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
  console.log('\n🔥 FIREBASE DATA DELETION TOOL 🔥');
  console.log('This will permanently delete ALL data for a user.');
  console.log('This action cannot be undone!\n');
  
  rl.question('Enter user email or UID: ', async (input) => {
    let userId = input.trim();
    
    // Check if input looks like an email
    if (userId.includes('@')) {
      console.log(`\nLooking up user by email: ${userId}`);
      const uid = await getUserIdByEmail(userId);
      if (!uid) {
        console.log('❌ User not found!');
        rl.close();
        process.exit(1);
      }
      userId = uid;
      console.log(`Found user: ${userId}`);
    }
    
    console.log(`\n⚠️  WARNING: This will delete ALL data for user: ${userId}`);
    
    rl.question('\nType "DELETE" to confirm: ', async (confirmation) => {
      if (confirmation !== 'DELETE') {
        console.log('\n❌ Deletion cancelled');
        rl.close();
        process.exit(0);
      }
      
      try {
        const deletedCount = await deleteAllUserData(userId);
        console.log(`\n✨ Successfully deleted all data for user ${userId}`);
        console.log(`📊 Total documents deleted: ${deletedCount}`);
        console.log('\n🎉 The user can now start fresh!');
      } catch (error) {
        console.error('\n❌ Deletion failed:', error);
      }
      
      rl.close();
      process.exit(0);
    });
  });
}

// Handle Ctrl+C
rl.on('SIGINT', () => {
  console.log('\n\n❌ Deletion cancelled');
  process.exit(0);
});

main().catch(console.error);