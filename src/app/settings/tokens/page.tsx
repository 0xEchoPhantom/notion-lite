"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/client';
import type { TaskCompany } from '@/types/task';

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

export default function TokenManagerPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TokenSettings>({
    assignees: [],
    companies: DEFAULT_COMPANIES,
    commonValues: DEFAULT_VALUES,
    commonEfforts: DEFAULT_EFFORTS,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Form states
  const [newAssignee, setNewAssignee] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newEffort, setNewEffort] = useState('');

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'tokens');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as TokenSettings;
        setSettings({
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

  const saveSettings = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to save settings' });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      // Ensure we have a valid user ID
      const userId = user.uid;
      if (!userId) {
        throw new Error('User ID is missing');
      }
      
      const settingsRef = doc(db, 'users', userId, 'settings', 'tokens');
      
      // Prepare data ensuring all values are serializable
      const dataToSave = {
        assignees: settings.assignees || [],
        companies: settings.companies || DEFAULT_COMPANIES,
        commonValues: settings.commonValues || DEFAULT_VALUES,
        commonEfforts: settings.commonEfforts || DEFAULT_EFFORTS,
        defaultCompany: settings.defaultCompany || null,
        updatedAt: serverTimestamp(),
        userId: userId
      };
      
      // Log what we're trying to save
      console.log('Saving settings:', {
        path: `users/${userId}/settings/tokens`,
        data: dataToSave,
        user: user.email
      });
      
      // Use set instead of setDoc with merge to ensure clean save
      await setDoc(settingsRef, dataToSave);
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Reload settings to confirm save
      setTimeout(() => loadSettings(), 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      
      // Provide more detailed error messages
      let errorMessage = 'Failed to save settings';
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please ensure you are logged in.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  // Handlers for adding/removing items
  const addAssignee = () => {
    if (newAssignee.trim() && !settings.assignees.includes(newAssignee.trim())) {
      setSettings(prev => ({
        ...prev,
        assignees: [...prev.assignees, newAssignee.trim()].sort()
      }));
      setNewAssignee('');
    }
  };

  const removeAssignee = (assignee: string) => {
    setSettings(prev => ({
      ...prev,
      assignees: prev.assignees.filter(a => a !== assignee)
    }));
  };

  const addValue = () => {
    const value = parseValueInput(newValue);
    if (value && !settings.commonValues.includes(value)) {
      setSettings(prev => ({
        ...prev,
        commonValues: [...prev.commonValues, value].sort((a, b) => a - b)
      }));
      setNewValue('');
    }
  };

  const removeValue = (value: number) => {
    setSettings(prev => ({
      ...prev,
      commonValues: prev.commonValues.filter(v => v !== value)
    }));
  };

  const addEffort = () => {
    const effort = parseEffortInput(newEffort);
    if (effort && !settings.commonEfforts.includes(effort)) {
      setSettings(prev => ({
        ...prev,
        commonEfforts: [...prev.commonEfforts, effort].sort((a, b) => a - b)
      }));
      setNewEffort('');
    }
  };

  const removeEffort = (effort: number) => {
    setSettings(prev => ({
      ...prev,
      commonEfforts: prev.commonEfforts.filter(e => e !== effort)
    }));
  };

  if (!user) {
    return <div className="p-6 text-gray-600">Please sign in to manage tokens.</div>;
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Token Manager</h1>
        <p className="text-gray-600">Manage predefined values for @ tokens in your tasks</p>
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

      {/* Team Members Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">👤 Team Members</h2>
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
          {settings.assignees.map(assignee => (
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
          {settings.assignees.length === 0 && (
            <span className="text-gray-400 text-sm">No team members added yet</span>
          )}
        </div>
      </div>

      {/* Common Values Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">💵 Common Values</h2>
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
          {settings.commonValues.map(value => (
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

      {/* Common Efforts Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">⏱️ Common Efforts</h2>
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
          {settings.commonEfforts.map(effort => (
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

      {/* Companies Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">🏢 Companies</h2>
        <p className="text-sm text-gray-600 mb-4">Company codes for categorization</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {DEFAULT_COMPANIES.map(company => (
            <span
              key={company}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                settings.companies.includes(company)
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {company}
            </span>
          ))}
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Company
          </label>
          <select
            className="border rounded-lg px-3 py-2 w-full max-w-xs"
            value={settings.defaultCompany || ''}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              defaultCompany: e.target.value as TaskCompany || undefined
            }))}
          >
            <option value="">No default</option>
            {DEFAULT_COMPANIES.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
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