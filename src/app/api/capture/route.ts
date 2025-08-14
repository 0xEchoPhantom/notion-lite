import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase for server-side use
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Get or initialize Firebase app
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simple API key authentication
const CAPTURE_API_KEYS = process.env.CAPTURE_API_KEYS?.split(',') || [];

export async function POST(request: NextRequest) {
  console.log('[Capture API] Received request');
  
  try {
    // Get API key from header
    const apiKey = request.headers.get('x-api-key');
    console.log('[Capture API] API Key provided:', apiKey ? 'Yes' : 'No');
    
    // For development, allow a default key
    const validKeys = CAPTURE_API_KEYS.length > 0 ? CAPTURE_API_KEYS : ['quick-capture-dev-key'];
    console.log('[Capture API] Valid keys:', validKeys.length > 0 ? 'Configured' : 'Using default');
    
    if (!apiKey || !validKeys.includes(apiKey)) {
      console.error('[Capture API] Invalid API key:', apiKey);
      return NextResponse.json(
        { error: 'Invalid API key', receivedKey: apiKey },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[Capture API] Request body:', body);
    
    const { content, userId, pageTitle = 'Inbox' } = body;
    
    if (!content || !userId) {
      console.error('[Capture API] Missing required fields:', { content: !!content, userId: !!userId });
      return NextResponse.json(
        { error: 'Content and userId are required', received: { content: !!content, userId: !!userId } },
        { status: 400 }
      );
    }

    console.log('[Capture API] Processing capture for user:', userId);
    console.log('[Capture API] Target page:', pageTitle);
    console.log('[Capture API] Content:', content);

    // Find or create the inbox page
    const pagesRef = collection(db, 'users', userId, 'pages');
    const inboxQuery = query(pagesRef, where('title', '==', pageTitle));
    const inboxSnapshot = await getDocs(inboxQuery);
    console.log('[Capture API] Found existing pages:', inboxSnapshot.size);
    
    let pageId: string;
    
    if (inboxSnapshot.empty) {
      // Create inbox page if it doesn't exist
      pageId = uuidv4();
      console.log('[Capture API] Creating new page with ID:', pageId);
      
      const pageRef = doc(db, 'users', userId, 'pages', pageId);
      await setDoc(pageRef, {
        title: pageTitle,
        icon: '📥',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        userId: userId,
        blockIds: [],
        isGTD: pageTitle === 'Inbox' || pageTitle === 'GTD'
      });
      console.log('[Capture API] Page created successfully');
    } else {
      pageId = inboxSnapshot.docs[0].id;
      console.log('[Capture API] Using existing page:', pageId);
    }

    // Create a new block for the captured content
    const blockId = uuidv4();
    console.log('[Capture API] Creating block with ID:', blockId);
    
    const blockRef = doc(db, 'users', userId, 'blocks', blockId);
    
    // Determine block type based on content
    let blockType = 'paragraph';
    let processedContent = content;
    let isChecked = false;
    
    // Auto-convert to todo if it starts with common task indicators
    if (/^(\[ \]|\[\]|TODO:|TASK:|-)/.test(content.trim())) {
      blockType = 'todo-list';
      processedContent = content.replace(/^(\[ \]|\[\]|TODO:|TASK:|-)/, '').trim();
      console.log('[Capture API] Detected TODO format');
    }
    
    // If explicitly marked as done
    if (/^\[x\]|\[X\]/.test(content.trim())) {
      blockType = 'todo-list';
      isChecked = true;
      processedContent = content.replace(/^\[x\]|\[X\]/, '').trim();
      console.log('[Capture API] Detected completed TODO');
    }

    console.log('[Capture API] Block type:', blockType);
    console.log('[Capture API] Processed content:', processedContent);

    const blockData = {
      content: processedContent,
      type: blockType,
      isChecked: blockType === 'todo-list' ? isChecked : undefined,
      pageId: pageId,
      userId: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      indentLevel: 0,
      order: Date.now(), // Use timestamp for ordering new blocks at the bottom
      source: 'quick-capture'
    };

    await setDoc(blockRef, blockData);
    console.log('[Capture API] Block created successfully');

    // Update page to include the new block
    const pageRef = doc(db, 'users', userId, 'pages', pageId);
    const pageDoc = await getDoc(pageRef);
    
    if (pageDoc.exists()) {
      const pageData = pageDoc.data();
      const blockIds = pageData.blockIds || [];
      blockIds.push(blockId);
      
      console.log('[Capture API] Updating page with new block. Total blocks:', blockIds.length);
      
      await setDoc(pageRef, {
        ...pageData,
        blockIds: blockIds,
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      console.log('[Capture API] Page updated successfully');
    } else {
      console.warn('[Capture API] Page document not found after creation');
    }

    const response = {
      success: true,
      blockId: blockId,
      pageId: pageId,
      message: 'Content captured successfully',
      debug: {
        userId,
        pageTitle,
        blockType,
        contentLength: processedContent.length
      }
    };
    
    console.log('[Capture API] Success! Response:', response);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Capture API] ERROR:', error);
    console.error('[Capture API] Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to capture content',
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check API status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Quick capture API is running',
    usage: {
      endpoint: '/api/capture',
      method: 'POST',
      headers: {
        'x-api-key': 'your-api-key',
        'Content-Type': 'application/json'
      },
      body: {
        content: 'Your thought or task',
        userId: 'your-user-id',
        pageTitle: 'Inbox (optional, defaults to Inbox)'
      }
    }
  });
}