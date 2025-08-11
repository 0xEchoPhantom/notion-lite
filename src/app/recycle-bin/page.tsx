'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RecycleBinSidebar } from '@/components/ui/RecycleBinSidebar';
import {
  getArchivedPages,
  getArchivedBlocks,
} from '@/lib/firestore';
// TODO: Implement restore and permanent delete functions in firestore-v3
import { ArchivedBlock, ArchivedPage } from '@/types/index';

export default function RecycleBinPage() {
  const { user } = useAuth();
  const userId = user?.uid;
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<ArchivedPage[]>([]);
  const [blocks, setBlocks] = useState<ArchivedBlock[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useMemo(() => async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [p, b] = await Promise.all([
        getArchivedPages(userId),
        getArchivedBlocks(userId),
      ]);
      setPages(p);
      setBlocks(b);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Recycle Bin</h1>
          <p className="text-gray-600">Please sign in to view archived items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <RecycleBinSidebar />

      {/* Main Content */}
      <div className="flex-1 bg-white overflow-y-auto">
        <div className="px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Recycle Bin</h1>
              <p className="text-sm text-gray-600 mt-1">Restore or permanently delete your items</p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={load}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                  </span>
                ) : 'Refresh'}
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                onClick={async () => {
                  if (!userId) return;
                  const ok = confirm('Permanently delete ALL archived items? This cannot be undone.');
                  if (!ok) return;
                  setBusyId('flush');
                  try {
                    await flushAllArchived(userId);
                    await load();
                  } finally {
                    setBusyId(null);
                  }
                }}
                disabled={busyId !== null || loading || (pages.length === 0 && blocks.length === 0)}
              >
                Empty Recycle Bin
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading archived items...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Archived Pages */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Archived Pages</h2>
                  <p className="text-sm text-gray-500 mt-1">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
                </div>
                {pages.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">No archived pages</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pages.map(p => (
                      <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{p.title || 'Untitled'}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Archived {new Date(p.archivedAt).toLocaleDateString()} at {new Date(p.archivedAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                              onClick={async () => {
                                setBusyId(p.id);
                                try {
                                  await restoreArchivedPage(userId, p.id);
                                  await load();
                                } finally { 
                                  setBusyId(null); 
                                }
                              }}
                              disabled={busyId !== null}
                            >
                              Restore
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              onClick={async () => {
                                const ok = confirm(`Permanently delete "${p.title}"? This cannot be undone.`);
                                if (!ok) return;
                                setBusyId(p.id);
                                try {
                                  await permanentlyDeleteArchivedPage(userId, p.id);
                                  await load();
                                } finally { 
                                  setBusyId(null); 
                                }
                              }}
                              disabled={busyId !== null}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Archived Blocks */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Archived Blocks</h2>
                  <p className="text-sm text-gray-500 mt-1">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</p>
                </div>
                {blocks.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm text-gray-500">No archived blocks</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blocks.map(b => (
                      <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">From: {b.pageTitle || 'Unknown page'}</p>
                            <p className="text-sm text-gray-900 truncate">{b.content || '(empty block)'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {b.type} • Archived {new Date(b.archivedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                              onClick={async () => {
                                setBusyId(b.id);
                                try {
                                  const targetPageId = b.pageId;
                                  await restoreArchivedBlock(userId, b.id, targetPageId);
                                  await load();
                                } finally { 
                                  setBusyId(null); 
                                }
                              }}
                              disabled={busyId !== null}
                            >
                              Restore
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              onClick={async () => {
                                const ok = confirm('Permanently delete this block? This cannot be undone.');
                                if (!ok) return;
                                setBusyId(b.id);
                                try {
                                  await permanentlyDeleteArchivedBlock(userId, b.id);
                                  await load();
                                } finally { 
                                  setBusyId(null); 
                                }
                              }}
                              disabled={busyId !== null}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Empty State */}
          {!loading && pages.length === 0 && blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="w-24 h-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Recycle Bin is Empty</h3>
              <p className="text-sm text-gray-500">Deleted pages and blocks will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}