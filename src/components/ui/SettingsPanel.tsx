'use client';

import React, { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export const SettingsPanel: React.FC = () => {
  const { isGTDMode, isFreeMode, toggleMode } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 z-50"
        title="Mode Settings"
      >
        ⚙️
      </button>

      {/* Settings Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Mode Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {isGTDMode ? '📋 GTD Mode' : '🎯 Free Mode'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isGTDMode 
                      ? 'Fixed workflow pages (Capture, 2min, Next Step, Delegate, Pending)'
                      : 'Create and manage pages freely'
                    }
                  </p>
                </div>
                <button
                  onClick={toggleMode}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    isGTDMode ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      isGTDMode ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* Mode Info */}
              <div className={`p-4 rounded-lg ${isGTDMode ? 'bg-blue-50' : 'bg-green-50'}`}>
                <h3 className={`font-medium mb-2 ${isGTDMode ? 'text-blue-900' : 'text-green-900'}`}>
                  Current Mode: {isGTDMode ? 'GTD' : 'Free'}
                </h3>
                <div className={`text-sm space-y-1 ${isGTDMode ? 'text-blue-800' : 'text-green-800'}`}>
                  {isGTDMode ? (
                    <>
                      <div>• 5 fixed workflow pages</div>
                      <div>• Structured task management</div>
                      <div>• Cannot create new pages</div>
                    </>
                  ) : (
                    <>
                      <div>• Create unlimited pages</div>
                      <div>• Full creative freedom</div>
                      <div>• Traditional Notion experience</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className={`px-4 py-2 text-white rounded-md ${
                  isGTDMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
