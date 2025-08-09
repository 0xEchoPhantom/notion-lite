import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;

try {
  // Check if admin app already exists
  const existingApp = getApps().find(app => app?.name === 'admin');
  
  if (!existingApp) {
    const credentialConfig: Record<string, unknown> = {};
    
    // Try to get service account from environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credentialConfig.credential = cert(serviceAccountKey);
      } catch (error) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', error);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // When using GOOGLE_APPLICATION_CREDENTIALS, Firebase Admin SDK 
      // will automatically detect and use the credential file
      // We don't need to explicitly set the credential
      console.log('Using GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else {
      console.warn('No Firebase Admin credentials found. Admin SDK will not be available.');
      throw new Error('Missing Firebase Admin credentials');
    }

    // Initialize Firebase Admin SDK
    adminApp = initializeApp({
      ...credentialConfig,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    }, 'admin');
    
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    adminApp = existingApp;
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  
  // In development, we can continue without admin SDK
  if (process.env.NODE_ENV === 'development') {
    console.warn('Continuing without Firebase Admin SDK in development mode');
  }
}

// Export admin services
export const adminDb: Firestore | null = adminApp ? getFirestore(adminApp) : null;
export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;

// Helper function to check if admin SDK is available
export const isAdminSDKAvailable = (): boolean => {
  return adminApp !== null && adminDb !== null && adminAuth !== null;
};

// Type definitions for admin operations
export interface SystemStats {
  totalUsers: number;
  totalPages: number;
  totalBlocks: number;
  totalArchivedPages: number;
  totalArchivedBlocks: number;
  timestamp: Date;
}

export interface UserDataSummary {
  userId: string;
  pagesCount: number;
  blocksCount: number;
  archivedPagesCount: number;
  archivedBlocksCount: number;
  lastActivity?: Date;
}

// Admin-only operations
export const adminOperations = {
  /**
   * Completely delete all data for a user (DANGEROUS OPERATION)
   * Use this for GDPR compliance or account deletion
   */
  async deleteUserData(userId: string): Promise<void> {
    if (!adminDb) throw new Error('Admin SDK not initialized');
    
    console.log(`Starting user data deletion for userId: ${userId}`);
    
    const batch = adminDb.batch();
    let operationCount = 0;
    
    try {
      // Delete user's pages and their blocks
      const pagesSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('pages')
        .get();
      
      for (const pageDoc of pagesSnapshot.docs) {
        // Delete page blocks first
        const blocksSnapshot = await pageDoc.ref.collection('blocks').get();
        blocksSnapshot.docs.forEach(blockDoc => {
          batch.delete(blockDoc.ref);
          operationCount++;
        });
        
        // Delete page
        batch.delete(pageDoc.ref);
        operationCount++;
      }
      
      // Delete archived pages
      const archivedPagesSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('archivedPages')
        .get();
      
      archivedPagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        operationCount++;
      });
      
      // Delete archived blocks
      const archivedBlocksSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('archivedBlocks')
        .get();
      
      archivedBlocksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        operationCount++;
      });
      
      // Commit all deletions
      await batch.commit();
      
      console.log(`Successfully deleted ${operationCount} documents for user ${userId}`);
    } catch (error) {
      console.error(`Failed to delete user data for ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Find and clean up orphaned blocks (blocks without parent pages)
   */
  async cleanupOrphanedBlocks(): Promise<number> {
    if (!adminDb) throw new Error('Admin SDK not initialized');
    
    console.log('Starting orphaned blocks cleanup...');
    
    let cleanedCount = 0;
    const usersSnapshot = await adminDb.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      // Get all pages for this user
      const pagesSnapshot = await userDoc.ref.collection('pages').get();
      const validPageIds = new Set(pagesSnapshot.docs.map(doc => doc.id));
      
      // Check archived blocks for invalid pageIds
      const archivedBlocksSnapshot = await userDoc.ref.collection('archivedBlocks').get();
      const batch = adminDb.batch();
      
      for (const archivedBlockDoc of archivedBlocksSnapshot.docs) {
        const archivedBlock = archivedBlockDoc.data();
        if (archivedBlock.originalPageId && !validPageIds.has(archivedBlock.originalPageId)) {
          // This archived block references a non-existent page
          batch.delete(archivedBlockDoc.ref);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        await batch.commit();
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} orphaned blocks`);
    return cleanedCount;
  },

  /**
   * Get comprehensive system statistics
   */
  async getSystemStats(): Promise<SystemStats> {
    if (!adminDb) throw new Error('Admin SDK not initialized');
    
    console.log('Generating system statistics...');
    
    const usersSnapshot = await adminDb.collection('users').get();
    let totalPages = 0;
    let totalBlocks = 0;
    let totalArchivedPages = 0;
    let totalArchivedBlocks = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      // Count pages
      const pagesSnapshot = await userDoc.ref.collection('pages').get();
      totalPages += pagesSnapshot.size;
      
      // Count blocks
      for (const pageDoc of pagesSnapshot.docs) {
        const blocksSnapshot = await pageDoc.ref.collection('blocks').get();
        totalBlocks += blocksSnapshot.size;
      }
      
      // Count archived items
      const archivedPagesSnapshot = await userDoc.ref.collection('archivedPages').get();
      totalArchivedPages += archivedPagesSnapshot.size;
      
      const archivedBlocksSnapshot = await userDoc.ref.collection('archivedBlocks').get();
      totalArchivedBlocks += archivedBlocksSnapshot.size;
    }
    
    const stats: SystemStats = {
      totalUsers: usersSnapshot.size,
      totalPages,
      totalBlocks,
      totalArchivedPages,
      totalArchivedBlocks,
      timestamp: new Date(),
    };
    
    console.log('System statistics generated:', stats);
    return stats;
  },

  /**
   * Get detailed data summary for a specific user
   */
  async getUserDataSummary(userId: string): Promise<UserDataSummary> {
    if (!adminDb) throw new Error('Admin SDK not initialized');
    
    const userRef = adminDb.collection('users').doc(userId);
    
    // Count pages
    const pagesSnapshot = await userRef.collection('pages').get();
    const pagesCount = pagesSnapshot.size;
    
    // Count blocks
    let blocksCount = 0;
    for (const pageDoc of pagesSnapshot.docs) {
      const blocksSnapshot = await pageDoc.ref.collection('blocks').get();
      blocksCount += blocksSnapshot.size;
    }
    
    // Count archived items
    const archivedPagesSnapshot = await userRef.collection('archivedPages').get();
    const archivedPagesCount = archivedPagesSnapshot.size;
    
    const archivedBlocksSnapshot = await userRef.collection('archivedBlocks').get();
    const archivedBlocksCount = archivedBlocksSnapshot.size;
    
    // Find last activity (most recent page or block update)
    let lastActivity: Date | undefined;
    
    for (const pageDoc of pagesSnapshot.docs) {
      const pageData = pageDoc.data();
      if (pageData.updatedAt && pageData.updatedAt.toDate) {
        const pageDate = pageData.updatedAt.toDate();
        if (!lastActivity || pageDate > lastActivity) {
          lastActivity = pageDate;
        }
      }
    }
    
    return {
      userId,
      pagesCount,
      blocksCount,
      archivedPagesCount,
      archivedBlocksCount,
      lastActivity,
    };
  },

  /**
   * Migrate data across all users (useful for schema changes)
   */
  async migrateAllUserData<T>(
    migrationName: string,
    migrationFn: (userId: string, userData: Record<string, unknown>) => Promise<T>
  ): Promise<{ success: number; errors: number; results: T[] }> {
    if (!adminDb) throw new Error('Admin SDK not initialized');
    
    console.log(`Starting migration: ${migrationName}`);
    
    const usersSnapshot = await adminDb.collection('users').get();
    const results: T[] = [];
    let success = 0;
    let errors = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const result = await migrationFn(userDoc.id, userDoc.data());
        results.push(result);
        success++;
        console.log(`Migration ${migrationName} succeeded for user ${userDoc.id}`);
      } catch (error) {
        errors++;
        console.error(`Migration ${migrationName} failed for user ${userDoc.id}:`, error);
      }
    }
    
    console.log(`Migration ${migrationName} completed: ${success} success, ${errors} errors`);
    return { success, errors, results };
  }
};

// Export the admin app for advanced use cases
export { adminApp };
