"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/client';

interface NotionSettings {
  apiKey?: string;
  isConnected: boolean;
}

export default function NotionSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotionSettings>({
    isConnected: false,
  });
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'notion');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as NotionSettings;
        setSettings(data);
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      }
    } catch (error) {
      console.error('Failed to load Notion settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    if (!user) {
      setMessage({ type: 'error', text: 'Please sign in first' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      // Test connection using API route
      const response = await fetch('/api/notion/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          userId: user.uid,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.valid) {
        setMessage({ type: 'success', text: 'Connection successful!' });
        setSettings(prev => ({ ...prev, isConnected: true }));
      } else {
        setMessage({ type: 'error', text: result.error || 'Connection failed. Please check your API key.' });
        setSettings(prev => ({ ...prev, isConnected: false }));
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setMessage({ type: 'error', text: `Connection failed: ${(error as Error)?.message || 'Unknown error'}` });
      setSettings(prev => ({ ...prev, isConnected: false }));
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'notion');
      const settingsToSave: NotionSettings = {
        apiKey: apiKey.trim() || undefined,
        isConnected: settings.isConnected,
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

  const clearSettings = async () => {
    setApiKey('');
    setSettings({ isConnected: false });
    setMessage(null);
    
    // Clear from Firebase
    if (user) {
      try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'notion');
        await setDoc(settingsRef, {
          apiKey: null,
          isConnected: false,
          updatedAt: serverTimestamp(),
          userId: user.uid
        }, { merge: true });
      } catch (error) {
        console.error('Failed to clear settings:', error);
      }
    }
  };

  if (!user) {
    return <div className="p-6 text-gray-600">Please sign in to configure Notion integration.</div>;
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
        <h1 className="text-2xl font-bold text-gray-900">Notion Integration</h1>
        <p className="text-gray-600">Connect your Notion workspace to embed pages and blocks</p>
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

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">🔗 Setup Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline">https://www.notion.so/my-integrations</a></li>
          <li>Click &quot;New integration&quot; and give it a name</li>
          <li>Select your workspace</li>
          <li>Copy the &quot;Internal Integration Token&quot;</li>
          <li>Paste it below and click &quot;Test Connection&quot;</li>
          <li>Share your Notion pages with the integration</li>
        </ol>
      </div>

      {/* API Key Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">API Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notion API Key (Internal Integration Token)
            </label>
            <input
              type="password"
              placeholder="secret_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your API key is stored securely and never shared
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={testing || !apiKey.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              onClick={saveSettings}
              disabled={saving || !apiKey.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            
            {apiKey && (
              <button
                onClick={clearSettings}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${settings.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-sm ${settings.isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {settings.isConnected ? 'Connected to Notion' : 'Not connected'}
            </span>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📝 How to Use</h2>
        <div className="space-y-2 text-gray-700">
          <p>1. Once connected, paste any Notion page URL into a block</p>
          <p>2. The page will automatically be detected and displayed</p>
          <p>3. Content is fetched privately using your API key</p>
          <p>4. No need to publish pages - works with private content</p>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-700">
            <strong>Note:</strong> Make sure to share your Notion pages with your integration. 
            Go to the page → Share → Invite → Select your integration.
          </p>
        </div>
      </div>
    </div>
  );
}