import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, userId } = await request.json();
    
    if (!apiKey || !userId) {
      return NextResponse.json(
        { error: 'API key and user ID required' },
        { status: 400 }
      );
    }

    // Test the API key by trying to list users (minimal permission test)
    const client = new Client({
      auth: apiKey,
    });

    try {
      await client.users.list({ page_size: 1 });
      return NextResponse.json({ valid: true });
    } catch (notionError: any) {
      console.error('Notion API test failed:', notionError);
      
      if (notionError.code === 'unauthorized') {
        return NextResponse.json(
          { valid: false, error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { valid: false, error: notionError.message || 'Connection test failed' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'Connection test failed' },
      { status: 500 }
    );
  }
}