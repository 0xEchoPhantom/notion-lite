"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";

// Minimal stub: Notes mode is disabled. This component remains to satisfy imports.
export function NotesWorkspace() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen w-full">
      <div className="flex-1 bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Notes Disabled</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user ? "Please use Notion link embeds instead." : "Notes workspace is disabled."}
          </p>
        </div>
      </div>
    </div>
  );
}
