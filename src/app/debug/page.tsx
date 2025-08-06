'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPages, createPage, createBlock } from '@/lib/firestore';

export default function DebugPage() {
  const { user, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});
  const [testResults, setTestResults] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    if (!user) {
      addLog('❌ No user found');
      return;
    }

    try {
      addLog('🔄 Starting tests...');
      
      // Test 1: Get pages
      addLog('📄 Testing getPages...');
      const pages = await getPages(user.uid);
      addLog(`✅ getPages returned ${pages.length} pages`);
      
      // Test 2: Create a test page if none exist
      if (pages.length === 0) {
        addLog('🆕 Creating test page...');
        const pageId = await createPage(user.uid, 'Debug Test Page');
        addLog(`✅ Created page with ID: ${pageId}`);
      }
      
      // Test 3: Create a test block
      const pageId = pages[0]?.id || (await createPage(user.uid, 'Debug Test Page'));
      addLog('📝 Testing createBlock...');
      
      const testBlock = {
        type: 'paragraph' as const,
        content: 'Debug test block',
        indentLevel: 0,
        order: 0,
      };
      
      const blockId = await createBlock(user.uid, pageId, testBlock);
      addLog(`✅ Created block with ID: ${blockId}`);
      
      addLog('🎉 All tests passed!');
      
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
    }
  };

  useEffect(() => {
    const info = {
      user: user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      } : null,
      loading,
      environment: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) + '...',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      },
      timestamp: new Date().toISOString()
    };
    
    setDebugInfo(info);
    console.log('🐛 Debug Info:', info);
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🐛 Debug Dashboard</h1>
        
        {/* User Info */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">👤 User Information</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* Test Runner */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Firebase Tests</h2>
          <button
            onClick={runTests}
            disabled={!user}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
          >
            Run Firebase Tests
          </button>
          
          <div className="bg-gray-100 p-4 rounded max-h-96 overflow-auto">
            <h3 className="font-medium mb-2">Test Results:</h3>
            {testResults.length === 0 ? (
              <p className="text-gray-500">No tests run yet</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">🔗 Navigation</h2>
          <div className="space-x-4">
            <a href="/app" className="text-blue-500 hover:underline">
              → Go to App
            </a>
            <a href="/login" className="text-blue-500 hover:underline">
              → Login Page
            </a>
            <button
              onClick={() => window.location.reload()}
              className="text-green-500 hover:underline"
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
