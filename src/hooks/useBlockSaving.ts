import { useState, useEffect, useCallback, useRef } from 'react';
import { Block } from '@/types/index';

interface UseBlockSavingProps {
  block: Block;
  updateBlockContent: (blockId: string, updates: Partial<Block>) => void;
}

/**
 * A robust block saving hook that handles:
 * - Local state management without flashing
 * - Debounced saves to Firestore
 * - Proper handling of external updates
 * - No typing interruptions
 */
export const useBlockSaving = ({ block, updateBlockContent }: UseBlockSavingProps) => {
  // Local state - this is what the user sees and types into
  const [localContent, setLocalContent] = useState(block.content);
  
  // Track what we last saved to Firestore
  const lastSavedContentRef = useRef(block.content);
  
  // Track if we have pending changes to save
  const hasPendingChangesRef = useRef(false);
  
  // Save timeout reference
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Track if this component is mounted
  const isMountedRef = useRef(true);

  // Handle external updates from Firestore
  // ONLY update local state if:
  // 1. The content actually changed externally
  // 2. We don't have pending local changes
  useEffect(() => {
    // If the block content changed externally (not from our saves)
    if (block.content !== lastSavedContentRef.current && !hasPendingChangesRef.current) {
      setLocalContent(block.content);
      lastSavedContentRef.current = block.content;
    }
  }, [block.content]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // The main save function - debounced
  const saveContent = useCallback((content: string) => {
    // Mark that we have pending changes
    hasPendingChangesRef.current = true;
    
    // Clear any existing save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set a new timeout to save after 500ms of no typing
    saveTimeoutRef.current = setTimeout(() => {
      // Only save if content actually changed
      if (content !== lastSavedContentRef.current && isMountedRef.current) {
        lastSavedContentRef.current = content;
        updateBlockContent(block.id, { content });
      }
      // Clear the pending changes flag after saving
      hasPendingChangesRef.current = false;
    }, 500);
  }, [block.id, updateBlockContent]);

  // Handle content changes from user input
  const handleContentChange = useCallback((newContent: string) => {
    // Always update local state immediately (optimistic update)
    setLocalContent(newContent);
    // Trigger debounced save
    saveContent(newContent);
  }, [saveContent]);

  // Force save immediately (for blur, unmount, etc.)
  const forceSave = useCallback(() => {
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Get the current local content
    const currentContent = localContent;
    
    // Save immediately if different from last saved
    if (currentContent !== lastSavedContentRef.current && isMountedRef.current) {
      lastSavedContentRef.current = currentContent;
      updateBlockContent(block.id, { content: currentContent });
    }
    
    // Clear pending changes flag
    hasPendingChangesRef.current = false;
  }, [localContent, block.id, updateBlockContent]);

  return {
    localContent,
    setLocalContent,
    handleContentChange,
    forceSave,
  };
};