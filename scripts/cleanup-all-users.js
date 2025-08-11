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

// Protected accounts that should not be deleted
const PROTECTED_EMAILS = [
  'admin@dev.vn',
  'quangvust201@gmail.com'
];

async function deleteAllUserData(userId) {
  console.log(`  🗑️ Deleting data for user: ${userId}`);
  
  let totalDeleted = 0;
  
  try {
    const userRef = db.collection('users').doc(userId);
    
    // List of all subcollections to delete
    const subcollections = [
      'blocks', 'pages', 'gtd', 'tasks', 'taskEvents',
      'archivedPages', 'archivedBlocks', 'workspaces',
      'assignees', 'settings'
    ];
    
    for (const collectionName of subcollections) {
      const collectionRef = userRef.collection(collectionName);
      const snapshot = await collectionRef.get();
      
      if (!snapshot.empty) {
        // For pages and gtd, delete nested blocks first
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
            }
          }
        }
        
        // Delete all documents in the collection
        const batch = db.batch();
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
          totalDeleted++;
        });
        await batch.commit();
      }
    }
    
    // Delete from root workspaces collection
    const workspacesQuery = db.collection('workspaces').where('userId', '==', userId);
    const workspacesSnapshot = await workspacesQuery.get();
    
    if (!workspacesSnapshot.empty) {
      const batch = db.batch();
      workspacesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      await batch.commit();
    }
    
    console.log(`     ✅ Deleted ${totalDeleted} documents`);
    return totalDeleted;
    
  } catch (error) {
    console.error(`     ❌ Error deleting data:`, error.message);
    return 0;
  }
}

async function deleteUserAccount(userId, email) {
  try {
    await admin.auth().deleteUser(userId);
    console.log(`  🗑️ Deleted account: ${email}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error deleting account ${email}:`, error.message);
    return false;
  }
}

async function cleanupAllUsersExceptProtected() {
  console.log('\n🧹 CLEANUP ALL USERS EXCEPT PROTECTED');
  console.log('=' + '='.repeat(60));
  console.log('Protected accounts:', PROTECTED_EMAILS.join(', '));
  console.log('=' + '='.repeat(60));
  
  try {
    // Get all users
    const listUsersResult = await admin.auth().listUsers(1000);
    const users = listUsersResult.users;
    
    console.log(`\nFound ${users.length} total users`);
    
    let deletedCount = 0;
    let protectedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      const email = user.email || 'unknown';
      
      if (PROTECTED_EMAILS.includes(email)) {
        console.log(`\n✅ PROTECTED: ${email} (${user.uid})`);
        protectedCount++;
        continue;
      }
      
      console.log(`\n❌ DELETING: ${email} (${user.uid})`);
      
      // Delete user data first
      const dataDeleted = await deleteAllUserData(user.uid);
      
      // Then delete the account
      const accountDeleted = await deleteUserAccount(user.uid, email);
      
      if (accountDeleted) {
        deletedCount++;
      } else {
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('CLEANUP COMPLETE:');
    console.log(`  ✅ Protected: ${protectedCount} accounts`);
    console.log(`  🗑️ Deleted: ${deletedCount} accounts`);
    if (errorCount > 0) {
      console.log(`  ❌ Errors: ${errorCount} accounts`);
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('\n⚠️  WARNING: This will delete ALL user accounts except:');
  console.log('  - admin@dev.vn');
  console.log('  - quangvust201@gmail.com');
  console.log('\nStarting in 5 seconds... Press Ctrl+C to cancel\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await cleanupAllUsersExceptProtected();
  
  console.log('\n✨ Done!');
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});