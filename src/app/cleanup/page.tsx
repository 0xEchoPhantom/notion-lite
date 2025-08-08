'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPages, deletePage } from '@/lib/firestore';

export default function CleanupPage() {
  const { user } = useAuth();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const cleanupDuplicatePages = async () => {
    if (!user) {
      addLog('❌ No user logged in');
      return;
    }

    setIsCleaningUp(true);
    setLog([]);
    addLog('🧹 Starting cleanup of duplicate pages...');

    try {
      // Get all pages
      const pages = await getPages(user.uid);
      addLog(`📄 Found ${pages.length} pages total`);

      // Group pages by title (case-insensitive)
      const pageGroups: { [key: string]: any[] } = {};
      for (const page of pages) {
        const normalizedTitle = page.title.toLowerCase().trim();
        if (!pageGroups[normalizedTitle]) {
          pageGroups[normalizedTitle] = [];
        }
        pageGroups[normalizedTitle].push(page);
      }

      // Find and delete duplicates
      let deletedCount = 0;
      for (const [title, group] of Object.entries(pageGroups)) {
        if (group.length > 1) {
          addLog(`🔍 Found ${group.length} duplicates for "${title}"`);

          // Sort by createdAt and keep the oldest one
          group.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return aTime.getTime() - bTime.getTime();
          });

          const toKeep = group[0];
          const toDelete = group.slice(1);

          for (const pageToDelete of toDelete) {
            try {
              await deletePage(user.uid, pageToDelete.id);
              addLog(`❌ Deleted duplicate: ${pageToDelete.title} (${pageToDelete.id})`);
              deletedCount++;
            } catch (error) {
              addLog(`💥 Failed to delete ${pageToDelete.id}: ${error}`);
            }
          }

          addLog(`✅ Kept: ${toKeep.title} (${toKeep.id})`);
        }
      }

      addLog(`🧹 Deleted ${deletedCount} duplicate pages`);
      addLog('✨ Cleanup completed!');
    } catch (error) {
      addLog(`💥 Cleanup failed: ${error}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in first</h1>
          <a href="/app" className="text-blue-600 hover:text-blue-800">Go to App</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Cleanup Duplicate Pages</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Page Cleanup Tool</h2>
            <button
              onClick={cleanupDuplicatePages}
              disabled={isCleaningUp}
              className={`px-4 py-2 rounded-md font-medium ${
                isCleaningUp
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isCleaningUp ? 'Cleaning up...' : 'Clean Up Duplicates'}
            </button>
          </div>
          
          <p className="text-gray-600 mb-4">
            This will remove duplicate pages with the same title, keeping only the oldest one.
          </p>
          
          <div className="text-sm text-gray-500">
            User: {user.email} ({user.uid})
          </div>
        </div>

        {/* Log Display */}
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
          <h3 className="text-white mb-2">Cleanup Log:</h3>
          {log.length === 0 ? (
            <div className="text-gray-500">No cleanup operations yet...</div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {log.map((entry, index) => (
                <div key={index}>{entry}</div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/app" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
}
