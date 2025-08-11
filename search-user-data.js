#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

async function initializeFirebase() {
  try {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      log('red', '❌ serviceAccountKey.json not found!');
      process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    return admin.firestore();
  } catch (error) {
    log('red', `❌ Firebase initialization failed: ${error.message}`);
    process.exit(1);
  }
}

async function findUserByEmail(db, email) {
  log('bold', `🔍 Searching for user: ${email}`);
  
  try {
    // Get all users from Firebase Auth
    const authUsers = await admin.auth().listUsers();
    const targetUser = authUsers.users.find(user => user.email === email);
    
    if (!targetUser) {
      log('red', `❌ User ${email} not found in Firebase Auth`);
      return null;
    }
    
    log('green', `✅ Found user in Auth:`);
    log('cyan', `   UID: ${targetUser.uid}`);
    log('cyan', `   Email: ${targetUser.email}`);
    log('cyan', `   Created: ${new Date(targetUser.metadata.creationTime).toLocaleString()}`);
    
    return targetUser.uid;
  } catch (error) {
    log('red', `❌ Error finding user: ${error.message}`);
    return null;
  }
}

async function searchUserData(db, userId, searchText) {
  try {
    log('bold', `\n📄 Searching user data for: "${searchText}"`);
    
    // Get all pages for this user
    const pagesRef = db.collection('users').doc(userId).collection('pages');
    const pagesSnapshot = await pagesRef.get();
    
    if (pagesSnapshot.empty) {
      log('yellow', '⚠️ No pages found for this user');
      return;
    }
    
    log('green', `✅ Found ${pagesSnapshot.size} pages, searching...`);
    
    let foundBlocks = [];
    
    for (const pageDoc of pagesSnapshot.docs) {
      const pageData = pageDoc.data();
      const pageTitle = pageData.title || 'Untitled';
      
      // Search page title first
      if (pageTitle.toLowerCase().includes('inbox')) {
        log('cyan', `\n📄 Found Inbox page: "${pageTitle}" (${pageDoc.id})`);
        
        // Get all blocks in this page
        const blocksRef = pageDoc.ref.collection('blocks');
        const blocksSnapshot = await blocksRef.get();
        
        if (!blocksSnapshot.empty) {
          log('blue', `   📝 Searching ${blocksSnapshot.size} blocks...`);
          
          blocksSnapshot.forEach(blockDoc => {
            const blockData = blockDoc.data();
            const content = blockData.content || '';
            
            // Check if this block contains our search text
            if (content.includes('anh xem xong ròi') || 
                content.includes('@Phạm Quang Vũ') ||
                content.includes('trang thanh toán')) {
              
              foundBlocks.push({
                pageTitle,
                pageId: pageDoc.id,
                blockId: blockDoc.id,
                content: content,
                type: blockData.type,
                order: blockData.order,
                createdAt: blockData.createdAt,
                updatedAt: blockData.updatedAt
              });
              
              log('green', `   ✅ FOUND BLOCK:`);
              log('yellow', `      "${content}"`);
              log('cyan', `      Block ID: ${blockDoc.id}`);
              log('cyan', `      Type: ${blockData.type}`);
              log('cyan', `      Order: ${blockData.order}`);
              if (blockData.createdAt) {
                log('cyan', `      Created: ${new Date(blockData.createdAt.seconds * 1000).toLocaleString()}`);
              }
            }
          });
        }
      }
      
      // Also search all blocks in all pages for the text
      const blocksRef = pageDoc.ref.collection('blocks');
      const blocksSnapshot = await blocksRef.get();
      
      blocksSnapshot.forEach(blockDoc => {
        const blockData = blockDoc.data();
        const content = blockData.content || '';
        
        if (content.includes(searchText) && !foundBlocks.some(b => b.blockId === blockDoc.id)) {
          foundBlocks.push({
            pageTitle,
            pageId: pageDoc.id,
            blockId: blockDoc.id,
            content: content,
            type: blockData.type,
            order: blockData.order,
            createdAt: blockData.createdAt,
            updatedAt: blockData.updatedAt
          });
        }
      });
    }
    
    if (foundBlocks.length === 0) {
      log('yellow', '⚠️ No blocks found matching the search criteria');
    } else {
      log('bold', `\n📊 Search Results Summary:`);
      log('green', `   Found ${foundBlocks.length} matching blocks`);
      
      foundBlocks.forEach((block, index) => {
        log('cyan', `\n   ${index + 1}. Page: "${block.pageTitle}"`);
        log('yellow', `      Content: "${block.content}"`);
        log('blue', `      Block ID: ${block.blockId}`);
      });
    }
    
    return foundBlocks;
  } catch (error) {
    log('red', `❌ Error searching user data: ${error.message}`);
    return [];
  }
}

async function getUserWorkspaces(db, userId) {
  try {
    log('bold', '\n🏢 User Workspaces:');
    
    const workspacesRef = db.collection('workspaces');
    const snapshot = await workspacesRef.where('userId', '==', userId).get();
    
    if (snapshot.empty) {
      log('yellow', '⚠️ No workspaces found for this user');
      return;
    }
    
    log('green', `✅ Found ${snapshot.size} workspaces:`);
    snapshot.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown';
      log('cyan', `   - "${data.name}" (${data.mode}) - Created: ${createdAt}`);
      log('blue', `     ID: ${doc.id}`);
    });
  } catch (error) {
    log('red', `❌ Error getting workspaces: ${error.message}`);
  }
}

async function main() {
  const email = 'quangvust201@gmail.com';
  const searchText = 'anh xem xong ròi';
  
  log('bold', '🔎 Firebase User Data Search\n');
  
  const db = await initializeFirebase();
  
  // Find user by email
  const userId = await findUserByEmail(db, email);
  if (!userId) {
    process.exit(1);
  }
  
  // Get user workspaces
  await getUserWorkspaces(db, userId);
  
  // Search for the specific content
  await searchUserData(db, userId, searchText);
  
  log('bold', '\n✅ Search complete!');
  process.exit(0);
}

main().catch(error => {
  log('red', `💥 Fatal error: ${error.message}`);
  process.exit(1);
});