'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SimpleDragProvider } from '@/contexts/SimpleDragContext';
import { ChatWidget } from '@/components/ai/ChatWidget';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SimpleDragProvider>
      <div className="min-h-screen bg-white dark:bg-slate-900">
        {/* Main content with sidebar handled by workspace components */}
        {children}
        {/* AI Chat Widget */}
        <ChatWidget />
      </div>
    </SimpleDragProvider>
  );
}
