"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase/client';
import type { TaskCompany } from '@/types/task';

// Tab types
type TabType = 'general' | 'tokens' | 'notion' | 'admin' | 'account';

interface TokenSettings {
  assignees: string[];
  companies: TaskCompany[];
  commonValues: number[];
  commonEfforts: number[];
  defaultCompany?: TaskCompany;
}

const DEFAULT_COMPANIES: TaskCompany[] = ['AIC', 'WN', 'BXV', 'EA', 'PERSONAL'];
const DEFAULT_VALUES = [10000, 50000, 100000, 500000, 1000000, 5000000, 10000000];
const DEFAULT_EFFORTS = [0.25, 0.5, 1, 2, 4, 8, 16, 40, 80, 160];

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Token settings state
  const [tokenSettings, setTokenSettings] = useState<TokenSettings>({
    assignees: [],
    companies: DEFAULT_COMPANIES,
    commonValues: DEFAULT_VALUES,
    commonEfforts: DEFAULT_EFFORTS,
  });
  const [newAssignee, setNewAssignee] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newEffort, setNewEffort] = useState('');
  const [newCompany, setNewCompany] = useState('');

  // Admin dashboard state
  const [stats, setStats] = useState({
    totalBlocks: 0,
    totalPages: 0,
    todoBlocks: 0,
    completedTodos: 0
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSettings();
    if (activeTab === 'admin') {
      loadAdminStats();
    }
  }, [user, activeTab]);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'tokens');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as TokenSettings;
        setTokenSettings({
          assignees: data.assignees || [],
          companies: data.companies || DEFAULT_COMPANIES,
          commonValues: data.commonValues || DEFAULT_VALUES,
          commonEfforts: data.commonEfforts || DEFAULT_EFFORTS,
          defaultCompany: data.defaultCompany
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const loadAdminStats = async () => {
    if (!user) return;
    try {
      // Get total blocks
      const blocksSnapshot = await getDocs(
        query(collection(db, 'users', user.uid, 'blocks'))
      );
      const totalBlocks = blocksSnapshot.size;
      
      // Count todo blocks and completed
      let todoBlocks = 0;
      let completedTodos = 0;
      blocksSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'todo-list') {
          todoBlocks++;
          if (data.isChecked) completedTodos++;
        }
      });

      // Get total pages
      const pagesSnapshot = await getDocs(
        query(collection(db, 'users', user.uid, 'pages'))
      );
      const totalPages = pagesSnapshot.size;

      setStats({
        totalBlocks,
        totalPages,
        todoBlocks,
        completedTodos
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  const saveTokenSettings = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    
    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'tokens');
      await setDoc(settingsRef, {
        ...tokenSettings,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sign out' });
    }
  };

  const cleanupOrphanedBlocks = async () => {
    if (!user) return;
    if (!confirm('This will delete all blocks that are not associated with any page. Continue?')) return;
    
    try {
      const blocksSnapshot = await getDocs(
        query(collection(db, 'users', user.uid, 'blocks'))
      );
      
      const pagesSnapshot = await getDocs(
        query(collection(db, 'users', user.uid, 'pages'))
      );
      
      const validPageIds = new Set(pagesSnapshot.docs.map(doc => doc.id));
      
      let deletedCount = 0;
      for (const blockDoc of blocksSnapshot.docs) {
        const blockData = blockDoc.data();
        if (!blockData.pageId || !validPageIds.has(blockData.pageId)) {
          await deleteDoc(doc(db, 'users', user.uid, 'blocks', blockDoc.id));
          deletedCount++;
        }
      }
      
      setMessage({ type: 'success', text: `Cleaned up ${deletedCount} orphaned blocks` });
      loadAdminStats();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cleanup blocks' });
    }
  };

  // Token management handlers
  const addAssignee = () => {
    if (newAssignee.trim() && !tokenSettings.assignees.includes(newAssignee.trim())) {
      setTokenSettings(prev => ({
        ...prev,
        assignees: [...prev.assignees, newAssignee.trim()].sort()
      }));
      setNewAssignee('');
    }
  };

  const removeAssignee = (assignee: string) => {
    setTokenSettings(prev => ({
      ...prev,
      assignees: prev.assignees.filter(a => a !== assignee)
    }));
  };

  const addValue = () => {
    const value = parseValueInput(newValue);
    if (value && !tokenSettings.commonValues.includes(value)) {
      setTokenSettings(prev => ({
        ...prev,
        commonValues: [...prev.commonValues, value].sort((a, b) => a - b)
      }));
      setNewValue('');
    }
  };

  const removeValue = (value: number) => {
    setTokenSettings(prev => ({
      ...prev,
      commonValues: prev.commonValues.filter(v => v !== value)
    }));
  };

  const addEffort = () => {
    const effort = parseEffortInput(newEffort);
    if (effort && !tokenSettings.commonEfforts.includes(effort)) {
      setTokenSettings(prev => ({
        ...prev,
        commonEfforts: [...prev.commonEfforts, effort].sort((a, b) => a - b)
      }));
      setNewEffort('');
    }
  };

  const removeEffort = (effort: number) => {
    setTokenSettings(prev => ({
      ...prev,
      commonEfforts: prev.commonEfforts.filter(e => e !== effort)
    }));
  };

  const addCompany = () => {
    const company = newCompany.trim().toUpperCase();
    if (company && !tokenSettings.companies.includes(company as TaskCompany)) {
      setTokenSettings(prev => ({
        ...prev,
        companies: [...prev.companies, company as TaskCompany].sort()
      }));
      setNewCompany('');
    }
  };

  const removeCompany = (company: string) => {
    setTokenSettings(prev => ({
      ...prev,
      companies: prev.companies.filter(c => c !== company)
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/app')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tokens'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Token Manager
            </button>
            <button
              onClick={() => setActiveTab('notion')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notion'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notion Integration
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'admin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Admin Dashboard
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'account'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Account
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">General Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default View
                      </label>
                      <select className="border rounded-lg px-3 py-2 w-full max-w-xs">
                        <option>Notes</option>
                        <option>GTD Tasks</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select className="border rounded-lg px-3 py-2 w-full max-w-xs">
                        <option>Light</option>
                        <option>Dark (Coming Soon)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Token Manager Tab */}
            {activeTab === 'tokens' && (
              <div className="space-y-6">
                {/* Team Members */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">👤 Team Members</h2>
                  <p className="text-sm text-gray-600 mb-4">People who can be assigned to tasks</p>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder="Enter name (e.g., John, Sarah)"
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addAssignee()}
                    />
                    <button
                      onClick={addAssignee}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {tokenSettings.assignees.map(assignee => (
                      <span
                        key={assignee}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm"
                      >
                        {assignee}
                        <button
                          onClick={() => removeAssignee(assignee)}
                          className="text-amber-500 hover:text-amber-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {tokenSettings.assignees.length === 0 && (
                      <span className="text-gray-400 text-sm">No team members added yet</span>
                    )}
                  </div>
                </div>

                {/* Common Values */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">💵 Common Values</h2>
                  <p className="text-sm text-gray-600 mb-4">Frequently used monetary values</p>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder="Enter value (e.g., 10k, 1M, 500000)"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addValue()}
                    />
                    <button
                      onClick={addValue}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {tokenSettings.commonValues.map(value => (
                      <span
                        key={value}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                      >
                        {formatValue(value)}
                        <button
                          onClick={() => removeValue(value)}
                          className="text-green-500 hover:text-green-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Common Efforts */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">⏱️ Common Efforts</h2>
                  <p className="text-sm text-gray-600 mb-4">Frequently used time estimates</p>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder="Enter effort (e.g., 30m, 2h, 3d, 1w)"
                      value={newEffort}
                      onChange={(e) => setNewEffort(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addEffort()}
                    />
                    <button
                      onClick={addEffort}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {tokenSettings.commonEfforts.map(effort => (
                      <span
                        key={effort}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {formatEffort(effort)}
                        <button
                          onClick={() => removeEffort(effort)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Companies/Organizations */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">🏢 Organizations</h2>
                  <p className="text-sm text-gray-600 mb-4">Company codes for task categorization</p>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder="Enter company code (e.g., ACME, IBM)"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && addCompany()}
                    />
                    <button
                      onClick={addCompany}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {tokenSettings.companies.map(company => (
                      <span
                        key={company}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {company}
                        <button
                          onClick={() => removeCompany(company)}
                          className="text-purple-500 hover:text-purple-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {tokenSettings.companies.length === 0 && (
                      <span className="text-gray-400 text-sm">No organizations added yet</span>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={saveTokenSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Token Settings'}
                  </button>
                </div>
              </div>
            )}

            {/* Notion Integration Tab */}
            {activeTab === 'notion' && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔗</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notion Integration</h3>
                  <p className="text-gray-600 mb-6">
                    Configure your Notion API to embed private pages and blocks
                  </p>
                  <button
                    onClick={() => window.open('/settings/notion', '_blank')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Open Notion Settings
                  </button>
                  <p className="text-xs text-gray-500 mt-3">
                    Configure API key, test connection, and manage integration settings
                  </p>
                </div>
              </div>
            )}

            {/* Admin Dashboard Tab */}
            {activeTab === 'admin' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="text-2xl font-bold text-gray-900">{stats.totalPages}</div>
                    <div className="text-sm text-gray-500">Total Pages</div>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="text-2xl font-bold text-gray-900">{stats.totalBlocks}</div>
                    <div className="text-sm text-gray-500">Total Blocks</div>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="text-2xl font-bold text-gray-900">{stats.todoBlocks}</div>
                    <div className="text-sm text-gray-500">Todo Items</div>
                  </div>
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="text-2xl font-bold text-gray-900">{stats.completedTodos}</div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>
                </div>

                {/* Maintenance */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Maintenance</h2>
                  <div className="space-y-4">
                    <div>
                      <button
                        onClick={cleanupOrphanedBlocks}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Clean Orphaned Blocks
                      </button>
                      <p className="text-sm text-gray-500 mt-2">
                        Remove blocks that are not associated with any page
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 text-sm text-gray-900">{user.email}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User ID</label>
                      <div className="mt-1 text-sm text-gray-900 font-mono">{user.uid}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Sign Out</h2>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Helper functions
function parseValueInput(input: string): number | undefined {
  const cleaned = input.replace(/[$,]/g, '').trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([KMB])?$/i);
  if (!match) return undefined;
  
  const [, numStr, multiplier] = match;
  const num = parseFloat(numStr);
  
  if (multiplier) {
    const multipliers: Record<string, number> = {
      K: 1000,
      M: 1000000,
      B: 1000000000
    };
    return num * multipliers[multiplier.toUpperCase()];
  }
  
  return num;
}

function parseEffortInput(input: string): number | undefined {
  const cleaned = input.trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([mhdwM])?$/);
  if (!match) return undefined;
  
  const [, numStr, unit = 'h'] = match;
  const num = parseFloat(numStr);
  
  const multipliers: Record<string, number> = {
    m: 1/60,
    h: 1,
    d: 8,
    w: 40,
    M: 160
  };
  
  return num * multipliers[unit.toLowerCase()];
}

function formatValue(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function formatEffort(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  if (hours >= 160) return `${(hours / 160).toFixed(1)}M`;
  if (hours >= 40) return `${(hours / 40).toFixed(1)}w`;
  if (hours >= 8) return `${(hours / 8).toFixed(1)}d`;
  return `${hours}h`;
}