import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, isAdminSDKAvailable } from '@/lib/firebaseAdmin';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const userEmail = request.headers.get('x-user-email');
  return userEmail === 'admin@dev.vn';
}

const PROTECTED_EMAILS = ['admin@dev.vn', 'quangvust201@gmail.com'];

export async function POST(request: NextRequest) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!isAdminSDKAvailable() || !adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Admin SDK not available' }, { status: 500 });
    }
    
    console.log('Starting cleanup of all non-protected users...');
    
    // Get all users
    const listUsersResult = await adminAuth.listUsers(1000);
    const users = listUsersResult.users;
    
    let deletedCount = 0;
    let protectedCount = 0;
    const errors: string[] = [];
    
    for (const userRecord of users) {
      const email = userRecord.email || '';
      
      // Skip protected accounts
      if (PROTECTED_EMAILS.includes(email.toLowerCase())) {
        console.log(`Skipping protected account: ${email}`);
        protectedCount++;
        continue;
      }
      
      try {
        console.log(`Deleting account: ${email} (${userRecord.uid})`);
        
        // Delete all user data first
        const userRef = adminDb.collection('users').doc(userRecord.uid);
        
        const subcollections = [
          'blocks', 'pages', 'gtd', 'tasks', 'taskEvents',
          'archivedPages', 'archivedBlocks', 'workspaces',
          'assignees', 'settings'
        ];
        
        for (const collectionName of subcollections) {
          const collectionRef = userRef.collection(collectionName);
          const snapshot = await collectionRef.get();
          
          if (!snapshot.empty) {
            // Handle nested collections
            if (collectionName === 'pages' || collectionName === 'gtd') {
              for (const doc of snapshot.docs) {
                const blocksRef = doc.ref.collection('blocks');
                const blocksSnapshot = await blocksRef.get();
                
                if (!blocksSnapshot.empty) {
                  const batch = adminDb.batch();
                  let batchCount = 0;
                  
                  blocksSnapshot.forEach(blockDoc => {
                    batch.delete(blockDoc.ref);
                    batchCount++;
                    
                    if (batchCount === 500) {
                      batch.commit();
                      batchCount = 0;
                    }
                  });
                  
                  if (batchCount > 0) {
                    await batch.commit();
                  }
                }
              }
            }
            
            // Delete documents
            const batch = adminDb.batch();
            let batchCount = 0;
            
            snapshot.forEach(doc => {
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
          }
        }
        
        // Delete from root workspaces
        const workspacesQuery = adminDb.collection('workspaces').where('userId', '==', userRecord.uid);
        const workspacesSnapshot = await workspacesQuery.get();
        
        if (!workspacesSnapshot.empty) {
          const batch = adminDb.batch();
          workspacesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
        
        // Delete the user account
        await adminAuth.deleteUser(userRecord.uid);
        
        console.log(`Successfully deleted: ${email}`);
        deletedCount++;
        
      } catch (error) {
        console.error(`Error deleting ${email}:`, error);
        errors.push(`Failed to delete ${email}`);
      }
    }
    
    console.log(`Cleanup complete: ${deletedCount} deleted, ${protectedCount} protected`);
    
    return NextResponse.json({
      success: true,
      deletedCount,
      protectedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Deleted ${deletedCount} accounts, protected ${protectedCount}`
    });
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}