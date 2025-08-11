import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, isAdminSDKAvailable } from '@/lib/firebaseAdmin';

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  // For now, we'll check the cookie or header for user email
  // In production, you'd verify the session properly
  const userEmail = request.headers.get('x-user-email');
  
  if (userEmail === 'admin@dev.vn') {
    return userEmail;
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminEmail = await verifyAdmin(request);
    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!isAdminSDKAvailable() || !adminAuth || !adminDb) {
      return NextResponse.json(
        { error: 'Admin SDK not available' },
        { status: 500 }
      );
    }
    
    // Get all users
    const listUsersResult = await adminAuth.listUsers(1000);
    const users = await Promise.all(
      listUsersResult.users.map(async (user) => {
        // Count documents for each user
        let documentsCount = 0;
        try {
          const userRef = adminDb.collection('users').doc(user.uid);
          
          // Count blocks
          const blocksSnapshot = await userRef.collection('blocks').get();
          documentsCount += blocksSnapshot.size;
          
          // Count pages
          const pagesSnapshot = await userRef.collection('pages').get();
          documentsCount += pagesSnapshot.size;
          
          // Count tasks
          const tasksSnapshot = await userRef.collection('tasks').get();
          documentsCount += tasksSnapshot.size;
        } catch (error) {
          console.error(`Error counting documents for ${user.email}:`, error);
        }
        
        return {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || null,
          lastSignInTime: user.metadata.lastSignInTime,
          creationTime: user.metadata.creationTime,
          documentsCount
        };
      })
    );
    
    return NextResponse.json({ users });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}