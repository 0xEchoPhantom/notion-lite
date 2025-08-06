'use client';

import React, { useState } from 'react';
import clsx from 'clsx';

interface ShortcutHelperProps {
  className?: string;
}

export const ShortcutHelper: React.FC<ShortcutHelperProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { key: 'Enter', desc: 'Create new block (same type)' },
    { key: 'Tab', desc: 'Indent (for lists)' },
    { key: 'Shift + Tab', desc: 'Outdent' },
    { key: 'Cmd/Ctrl + Enter', desc: 'Toggle todo checkbox' },
    { key: 'Cmd/Ctrl + Shift + ↑/↓', desc: 'Move block up/down' },
    { key: 'Cmd/Ctrl + Shift + 0', desc: 'Convert to paragraph' },
    { key: 'Cmd/Ctrl + Shift + 4', desc: 'Convert to todo list' },
    { key: 'Cmd/Ctrl + Shift + 5', desc: 'Convert to bullet list' },
    { key: '/', desc: 'Open command menu' },
    { key: '- (space)', desc: 'Create bullet list' },
    { key: '[] (space)', desc: 'Create todo list' },
    { key: '1. (space)', desc: 'Create numbered list' },
  ];

  return (
    <div className={clsx('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 text-sm font-medium"
        title="Keyboard shortcuts"
      >
        ?
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-6 z-20 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-3">Keyboard Shortcuts</h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                    {shortcut.key}
                  </code>
                  <span className="text-gray-600 ml-3 flex-1">{shortcut.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
