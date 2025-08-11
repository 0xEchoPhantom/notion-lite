#!/usr/bin/env node

/**
 * Firebase CLI Database Checker
 * Tests Firebase connection and shows database contents
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Colors for console output
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
      log('yellow', '   Download it from Firebase Console > Project Settings > Service Accounts');
      process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    log('green', '✅ Firebase Admin SDK initialized');
    return admin.firestore();
  } catch (error) {
    log('red', `❌ Firebase initialization failed: ${error.message}`);
    process.exit(1);
  }
}

async function testConnection(db) {
  try {
    // Simple test: try to get collections
    const collections = await db.listCollections();
    log('green', `✅ Database connection successful`);
    log('blue', `   Found ${collections.length} top-level collections`);
    
    collections.forEach(collection => {
      log('cyan', `   - ${collection.id}`);
    });
    
    return true;
  } catch (error) {
    log('red', `❌ Database connection failed: ${error.message}`);
    return false;
  }
}

async function checkUsers(db) {
  try {
    log('bold', '\n🔍 Checking Users Collection...');
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.limit(10).get();
    
    if (snapshot.empty) {
      log('yellow', '⚠️  No users found in database');
      return;
    }

    log('green', `✅ Found ${snapshot.size} users`);
    
    for (const userDoc of snapshot.docs) {
      const userId = userDoc.id;
      log('cyan', `\n👤 User: ${userId}`);
      
      // Check pages for this user
      const pagesRef = db.collection('users').doc(userId).collection('pages');
      const pagesSnapshot = await pagesRef.get();
      
      if (!pagesSnapshot.empty) {
        log('blue', `   📄 ${pagesSnapshot.size} pages`);
        
        for (const pageDoc of pagesSnapshot.docs) {
          const pageData = pageDoc.data();
          log('cyan', `      - "${pageData.title || 'Untitled'}" (${pageDoc.id})`);
          
          // Check blocks for this page
          const blocksRef = pageDoc.ref.collection('blocks');
          const blocksSnapshot = await blocksRef.get();
          
          if (!blocksSnapshot.empty) {
            log('blue', `        📝 ${blocksSnapshot.size} blocks`);
          }
        }
      } else {
        log('yellow', '   📄 No pages');
      }
    }
  } catch (error) {
    log('red', `❌ Error checking users: ${error.message}`);
  }
}

async function checkWorkspaces(db) {
  try {
    log('bold', '\n🏢 Checking Workspaces Collection...');
    
    const workspacesRef = db.collection('workspaces');
    const snapshot = await workspacesRef.get();
    
    if (snapshot.empty) {
      log('yellow', '⚠️  No workspaces found in database');
      return;
    }

    log('green', `✅ Found ${snapshot.size} workspaces`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown';
      log('cyan', `   - "${data.name}" (${data.mode}) - Created: ${createdAt}`);
      log('blue', `     User: ${data.userId}`);
    });
  } catch (error) {
    log('red', `❌ Error checking workspaces: ${error.message}`);
  }
}

async function checkArchive(db) {
  try {
    log('bold', '\n📦 Checking Archived Data...');
    
    // Check archived pages
    const archivedPagesRef = db.collectionGroup('archivedPages');
    const archivedPagesSnapshot = await archivedPagesRef.get();
    
    // Check archived blocks  
    const archivedBlocksRef = db.collectionGroup('archivedBlocks');
    const archivedBlocksSnapshot = await archivedBlocksRef.get();
    
    log('blue', `   📄 ${archivedPagesSnapshot.size} archived pages`);
    log('blue', `   📝 ${archivedBlocksSnapshot.size} archived blocks`);
  } catch (error) {
    log('red', `❌ Error checking archive: ${error.message}`);
  }
}

async function getProjectInfo(db) {
  try {
    log('bold', '\n📊 Project Statistics...');
    
    const collections = await db.listCollections();
    let totalDocs = 0;
    
    for (const collection of collections) {
      const snapshot = await collection.get();
      totalDocs += snapshot.size;
    }
    
    log('green', `   📈 ${collections.length} collections`);
    log('green', `   📄 ~${totalDocs} total documents (top-level)`);
    
    // Check for collection groups
    const usersQuery = await db.collectionGroup('pages').get();
    const blocksQuery = await db.collectionGroup('blocks').get();
    
    log('green', `   📄 ${usersQuery.size} total pages (across all users)`);
    log('green', `   📝 ${blocksQuery.size} total blocks (across all pages)`);
    
  } catch (error) {
    log('red', `❌ Error getting project stats: ${error.message}`);
  }
}

async function main() {
  log('bold', '🚀 Firebase CLI Database Checker\n');
  
  const db = await initializeFirebase();
  
  const connected = await testConnection(db);
  if (!connected) {
    process.exit(1);
  }
  
  await checkUsers(db);
  await checkWorkspaces(db);
  await checkArchive(db);
  await getProjectInfo(db);
  
  log('bold', '\n✅ Database check complete!');
  process.exit(0);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Firebase CLI Database Checker

Usage: node firebase-cli-test.js [options]

Options:
  --help, -h     Show this help message
  
Requirements:
  - serviceAccountKey.json file in project root
  - firebase-admin npm package installed

This script will:
  ✅ Test Firebase connection
  📊 Show database statistics  
  👤 List users and their pages
  🏢 List workspaces
  📦 Check archived data
  `);
  process.exit(0);
}

main().catch(error => {
  log('red', `💥 Fatal error: ${error.message}`);
  process.exit(1);
});