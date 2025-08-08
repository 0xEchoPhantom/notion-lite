// Temporary script to clean up duplicate pages
// Run with: node cleanup-duplicates.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'notion-lite-dev-firebase'
});

const db = admin.firestore();

async function cleanupDuplicatePages() {
  console.log('🧹 Starting cleanup of duplicate pages...');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`\n👤 Processing user: ${userId}`);
      
      // Get all pages for this user
      const pagesSnapshot = await db.collection('users').doc(userId).collection('pages').get();
      const pages = pagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📄 Found ${pages.length} pages total`);
      
      // Group pages by title (case-insensitive)
      const pageGroups = {};
      for (const page of pages) {
        const normalizedTitle = page.title.toLowerCase().trim();
        if (!pageGroups[normalizedTitle]) {
          pageGroups[normalizedTitle] = [];
        }
        pageGroups[normalizedTitle].push(page);
      }
      
      // Find and delete duplicates
      let deletedCount = 0;
      for (const [title, group] of Object.entries(pageGroups)) {
        if (group.length > 1) {
          console.log(`🔍 Found ${group.length} duplicates for "${title}"`);
          
          // Keep the first one, delete the rest
          const toKeep = group[0];
          const toDelete = group.slice(1);
          
          for (const pageToDelete of toDelete) {
            try {
              await db.collection('users').doc(userId).collection('pages').doc(pageToDelete.id).delete();
              console.log(`❌ Deleted duplicate: ${pageToDelete.title} (${pageToDelete.id})`);
              deletedCount++;
            } catch (error) {
              console.error(`💥 Failed to delete ${pageToDelete.id}:`, error);
            }
          }
          
          console.log(`✅ Kept: ${toKeep.title} (${toKeep.id})`);
        }
      }
      
      console.log(`🧹 Deleted ${deletedCount} duplicate pages for user ${userId}`);
    }
    
    console.log('\n✨ Cleanup completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupDuplicatePages();
