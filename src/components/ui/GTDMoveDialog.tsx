'use client';

import React, { useState } from 'react';
import { GTD_PAGES } from '@/types/workspace';

interface GTDMoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetPageId: string) => void;
  blockContent: string;
  currentPageId?: string;
}

export function GTDMoveDialog({
  isOpen,
  onClose,
  onConfirm,
  blockContent,
  currentPageId
}: GTDMoveDialogProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>('inbox');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedPageId);
    onClose();
  };

  const truncatedContent = blockContent.length > 60 
    ? blockContent.slice(0, 60) + '...' 
    : blockContent;

  // Filter out current page from options
  const availablePages = GTD_PAGES.filter(page => page.id !== currentPageId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Move Block to GTD Status
          </h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Block preview */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Moving block:</p>
            <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded p-3">
              <p className="text-sm text-gray-800 dark:text-gray-200 italic">
                &ldquo;{truncatedContent}&rdquo;
              </p>
            </div>
          </div>

          {/* GTD Status Selection */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select destination GTD status:
            </p>
            <div className="space-y-2">
              {availablePages.map((page) => (
                <label
                  key={page.id}
                  className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="gtdPage"
                    value={page.id}
                    checked={selectedPageId === page.id}
                    onChange={(e) => setSelectedPageId(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{page.emoji}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {page.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {page.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 flex gap-3 justify-end rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Move Block
          </button>
        </div>
      </div>
    </div>
  );
}
