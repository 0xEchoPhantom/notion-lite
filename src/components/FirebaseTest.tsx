'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useBlocks } from '@/contexts/BlocksContext';
import { createBlock, getBlocks } from '@/lib/firestore';
import { useState } from 'react';

export const FirebaseTest = () => {
  const { user } = useAuth();
  const { blocks } = useBlocks();
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    if (!user) {
      setTestResult('❌ No user authenticated');
      return;
    }

    setLoading(true);
    setTestResult('🧪 Testing Firebase connection...');

    try {
      // Test 1: Create a test block
      setTestResult('📝 Creating test block...');
      const testPageId = 'test-page-' + Date.now();
      
      const blockId = await createBlock(user.uid, testPageId, {
        type: 'paragraph',
        content: 'Test block created at ' + new Date().toISOString(),
        order: 0,
        indentLevel: 0
      });
      
      setTestResult(`✅ Test block created with ID: ${blockId}`);
      
      // Test 2: Read blocks
      setTimeout(async () => {
        try {
          setTestResult('📖 Reading blocks...');
          const readBlocks = await getBlocks(user.uid, testPageId);
          setTestResult(`✅ Successfully read ${readBlocks.length} block(s). Current app has ${blocks.length} blocks.`);
        } catch (error) {
          setTestResult(`❌ Error reading blocks: ${error}`);
        }
      }, 1000);
      
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2">🔥 Firebase Connection Test</h3>
      <p className="text-sm text-gray-600 mb-2">
        User: {user ? `✅ ${user.email}` : '❌ Not authenticated'}
      </p>
      <p className="text-sm text-gray-600 mb-2">
        Current blocks: {blocks.length}
      </p>
      <button
        onClick={runTest}
        disabled={!user || loading}
        className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
      >
        {loading ? '⏳ Testing...' : '🧪 Test Firebase'}
      </button>
      {testResult && (
        <div className="mt-2 p-2 bg-white rounded text-sm border">
          {testResult}
        </div>
      )}
    </div>
  );
};
