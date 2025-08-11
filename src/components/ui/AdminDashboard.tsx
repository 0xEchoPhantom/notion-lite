import React, { useState, useEffect } from 'react';

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
  activeUsers: User[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isAuthorized, userEmail }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isAuthorized) {
      loadDashboardData();
    }
  }, [isAuthorized]);

  const loadDashboardData = async () => {
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
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setMessage({ type: 'error', text: 'Failed to load dashboard data' });
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cleanup users' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">Only admin@dev.vn can access this dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.totalDocuments || 0}</div>
            <div className="text-sm text-gray-500">Total Documents</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.totalBlocks || 0}</div>
            <div className="text-sm text-gray-500">Total Blocks</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.totalTasks || 0}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
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
        <p className="text-sm text-gray-500 mt-2">
          Protected: admin@dev.vn, quangvust201@gmail.com
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Users ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sign In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => {
                const isProtected = user.email === 'admin@dev.vn' || user.email === 'quangvust201@gmail.com';
                return (
                  <tr key={user.uid} className={isProtected ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                      {isProtected && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded">
                          Protected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{user.uid}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.documentsCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteUserData(user.uid, user.email)}
                        disabled={actionLoading}
                        className="text-yellow-600 hover:text-yellow-900 mr-4 disabled:opacity-50"
                      >
                        Clear Data
                      </button>
                      {!isProtected && (
                        <button
                          onClick={() => handleDeleteUser(user.uid, user.email)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
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
