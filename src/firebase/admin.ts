import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
const initAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Check if running in production (Vercel)
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    // Production: Use environment variables
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };

    return initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Development: Use client config (less secure but works for dev)
    // This allows the API routes to work in development without service account
    console.log('[Firebase Admin] Running in development mode - using client config');
    
    // Import client config
    const config = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'notion-lite-b96ef',
      // In development, we'll use client SDK in API routes
    };

    try {
      return initializeApp({
        projectId: config.projectId,
      });
    } catch (error) {
      console.error('[Firebase Admin] Failed to initialize:', error);
      throw error;
    }
  }
};

// Get or initialize admin app
let adminApp: any;
try {
  adminApp = initAdmin();
} catch (error) {
  console.error('[Firebase Admin] Initialization error:', error);
}

// Export admin services
export const adminDb = adminApp ? getFirestore(adminApp) : null;
export const adminAuth = adminApp ? getAuth(adminApp) : null;

// Helper function to check if admin is available
export const isAdminAvailable = () => {
  return adminApp !== null && adminDb !== null;
};