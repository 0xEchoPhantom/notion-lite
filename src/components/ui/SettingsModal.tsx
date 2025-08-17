'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { db } from '@/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  responsibilities: string;
}

// Theme Toggle Component for Settings Modal
function ThemeToggleSwitch() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <button
        className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors opacity-50"
        disabled
        aria-label="Loading theme toggle"
      >
        <span className="sr-only">Loading theme toggle</span>
        <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Toggle theme"
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm`}
      />
      <span className="absolute left-1 flex items-center text-xs">
        {theme === 'light' ? '☀️' : ''}
      </span>
      <span className="absolute right-1 flex items-center text-xs">
        {theme === 'dark' ? '🌙' : ''}
      </span>
    </button>
  );
}

interface DelegationSettings {
  enabled: boolean;
  teamMembers: TeamMember[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'delegation'>('general');
  const [settings, setSettings] = useState<DelegationSettings>({
    enabled: false,
    teamMembers: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'delegation'));
      
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as DelegationSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isOpen) {
      loadSettings();
    }
  }, [user, isOpen, loadSettings]);

  const saveSettings = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      await setDoc(doc(db, 'users', user.uid, 'settings', 'delegation'), settings);
      // Show success feedback
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-30 dark:bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('delegation')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'delegation'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Delegation
          </button>
        </div>

        {/* Content */}
  <div className="flex-1 overflow-y-auto px-6 py-4 dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Account</h3>
                    <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">User ID</span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{user?.uid}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Preferences</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
                        <ThemeToggleSwitch />
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Compact View</span>
                        <input
                          type="checkbox"
                          disabled
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 opacity-50"
                        />
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Compact view coming soon</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'delegation' && (
                <div className="space-y-6">
                  {/* Token Manager Link */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300">Token Manager</h3>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Manage all @ token presets including team members, values, and efforts</p>
                      </div>
                      <a
                        href="/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                      >
                        Open Token Manager →
                      </a>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Quick Team Setup</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Quickly add team members here or use Token Manager for full control</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingMember({
                            id: Date.now().toString(),
                            name: '',
                            email: '',
                            role: '',
                            responsibilities: ''
                          });
                          setShowAddMember(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                      >
                        Add Member
                      </button>
                    </div>

                    {/* Team Members List */}
                    {settings.teamMembers.length === 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-6 text-center">
                        <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No team members defined</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add team members to enable @ mentions in tasks</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {settings.teamMembers.map((member) => (
                          <div key={member.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-xs font-semibold text-white">
                                    {member.name?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                                  </div>
                                </div>
                                <div className="mt-2 ml-10">
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{member.role}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{member.responsibilities}</p>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingMember(member);
                                    setShowAddMember(true);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setSettings({
                                      ...settings,
                                      teamMembers: settings.teamMembers.filter(m => m.id !== member.id)
                                    });
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add/Edit Member Form */}
                  {showAddMember && editingMember && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black bg-opacity-30 dark:bg-opacity-50" onClick={() => setShowAddMember(false)} />
                      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                          {settings.teamMembers.find(m => m.id === editingMember.id) ? 'Edit' : 'Add'} Team Member
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                            <input
                              type="text"
                              value={editingMember.name}
                              onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              placeholder="John Doe"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input
                              type="email"
                              value={editingMember.email}
                              onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              placeholder="john@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                            <input
                              type="text"
                              value={editingMember.role}
                              onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              placeholder="Frontend Developer"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsibilities</label>
                            <textarea
                              value={editingMember.responsibilities}
                              onChange={(e) => setEditingMember({ ...editingMember, responsibilities: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              rows={3}
                              placeholder="Responsible for UI/UX implementation, React components, and frontend performance..."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                          <button
                            onClick={() => {
                              setShowAddMember(false);
                              setEditingMember(null);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (editingMember.name && editingMember.email) {
                                const existingIndex = settings.teamMembers.findIndex(m => m.id === editingMember.id);
                                if (existingIndex >= 0) {
                                  const updated = [...settings.teamMembers];
                                  updated[existingIndex] = editingMember;
                                  setSettings({ ...settings, teamMembers: updated });
                                } else {
                                  setSettings({ ...settings, teamMembers: [...settings.teamMembers, editingMember] });
                                }
                                setShowAddMember(false);
                                setEditingMember(null);
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            {settings.teamMembers.find(m => m.id === editingMember.id) ? 'Update' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};