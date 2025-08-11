import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, isAdminSDKAvailable } from '@/lib/firebaseAdmin';

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const userEmail = request.headers.get('x-user-email');
  if (userEmail === 'admin@dev.vn') {
    return userEmail;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const adminEmail = await verifyAdmin(request);
    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!isAdminSDKAvailable() || !adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Admin SDK not available' },
        { status: 500 }
      );
    }
    
    let totalUsers = 0;
    let totalDocuments = 0;
    let totalBlocks = 0;
    let totalTasks = 0;
    
    // Get user count from Firebase Auth
    try {
      const listUsersResult = await adminAuth.listUsers(1000);
      totalUsers = listUsersResult.users.length;
      console.log(`Found ${totalUsers} users in Firebase Auth`);
      
      // Now count documents for each user
      if (adminDb) {
        for (const user of listUsersResult.users) {
          const userId = user.uid;
          const userRef = adminDb.collection('users').doc(userId);
          console.log(`\nCounting documents for user: ${user.email} (${userId})`);
          
          let userDocCount = 0;
          
          // Count blocks
          const blocksSnapshot = await userRef.collection('blocks').get();
        console.log(`  - blocks: ${blocksSnapshot.size}`);
        totalBlocks += blocksSnapshot.size;
        totalDocuments += blocksSnapshot.size;
        userDocCount += blocksSnapshot.size;
        
        // Count pages
        const pagesSnapshot = await userRef.collection('pages').get();
        console.log(`  - pages: ${pagesSnapshot.size}`);
        totalDocuments += pagesSnapshot.size;
        userDocCount += pagesSnapshot.size;
        
        // Count blocks in pages
        for (const pageDoc of pagesSnapshot.docs) {
          const pageBlocksSnapshot = await pageDoc.ref.collection('blocks').get();
          if (pageBlocksSnapshot.size > 0) {
            console.log(`    - blocks in page ${pageDoc.id}: ${pageBlocksSnapshot.size}`);
            totalBlocks += pageBlocksSnapshot.size;
            totalDocuments += pageBlocksSnapshot.size;
            userDocCount += pageBlocksSnapshot.size;
          }
        }
        
        // Count GTD pages
        const gtdSnapshot = await userRef.collection('gtd').get();
        console.log(`  - gtd pages: ${gtdSnapshot.size}`);
        totalDocuments += gtdSnapshot.size;
        userDocCount += gtdSnapshot.size;
        
        // Count blocks in GTD pages
        for (const gtdDoc of gtdSnapshot.docs) {
          const gtdBlocksSnapshot = await gtdDoc.ref.collection('blocks').get();
          if (gtdBlocksSnapshot.size > 0) {
            console.log(`    - blocks in gtd/${gtdDoc.id}: ${gtdBlocksSnapshot.size}`);
            totalBlocks += gtdBlocksSnapshot.size;
            totalDocuments += gtdBlocksSnapshot.size;
            userDocCount += gtdBlocksSnapshot.size;
          }
        }
        
        // Count tasks
        const tasksSnapshot = await userRef.collection('tasks').get();
        console.log(`  - tasks: ${tasksSnapshot.size}`);
        totalTasks += tasksSnapshot.size;
        totalDocuments += tasksSnapshot.size;
        userDocCount += tasksSnapshot.size;
        
        // Count other collections
        const otherCollections = ['taskEvents', 'archivedPages', 'archivedBlocks', 'workspaces', 'assignees', 'settings'];
        for (const collection of otherCollections) {
          const snapshot = await userRef.collection(collection).get();
          if (snapshot.size > 0) {
            console.log(`  - ${collection}: ${snapshot.size}`);
            totalDocuments += snapshot.size;
            userDocCount += snapshot.size;
          }
        }
        
          console.log(`  Total for ${user.email}: ${userDocCount} documents`);
        }
      }
    } catch (error) {
      console.error('Error counting user data:', error);
    }
    
    console.log('\n=== Final Stats ===');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Documents: ${totalDocuments}`);
    console.log(`Total Blocks: ${totalBlocks}`);
    console.log(`Total Tasks: ${totalTasks}`);
    
    return NextResponse.json({
      totalUsers,
      totalDocuments,
      totalBlocks,
      totalTasks
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}