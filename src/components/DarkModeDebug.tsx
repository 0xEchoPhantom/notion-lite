'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

export function DarkModeDebug() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [htmlClass, setHtmlClass] = useState('');

  useEffect(() => {
    // Update the class list whenever we check
    const checkClass = () => {
      setHtmlClass(document.documentElement.className);
    };
    
    checkClass();
    const interval = setInterval(checkClass, 1000);
    return () => clearInterval(interval);
  }, []);

  const forceToggleDark = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    setHtmlClass(document.documentElement.className);
  };

  if (!mounted) {
    return <div className="p-4 bg-yellow-100 dark:bg-yellow-900">Loading theme debug...</div>;
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-w-sm">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">🌙 Dark Mode Debug</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Theme Context:</strong> <span className="font-mono">{theme}</span>
        </div>
        <div>
          <strong>HTML Classes:</strong> <span className="font-mono">{htmlClass || 'none'}</span>
        </div>
        <div>
          <strong>Mounted:</strong> <span className="font-mono">{mounted ? 'true' : 'false'}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={toggleTheme}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Toggle Theme
          </button>
          <button
            onClick={forceToggleDark}
            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          >
            Force Toggle
          </button>
        </div>
      </div>
    </div>
  );
}
