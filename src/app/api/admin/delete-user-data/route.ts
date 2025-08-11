import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, isAdminSDKAvailable } from '@/lib/firebaseAdmin';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const userEmail = request.headers.get('x-user-email');
  return userEmail === 'admin@dev.vn';
}

export async function DELETE(request: NextRequest) {
  try {
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    if (!isAdminSDKAvailable() || !adminDb) {
      return NextResponse.json({ error: 'Admin SDK not available' }, { status: 500 });
    }
    
    console.log(`Deleting data for user: ${userId}`);
    
    let totalDeleted = 0;
    const userRef = adminDb.collection('users').doc(userId);
    
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
              const batch = adminDb.batch();
              let batchCount = 0;
              
              blocksSnapshot.forEach(blockDoc => {
                batch.delete(blockDoc.ref);
                batchCount++;
                totalDeleted++;
                
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
        
        // Delete all documents in the collection
        const batch = adminDb.batch();
        let batchCount = 0;
        
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
          batchCount++;
          totalDeleted++;
          
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
    
    // Delete from root workspaces collection
    const workspacesQuery = adminDb.collection('workspaces').where('userId', '==', userId);
    const workspacesSnapshot = await workspacesQuery.get();
    
    if (!workspacesSnapshot.empty) {
      const batch = adminDb.batch();
      workspacesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      await batch.commit();
    }
    
    console.log(`Deleted ${totalDeleted} documents for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      message: `Deleted all data for user`,
      totalDeleted
    });
    
  } catch (error) {
    console.error('Error deleting user data:', error);
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    );
  }
}