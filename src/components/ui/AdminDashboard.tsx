import React, { useState } from 'react';
import { SystemStats, UserDataSummary } from '@/lib/firebaseAdmin';

interface AdminDashboardProps {
  isAuthorized: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isAuthorized }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [userSummary, setUserSummary] = useState<UserDataSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');

  if (!isAuthorized) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">You don&apos;t have permission to access the admin dashboard.</p>
      </div>
    );
  }

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin?operation=stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error || 'Failed to fetch stats');
      }
    } catch (err) {
      setError('Network error while fetching stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSummary = async () => {
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin?operation=user-summary&userId=${encodeURIComponent(userId)}`);
      const result = await response.json();
      
      if (result.success) {
        setUserSummary(result.data);
      } else {
        setError(result.error || 'Failed to fetch user summary');
      }
    } catch (err) {
      setError('Network error while fetching user summary');
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin?operation=cleanup');
      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        // Refresh stats after cleanup
        fetchStats();
      } else {
        setError(result.error || 'Cleanup failed');
      }
    } catch (err) {
      setError('Network error during cleanup');
    } finally {
      setLoading(false);
    }
  };

  const deleteUserData = async () => {
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to PERMANENTLY DELETE all data for user ${userId}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        setUserSummary(null);
        setUserId('');
        // Refresh stats
        fetchStats();
      } else {
        setError(result.error || 'Failed to delete user data');
      }
    } catch (err) {
      setError('Network error while deleting user data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
        <p className="text-gray-600 mb-6">
          System administration tools for Firebase operations. Use with caution.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* System Stats Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Statistics</h2>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Fetch System Stats'}
          </button>

          {stats && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700">Total Users</h3>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700">Total Pages</h3>
                <p className="text-2xl font-bold text-green-600">{stats.totalPages}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700">Total Blocks</h3>
                <p className="text-2xl font-bold text-purple-600">{stats.totalBlocks}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700">Archived Pages</h3>
                <p className="text-2xl font-bold text-orange-600">{stats.totalArchivedPages}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700">Archived Blocks</h3>
                <p className="text-2xl font-bold text-red-600">{stats.totalArchivedBlocks}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700">Last Updated</h3>
                <p className="text-sm text-gray-600">
                  {new Date(stats.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User Operations Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">User Operations</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter User ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchUserSummary}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Get Summary
            </button>
          </div>

          {userSummary && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">User: {userSummary.userId}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>Pages: <span className="font-medium">{userSummary.pagesCount}</span></div>
                <div>Blocks: <span className="font-medium">{userSummary.blocksCount}</span></div>
                <div>Archived Pages: <span className="font-medium">{userSummary.archivedPagesCount}</span></div>
                <div>Archived Blocks: <span className="font-medium">{userSummary.archivedBlocksCount}</span></div>
              </div>
              {userSummary.lastActivity && (
                <div className="mt-2 text-sm text-gray-600">
                  Last Activity: {userSummary.lastActivity.toLocaleString()}
                </div>
              )}
            </div>
          )}

          <button
            onClick={deleteUserData}
            disabled={loading || !userId.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⚠️ Delete All User Data
          </button>
        </div>

        {/* Maintenance Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Maintenance</h2>
          <button
            onClick={runCleanup}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            🧹 Cleanup Orphaned Blocks
          </button>
        </div>
      </div>
    </div>
  );
};
