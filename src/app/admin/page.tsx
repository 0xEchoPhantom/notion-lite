'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '@/components/ui/AdminDashboard';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Only admin@dev.vn can access this page
  const isAdmin = user?.email === 'admin@dev.vn';

  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/app');
    }
  }, [user, isAdmin, router]);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access</h1>
          <p className="text-gray-600 mb-4">
            {!user ? 'Please log in to access the admin dashboard.' : 'Access denied. This page is only for admin@dev.vn'}
          </p>
          <a
            href={user ? '/app' : '/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {user ? 'Back to App' : 'Go to Login'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Notion Lite Admin</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.email}</span>
              <a
                href="/app"
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to App
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard isAuthorized={isAdmin} userEmail={user.email || ''} />
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-gray-500 text-sm">
            ⚠️ Admin Dashboard - Use with extreme caution. All operations are logged.
          </p>
        </div>
      </footer>
    </div>
  );
}
