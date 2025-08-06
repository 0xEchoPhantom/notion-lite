'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPages, createPage, getBlocks, createBlock } from '@/lib/firestore';
import { Page, Block } from '@/types';

export default function SimpleTestPage() {
  const { user, loading } = useAuth();
  const [testContent, setTestContent] = useState('');
  const [status, setStatus] = useState('Ready');
  const [pages, setPages] = useState<Page[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);

  const log = (message: string) => {
    console.log(message);
    setStatus(message);
  };

  const initializeData = useCallback(async () => {
    if (!user) return;

    try {
      log('Loading pages...');
      let userPages = await getPages(user.uid);
      
      if (userPages.length === 0) {
        log('Creating initial page...');
        await createPage(user.uid, 'Test Page');
        userPages = await getPages(user.uid);
      }
      
      setPages(userPages);
      const pageId = userPages[0].id;
      setCurrentPageId(pageId);
      
      log('Loading blocks...');
      const pageBlocks = await getBlocks(user.uid, pageId);
      setBlocks(pageBlocks);
      
      log('Ready!');
    } catch (error) {
      log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
    }
  }, [user]);

  const createTestBlock = async () => {
    if (!user || !currentPageId) return;

    try {
      log('Creating test block...');
      
      const newBlock = {
        type: 'paragraph' as const,
        content: testContent || 'Test block content',
        indentLevel: 0,
        order: blocks.length,
      };

      console.log('Creating block with data:', newBlock);
      
      const blockId = await createBlock(user.uid, currentPageId, newBlock);
      log(`Block created with ID: ${blockId}`);
      
      // Refresh blocks
      const updatedBlocks = await getBlocks(user.uid, currentPageId);
      setBlocks(updatedBlocks);
      setTestContent('');
      
    } catch (error) {
      log(`Error creating block: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
    }
  };

  useEffect(() => {
    if (user && !loading) {
      initializeData();
    }
  }, [user, loading, initializeData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Please log in first</p>
          <a href="/login" className="text-blue-500 hover:underline">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🧪 Simple Test Editor</h1>
        
        <div className="bg-white border rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">Status: <span className="font-mono">{status}</span></p>
          <p className="text-sm text-gray-600 mb-2">Pages: {pages.length}</p>
          <p className="text-sm text-gray-600 mb-2">Blocks: {blocks.length}</p>
        </div>

        <div className="bg-white border rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Create Test Block</h3>
          <input
            type="text"
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            placeholder="Enter test content..."
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <button
            onClick={createTestBlock}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Block
          </button>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Blocks ({blocks.length})</h3>
          {blocks.length === 0 ? (
            <p className="text-gray-500">No blocks yet</p>
          ) : (
            <div className="space-y-2">
              {blocks.map((block) => (
                <div key={block.id} className="border rounded p-2 bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Type: {block.type} | Order: {block.order}
                  </div>
                  <div>{block.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <a href="/debug" className="text-blue-500 hover:underline mr-4">
            → Full Debug Page
          </a>
          <a href="/app" className="text-blue-500 hover:underline">
            → Main App
          </a>
        </div>
      </div>
    </div>
  );
}
