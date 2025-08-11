import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, isAdminSDKAvailable } from '@/lib/firebaseAdmin';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const userEmail = request.headers.get('x-user-email');
  return userEmail === 'admin@dev.vn';
}

const PROTECTED_EMAILS = ['admin@dev.vn', 'quangvust201@gmail.com'];

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
    
    if (!isAdminSDKAvailable() || !adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Admin SDK not available' }, { status: 500 });
    }
    
    // Get user info
    let userEmail = '';
    try {
      const userRecord = await adminAuth.getUser(userId);
      userEmail = userRecord.email || '';
      
      // Check if protected
      if (PROTECTED_EMAILS.includes(userEmail)) {
        return NextResponse.json(
          { error: 'Cannot delete protected account' },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
    
    console.log(`Deleting account: ${userEmail} (${userId})`);
    
    // First delete all user data
    let totalDeleted = 0;
    const userRef = adminDb.collection('users').doc(userId);
    
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
              blocksSnapshot.forEach(blockDoc => {
                batch.delete(blockDoc.ref);
                totalDeleted++;
              });
              await batch.commit();
            }
          }
        }
        
        // Delete documents
        const batch = adminDb.batch();
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
          totalDeleted++;
        });
        await batch.commit();
      }
    }
    
    // Delete from root workspaces
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
    
    // Delete the user account
    await adminAuth.deleteUser(userId);
    
    console.log(`Deleted account ${userEmail} and ${totalDeleted} documents`);
    
    return NextResponse.json({
      success: true,
      message: `Deleted account and all data`,
      email: userEmail,
      documentsDeleted: totalDeleted
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}