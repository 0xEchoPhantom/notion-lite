import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Workspace, WorkspaceMode, PageReference, GTD_PAGES } from '@/types/workspace';

// ===== WORKSPACE OPERATIONS =====

export const createWorkspace = async (
  userId: string, 
  name: string, 
  mode: WorkspaceMode,
  isDefault: boolean = false
): Promise<Workspace> => {
  try {
    const workspaceData = {
      name,
      mode,
      userId,
      isDefault,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'workspaces'), workspaceData);
    
    const workspace: Workspace = {
      id: docRef.id,
      ...workspaceData,
      createdAt: workspaceData.createdAt.toDate(),
      updatedAt: workspaceData.updatedAt.toDate(),
    };

    // If GTD workspace, create fixed pages
    if (mode === 'gtd') {
      await createGTDPages(userId, docRef.id);
    }

    console.log(`Created ${mode} workspace:`, workspace.name);
    return workspace;
  } catch (error) {
    console.error('Error creating workspace:', error);
    throw error;
  }
};

export const getUserWorkspaces = async (userId: string): Promise<Workspace[]> => {
  try {
    const workspacesRef = collection(db, 'workspaces');
    const q = query(
      workspacesRef, 
      where('userId', '==', userId)
      // Temporarily remove orderBy to avoid index requirement
      // orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const workspaces = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Workspace[];

    // Sort manually in JavaScript
    workspaces.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    console.log(`Found ${workspaces.length} workspaces for user`);
    return workspaces;
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    throw error;
  }
};

export const getWorkspace = async (workspaceId: string): Promise<Workspace | null> => {
  try {
    const docRef = doc(db, 'workspaces', workspaceId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate() || new Date(),
      updatedAt: snapshot.data().updatedAt?.toDate() || new Date(),
    } as Workspace;
  } catch (error) {
    console.error('Error fetching workspace:', error);
    throw error;
  }
};

// ===== GTD PAGES CREATION =====

const createGTDPages = async (userId: string, workspaceId: string) => {
  try {
    const batch = writeBatch(db);
    
    GTD_PAGES.forEach((pageConfig) => {
      const pageRef = doc(collection(db, 'users', userId, 'pages'));
      batch.set(pageRef, {
        title: `${pageConfig.emoji} ${pageConfig.title}`,
        order: pageConfig.order,
        workspaceId,
        isFixed: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();
    console.log(`Created ${GTD_PAGES.length} GTD pages for workspace ${workspaceId}`);
  } catch (error) {
    console.error('Error creating GTD pages:', error);
    throw error;
  }
};

// ===== WORKSPACE PAGES =====

export const getWorkspacePages = async (userId: string, workspaceId: string) => {
  try {
    const pagesRef = collection(db, 'users', userId, 'pages');
    // Simple query without orderBy to avoid index requirements
    const q = query(
      pagesRef,
      where('workspaceId', '==', workspaceId)
    );
    
    const snapshot = await getDocs(q);
    const pages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    // Client-side sorting by order field (more reliable than Firestore orderBy)
    pages.sort((a: any, b: any) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // Secondary sort by creation time if orders are equal
      return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
    });

    console.log(`Found ${pages.length} pages in workspace ${workspaceId}:`, pages.map((p: any) => p.title));
    return pages;
  } catch (error) {
    console.error('Error fetching workspace pages:', error);
    throw error;
  }
};

export const createWorkspacePage = async (
  userId: string, 
  workspaceId: string, 
  title: string = 'Untitled'
): Promise<string> => {
  try {
    // Get highest order number for workspace pages
    const existingPages = await getWorkspacePages(userId, workspaceId);
    const maxOrder = existingPages.length > 0 
      ? Math.max(...existingPages.map((p: any) => p.order || 0))
      : 0;

    const pageRef = doc(collection(db, 'users', userId, 'pages'));
    const pageData = {
      title,
      order: maxOrder + 1,
      workspaceId,
      isFixed: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const batch = writeBatch(db);
    batch.set(pageRef, pageData);
    await batch.commit();

    console.log(`Created workspace page: ${title} in workspace ${workspaceId}`);
    return pageRef.id;
  } catch (error) {
    console.error('Error creating workspace page:', error);
    throw error;
  }
};

// ===== CROSS-WORKSPACE TAGGING =====

export const tagPageToGTD = async (
  originalPageId: string,
  originalWorkspaceId: string,
  gtdWorkspaceId: string,
  gtdPageId: string
): Promise<PageReference> => {
  try {
    const referenceData = {
      originalPageId,
      originalWorkspaceId,
      gtdWorkspaceId,
      gtdPageId,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'pageReferences'), referenceData);
    
    const reference: PageReference = {
      id: docRef.id,
      ...referenceData,
      createdAt: referenceData.createdAt.toDate(),
    };

    console.log('Created page reference:', reference);
    return reference;
  } catch (error) {
    console.error('Error creating page reference:', error);
    throw error;
  }
};

export const getPageReferences = async (gtdWorkspaceId: string): Promise<PageReference[]> => {
  try {
    const referencesRef = collection(db, 'pageReferences');
    const q = query(
      referencesRef,
      where('gtdWorkspaceId', '==', gtdWorkspaceId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const references = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as PageReference[];

    console.log(`Found ${references.length} page references for GTD workspace`);
    return references;
  } catch (error) {
    console.error('Error fetching page references:', error);
    throw error;
  }
};

// ===== MIGRATION HELPERS =====

export const initializeUserWorkspaces = async (userId: string): Promise<{
  gtdWorkspace: Workspace;
  notesWorkspace: Workspace;
}> => {
  try {
    console.log('Initializing workspaces for user:', userId);
    
    // Check if workspaces already exist
    const existingWorkspaces = await getUserWorkspaces(userId);
    
    let gtdWorkspace = existingWorkspaces.find(w => w.mode === 'gtd');
    let notesWorkspace = existingWorkspaces.find(w => w.mode === 'notes');

    // Create GTD workspace if it doesn't exist
    if (!gtdWorkspace) {
      gtdWorkspace = await createWorkspace(userId, 'GTD Workflow', 'gtd', false);
    }

    // Create Notes workspace if it doesn't exist
    if (!notesWorkspace) {
      notesWorkspace = await createWorkspace(userId, 'Notes & Ideas', 'notes', true);
    }

    return { gtdWorkspace, notesWorkspace };
  } catch (error) {
    console.error('Error initializing user workspaces:', error);
    throw error;
  }
};
