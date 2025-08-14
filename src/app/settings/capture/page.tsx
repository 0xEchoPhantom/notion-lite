"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/client';

interface CaptureSettings {
  apiKey?: string;
  enabled: boolean;
}

export default function CaptureSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CaptureSettings>({
    enabled: false,
  });
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPythonCode, setShowPythonCode] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'capture');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as CaptureSettings;
        setSettings(data);
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      } else {
        // Generate a default API key
        const defaultKey = generateApiKey();
        setApiKey(defaultKey);
      }
    } catch (error) {
      console.error('Failed to load capture settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'nl_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const regenerateApiKey = () => {
    const newKey = generateApiKey();
    setApiKey(newKey);
    setMessage({ type: 'success', text: 'New API key generated. Remember to save!' });
  };

  const saveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'capture');
      const settingsToSave: CaptureSettings = {
        apiKey: apiKey.trim(),
        enabled: settings.enabled,
      };

      await setDoc(settingsRef, {
        ...settingsToSave,
        updatedAt: serverTimestamp(),
        userId: user.uid
      }, { merge: true });

      setSettings(settingsToSave);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
  };

  const getPythonCode = () => {
    const baseUrl = window.location.origin;
    return `import requests

# Configuration
NOTION_LITE_URL = "${baseUrl}"
API_KEY = "${apiKey}"
USER_ID = "${user?.uid || 'YOUR_USER_ID'}"

def quick_capture(content):
    response = requests.post(
        f"{NOTION_LITE_URL}/api/capture",
        headers={
            "x-api-key": API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "content": content,
            "userId": USER_ID,
            "pageTitle": "Inbox"
        }
    )
    return response.json()

# Example usage
quick_capture("[] Your task here")`;
  };

  if (!user) {
    return <div className="p-6 text-gray-600">Please sign in to configure quick capture.</div>;
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quick Capture API</h1>
        <p className="text-gray-600">Configure external quick capture to send thoughts directly to your inbox</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* User Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Information</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded font-mono text-sm">
                {user.uid}
              </code>
              <button
                onClick={() => copyToClipboard(user.uid)}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Use this ID in your quick capture app</p>
          </div>
        </div>
      </div>

      {/* API Key Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">API Key</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={apiKey}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50"
              />
              <button
                onClick={() => copyToClipboard(apiKey)}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Copy
              </button>
              <button
                onClick={regenerateApiKey}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Regenerate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Keep this key secure. Regenerate if compromised.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* API Usage */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">API Usage</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Endpoint</h3>
            <code className="block px-3 py-2 bg-white border rounded text-sm">
              POST {window.location.origin}/api/capture
            </code>
          </div>

          <div>
            <h3 className="font-medium text-gray-700 mb-2">Headers</h3>
            <pre className="px-3 py-2 bg-white border rounded text-sm overflow-x-auto">{`{
  "x-api-key": "${apiKey}",
  "Content-Type": "application/json"
}`}</pre>
          </div>

          <div>
            <h3 className="font-medium text-gray-700 mb-2">Body</h3>
            <pre className="px-3 py-2 bg-white border rounded text-sm overflow-x-auto">{`{
  "content": "Your thought or task",
  "userId": "${user.uid}",
  "pageTitle": "Inbox"  // optional
}`}</pre>
          </div>

          <div>
            <h3 className="font-medium text-gray-700 mb-2">Content Formats</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Plain text → Creates paragraph block</li>
              <li>• Start with <code>[]</code> or <code>TODO:</code> → Creates todo item</li>
              <li>• Start with <code>[x]</code> → Creates completed todo</li>
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setShowPythonCode(!showPythonCode)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showPythonCode ? 'Hide' : 'Show'} Python Example
          </button>
          
          {showPythonCode && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Python Integration Code</h3>
                <button
                  onClick={() => copyToClipboard(getPythonCode())}
                  className="text-sm px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Copy Code
                </button>
              </div>
              <pre className="px-3 py-2 bg-gray-900 text-gray-100 rounded text-sm overflow-x-auto">
                <code>{getPythonCode()}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">🚀 Integration with Your Python App</h2>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Copy your User ID and API Key from above</li>
          <li>Update your Python app to use the endpoint shown</li>
          <li>Replace Notion API calls with our capture endpoint</li>
          <li>Your captures will appear in your Inbox page</li>
          <li>Check the Python example code for implementation details</li>
        </ol>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-700">
            <strong>Tip:</strong> The API automatically detects todo items. Start your capture with [] for todos!
          </p>
        </div>
      </div>
    </div>
  );
}