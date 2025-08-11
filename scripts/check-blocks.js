const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccount.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findBlock(blockId) {
  console.log(`\nSearching for block: ${blockId}`);
  console.log('=' + '='.repeat(50));
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`\nChecking user: ${userId}`);
      
      // Check unified blocks collection
      const unifiedBlockRef = db.collection('users').doc(userId).collection('blocks').doc(blockId);
      const unifiedBlock = await unifiedBlockRef.get();
      
      if (unifiedBlock.exists) {
        console.log(`✅ Found in unified blocks collection!`);
        console.log('Data:', JSON.stringify(unifiedBlock.data(), null, 2));
        return;
      }
      
      // Check pages/*/blocks
      const pagesSnapshot = await db.collection('users').doc(userId).collection('pages').get();
      for (const pageDoc of pagesSnapshot.docs) {
        const pageBlockRef = pageDoc.ref.collection('blocks').doc(blockId);
        const pageBlock = await pageBlockRef.get();
        
        if (pageBlock.exists) {
          console.log(`✅ Found in page ${pageDoc.id} blocks!`);
          console.log('Data:', JSON.stringify(pageBlock.data(), null, 2));
          return;
        }
      }
      
      // Check gtd/*/blocks
      const gtdSnapshot = await db.collection('users').doc(userId).collection('gtd').get();
      for (const gtdDoc of gtdSnapshot.docs) {
        const gtdBlockRef = gtdDoc.ref.collection('blocks').doc(blockId);
        const gtdBlock = await gtdBlockRef.get();
        
        if (gtdBlock.exists) {
          console.log(`✅ Found in GTD ${gtdDoc.id} blocks!`);
          console.log('Data:', JSON.stringify(gtdBlock.data(), null, 2));
          return;
        }
      }
      
      // Check archived blocks
      const archivedBlockRef = db.collection('users').doc(userId).collection('archivedBlocks').doc(blockId);
      const archivedBlock = await archivedBlockRef.get();
      
      if (archivedBlock.exists) {
        console.log(`📦 Found in archived blocks!`);
        console.log('Data:', JSON.stringify(archivedBlock.data(), null, 2));
        return;
      }
    }
    
    console.log(`❌ Block ${blockId} not found in any location`);
    
  } catch (error) {
    console.error('Error searching for block:', error);
  }
}

async function main() {
  const blockIds = [
    'qB2gMj9IWYcmnGm2CwWo',
    'o4TZsoy6ST7F6gEWLMqr'
  ];
  
  for (const blockId of blockIds) {
    await findBlock(blockId);
  }
  
  process.exit(0);
}

main().catch(console.error);