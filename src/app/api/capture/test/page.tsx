"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';

export default function CaptureTestPage() {
  const { user } = useAuth();
  const [testContent, setTestContent] = useState('[] Test capture from debug page');
  const [apiKey, setApiKey] = useState('quick-capture-dev-key');
  const [customUserId, setCustomUserId] = useState('');
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setCustomUserId(user.uid);
      loadApiKey();
    }
  }, [user]);

  const loadApiKey = async () => {
    if (!user) return;
    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'capture');
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists() && settingsDoc.data().apiKey) {
        setApiKey(settingsDoc.data().apiKey);
        addLog('Loaded API key from settings');
      }
    } catch (error) {
      addLog(`Failed to load API key: ${error}`);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testCapture = async () => {
    setLoading(true);
    setResponse(null);
    setLogs([]);
    
    const url = `${window.location.origin}/api/capture`;
    addLog(`Testing capture to: ${url}`);
    addLog(`Using API key: ${apiKey}`);
    addLog(`User ID: ${customUserId}`);
    addLog(`Content: ${testContent}`);

    try {
      const startTime = Date.now();
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: testContent,
          userId: customUserId,
          pageTitle: 'Inbox'
        })
      });

      const duration = Date.now() - startTime;
      addLog(`Response received in ${duration}ms`);
      addLog(`Status: ${res.status} ${res.statusText}`);

      const data = await res.json();
      setResponse(data);
      
      if (res.ok) {
        addLog('✅ Capture successful!');
        addLog(`Block ID: ${data.blockId}`);
        addLog(`Page ID: ${data.pageId}`);
      } else {
        addLog(`❌ Capture failed: ${data.error}`);
      }

    } catch (error) {
      addLog(`❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
      setResponse({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testGetStatus = async () => {
    setLoading(true);
    setResponse(null);
    setLogs([]);
    
    const url = `${window.location.origin}/api/capture`;
    addLog(`Getting API status from: ${url}`);

    try {
      const res = await fetch(url, {
        method: 'GET',
      });

      addLog(`Status: ${res.status} ${res.statusText}`);
      const data = await res.json();
      setResponse(data);
      addLog('✅ API is accessible');

    } catch (error) {
      addLog(`❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
      setResponse({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testPythonScript = () => {
    const script = `
import requests
import json

# Test configuration
url = "${window.location.origin}/api/capture"
api_key = "${apiKey}"
user_id = "${customUserId}"

# Test capture
response = requests.post(
    url,
    headers={
        "x-api-key": api_key,
        "Content-Type": "application/json"
    },
    json={
        "content": "${testContent}",
        "userId": user_id,
        "pageTitle": "Inbox"
    }
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
`;
    navigator.clipboard.writeText(script);
    addLog('✅ Python script copied to clipboard');
  };

  const testCurlCommand = () => {
    const command = `curl -X POST ${window.location.origin}/api/capture \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "${testContent}",
    "userId": "${customUserId}",
    "pageTitle": "Inbox"
  }'`;
    navigator.clipboard.writeText(command);
    addLog('✅ curl command copied to clipboard');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Quick Capture Debug Tool</h1>
      
      {/* Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Configuration</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder="your-api-key"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
          <input
            type="text"
            value={customUserId}
            onChange={(e) => setCustomUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder="your-user-id"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content to Capture</label>
          <input
            type="text"
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Enter test content"
          />
          <p className="text-xs text-gray-500 mt-1">
            Try: &quot;[] Test todo&quot;, &quot;[x] Done&quot;, or plain text
          </p>
        </div>
      </div>

      {/* Test Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Actions</h2>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={testGetStatus}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Check API Status
          </button>
          
          <button
            onClick={testCapture}
            disabled={loading || !customUserId || !apiKey}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Capture'}
          </button>

          <button
            onClick={testPythonScript}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Copy Python Script
          </button>

          <button
            onClick={testCurlCommand}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Copy curl Command
          </button>
        </div>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Debug Logs</h3>
          <div className="font-mono text-xs space-y-1">
            {logs.map((log, i) => (
              <div key={i} className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Response</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">Debugging Steps</h2>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>First, click &quot;Check API Status&quot; to verify the API is accessible</li>
          <li>Ensure your User ID and API Key are correct</li>
          <li>Click &quot;Test Capture&quot; to send a test capture</li>
          <li>Check the Debug Logs for any errors</li>
          <li>Open browser DevTools (F12) → Network tab to see the request</li>
          <li>Check the Console for server-side logs</li>
          <li>If successful, check your Inbox page for the new item</li>
        </ol>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-700">
            <strong>Common Issues:</strong><br/>
            • 401 Error: Check your API key<br/>
            • 400 Error: Verify User ID and content format<br/>
            • Network Error: Check if the app is running<br/>
            • No items in Inbox: Check Firebase permissions
          </p>
        </div>
      </div>
    </div>
  );
}