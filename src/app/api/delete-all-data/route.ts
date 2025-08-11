import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminSDKAvailable } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

async function getUserIdFromSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie) {
    return null;
  }
  
  // For dev, we'll parse the session to get userId
  // This is a simplified approach - in production you'd verify the session
  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie.value));
    return sessionData.uid || null;
  } catch {
    return null;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get userId from request or session
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    
    if (!userId) {
      // Try to get from session
      userId = await getUserIdFromSession();
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }
    
    if (!isAdminSDKAvailable() || !adminDb) {
      return NextResponse.json(
        { error: 'Admin SDK not available' },
        { status: 500 }
      );
    }
    
    console.log(`Starting data deletion for user: ${userId}`);
    
    const userRef = adminDb.collection('users').doc(userId);
    let totalDeleted = 0;
    
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
      const collectionRef = userRef.collection(collectionName);
      const snapshot = await collectionRef.get();
      
      if (!snapshot.empty) {
        // For collections with subcollections, delete those first
        if (collectionName === 'pages' || collectionName === 'gtd') {
          for (const doc of snapshot.docs) {
            const blocksRef = doc.ref.collection('blocks');
            const blocksSnapshot = await blocksRef.get();
            
            if (!blocksSnapshot.empty) {
              const batch = adminDb.batch();
              blocksSnapshot.forEach(blockDoc => {
                batch.delete(blockDoc.ref);
                totalDeleted++;
              });
              await batch.commit();
            }
          }
        }
        
        // Delete all documents in the collection
        const batch = adminDb.batch();
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
          totalDeleted++;
        });
        await batch.commit();
      }
    }
    
    // Delete from root workspaces collection
    const workspacesRef = adminDb.collection('workspaces');
    const workspacesQuery = workspacesRef.where('userId', '==', userId);
    const workspacesSnapshot = await workspacesQuery.get();
    
    if (!workspacesSnapshot.empty) {
      const batch = adminDb.batch();
      workspacesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      await batch.commit();
    }
    
    // Delete page references
    const pageRefsSnapshot = await adminDb.collection('pageReferences').get();
    if (!pageRefsSnapshot.empty) {
      const batch = adminDb.batch();
      pageRefsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      await batch.commit();
    }
    
    console.log(`Deleted ${totalDeleted} documents for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      message: `Deleted all data for user ${userId}`,
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