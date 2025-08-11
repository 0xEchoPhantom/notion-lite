'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { SettingsModal } from './SettingsModal';

export const RecycleBinSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showSettings, setShowSettings] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="w-72 bg-[#FBFBFA] border-r border-gray-200/80 h-screen flex flex-col">
      {/* User Section */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-800 truncate">
              {user?.email?.split('@')[0] || 'User'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
            title="Sign out"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3">
        <div className="mb-4">
          <Link 
            href="/app" 
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Workspace</span>
          </Link>
        </div>

        {/* Recycle Bin Header */}
        <div className="px-3 py-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recycle Bin</h2>
        </div>

        <div className="space-y-1">
          <div className="px-3 py-2 bg-gray-200/70 rounded-md">
            <div className="flex items-center space-x-3">
              <span className="text-base">🗑️</span>
              <span className="text-sm font-medium">All Deleted Items</span>
            </div>
          </div>
        </div>

        <div className="mt-6 px-3">
          <div className="text-xs text-gray-500">
            <p className="mb-2">Items in the recycle bin:</p>
            <ul className="space-y-1">
              <li>• Can be restored anytime</li>
              <li>• Are permanently deleted after 30 days</li>
              <li>• Can be manually deleted forever</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-3 py-3 border-t border-gray-200/50 space-y-1">
        <button 
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm">Settings</span>
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};