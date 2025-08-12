import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { NotionService } from '@/lib/notion';

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    // Get user from the request (you might need to implement auth middleware)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's Notion API key from their settings
    const settingsRef = doc(db, 'users', userId, 'settings', 'notion');
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      return NextResponse.json(
        { error: 'Notion integration not configured' },
        { status: 400 }
      );
    }

    const settings = settingsDoc.data();
    const apiKey = settings?.apiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Notion API key not found' },
        { status: 400 }
      );
    }

    // Initialize Notion service with user's API key
    const notionService = new NotionService(apiKey);
    
    // Fetch page content
    const pageContent = await notionService.getPage(params.pageId);
    
    if (!pageContent) {
      return NextResponse.json(
        { error: 'Failed to fetch page content' },
        { status: 404 }
      );
    }

    return NextResponse.json(pageContent);

  } catch (error: any) {
    console.error('Notion API error:', error);
    
    // Handle specific Notion API errors
    if (error.code === 'object_not_found') {
      return NextResponse.json(
        { error: 'Page not found or not accessible' },
        { status: 404 }
      );
    }
    
    if (error.code === 'unauthorized') {
      return NextResponse.json(
        { error: 'Invalid API key or insufficient permissions' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Test Notion connection
export async function POST(request: NextRequest) {
  try {
    const { apiKey, userId } = await request.json();
    
    if (!apiKey || !userId) {
      return NextResponse.json(
        { error: 'API key and user ID required' },
        { status: 400 }
      );
    }

    // Test the API key
    const notionService = new NotionService(apiKey);
    const isValid = await notionService.testConnection();
    
    return NextResponse.json({ valid: isValid });

  } catch (error: any) {
    console.error('Notion connection test error:', error);
    return NextResponse.json(
      { error: error.message || 'Connection test failed' },
      { status: 500 }
    );
  }
}