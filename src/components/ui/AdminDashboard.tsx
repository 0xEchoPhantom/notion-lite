import React, { useState, useEffect, useCallback } from 'react';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  lastSignInTime?: string;
  documentsCount?: number;
}

interface AdminDashboardProps {
  isAuthorized: boolean;
  userEmail?: string;
}

interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  totalBlocks: number;
  totalPages: number;
  totalTasks?: number;
  activeUsers: User[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isAuthorized, userEmail }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch users list
      const usersRes = await fetch('/api/admin/users', {
        headers: {
          'x-user-email': userEmail || ''
        }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      // Fetch stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: {
          'x-user-email': userEmail || ''
        }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch {
      console.error('Error loading dashboard');
      setMessage({ type: 'error', text: 'Failed to load dashboard data' });
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (isAuthorized) {
      loadDashboardData();
    }
  }, [isAuthorized, loadDashboardData]);

  const handleDeleteUserData = async (userId: string, email: string) => {
    if (!confirm(`Delete ALL data for ${email}?\n\nThis cannot be undone!`)) return;
    
    setActionLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch(`/api/admin/delete-user-data?userId=${userId}`, {
        method: 'DELETE',
        headers: { 'x-user-email': userEmail || '' }
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Deleted ${data.totalDeleted || 0} documents for ${email}` });
        await loadDashboardData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete data' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete user data' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`DELETE the account ${email}?\n\nThis will remove the account and all data!`)) return;
    
    setActionLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch(`/api/admin/delete-user?userId=${userId}`, {
        method: 'DELETE',
        headers: { 'x-user-email': userEmail || '' }
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Deleted account: ${email}` });
        setUsers(users.filter(u => u.uid !== userId));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete account' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete user' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanupAll = async () => {
    if (!confirm('Delete ALL users except admin@dev.vn and quangvust201@gmail.com?')) return;
    if (!confirm('FINAL WARNING: This CANNOT be undone. Continue?')) return;
    
    setActionLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/cleanup-users', {
        method: 'POST',
        headers: { 'x-user-email': userEmail || '' }
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Deleted ${data.deletedCount || 0} accounts` });
        await loadDashboardData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Cleanup failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to cleanup users' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">Access Denied</h2>
        <p className="text-red-600 dark:text-red-400">Only admin@dev.vn can access this dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Users</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalDocuments || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Documents</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalBlocks || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Blocks</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTasks || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleCleanupAll}
            disabled={actionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            🗑️ Delete All Users Except Protected
          </button>
          <button
            onClick={loadDashboardData}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            🔄 Refresh Data
          </button>
        </div>
  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Protected: admin@dev.vn, quangvust201@gmail.com
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Users ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Sign In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map(user => {
                const isProtected = user.email === 'admin@dev.vn' || user.email === 'quangvust201@gmail.com';
                return (
                  <tr key={user.uid} className={isProtected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.email}
                      {isProtected && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-200 dark:bg-blue-800/40 text-blue-800 dark:text-blue-300 rounded">
                          Protected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded">{user.uid}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.documentsCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteUserData(user.uid, user.email)}
                        disabled={actionLoading}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 mr-4 disabled:opacity-50"
                      >
                        Clear Data
                      </button>
                      {!isProtected && (
                        <button
                          onClick={() => handleDeleteUser(user.uid, user.email)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          Delete Account
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
