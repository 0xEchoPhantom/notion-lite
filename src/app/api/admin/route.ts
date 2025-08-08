import { NextRequest, NextResponse } from 'next/server';
import { adminOperations, isAdminSDKAvailable } from '@/lib/firebaseAdmin';

// Configure dynamic route for API
export const dynamic = 'force-dynamic';

// This API route demonstrates admin operations
// In production, you should add proper authentication and rate limiting

export async function GET(request: NextRequest) {
  try {
    // Check if admin SDK is available
    if (!isAdminSDKAvailable()) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not available' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');
    const userId = searchParams.get('userId');

    switch (operation) {
      case 'stats':
        const stats = await adminOperations.getSystemStats();
        return NextResponse.json({ success: true, data: stats });

      case 'user-summary':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId parameter required for user-summary' },
            { status: 400 }
          );
        }
        const userSummary = await adminOperations.getUserDataSummary(userId);
        return NextResponse.json({ success: true, data: userSummary });

      case 'cleanup':
        const cleanedCount = await adminOperations.cleanupOrphanedBlocks();
        return NextResponse.json({ 
          success: true, 
          message: `Cleaned up ${cleanedCount} orphaned blocks` 
        });

      default:
        return NextResponse.json(
          { 
            error: 'Invalid operation. Available: stats, user-summary, cleanup',
            usage: {
              stats: '/api/admin?operation=stats',
              userSummary: '/api/admin?operation=user-summary&userId=USER_ID',
              cleanup: '/api/admin?operation=cleanup'
            }
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminSDKAvailable()) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not available' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter required' },
        { status: 400 }
      );
    }

    // DANGEROUS OPERATION: Delete all user data
    // In production, add proper authentication and confirmation
    await adminOperations.deleteUserData(userId);

    return NextResponse.json({ 
      success: true, 
      message: `All data for user ${userId} has been deleted` 
    });
  } catch (error) {
    console.error('Admin DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
