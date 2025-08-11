/**
 * Keystroke Operation Lock System
 * Prevents race conditions in block creation/deletion from rapid keystrokes
 */

import { useRef, useCallback, useState } from 'react';

interface OperationLockState {
  isLocked: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  lastOperation: 'enter' | 'backspace' | null;
  lastOperationTime: number;
}

export function useKeystrokeLock(debounceMs = 100) {
  const [lockState, setLockState] = useState<OperationLockState>({
    isLocked: false,
    isCreating: false,
    isDeleting: false,
    lastOperation: null,
    lastOperationTime: 0,
  });

  const lockTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check if we should ignore a keystroke (too fast/duplicate)
  const shouldIgnoreKeystroke = useCallback((type: 'enter' | 'backspace'): boolean => {
    const now = Date.now();
    const timeSinceLastOperation = now - lockState.lastOperationTime;

    // Ignore if same operation within debounce period
    if (lockState.lastOperation === type && timeSinceLastOperation < debounceMs) {
      return true;
    }

    // Ignore if any operation is locked
    if (lockState.isLocked) {
      return true;
    }

    return false;
  }, [lockState, debounceMs]);

  // Execute an operation with proper locking
  const executeOperation = useCallback(async <T>(
    type: 'enter' | 'backspace',
    blockId: string,
    operation: () => Promise<T>
  ): Promise<T | null> => {
    // Check if we should ignore this keystroke
    if (shouldIgnoreKeystroke(type)) {
      return null;
    }

    // Set lock state
    const isCreating = type === 'enter';
    const isDeleting = type === 'backspace';
    
    setLockState(prev => ({
      ...prev,
      isLocked: true,
      isCreating,
      isDeleting,
      lastOperation: type,
      lastOperationTime: Date.now(),
    }));

    try {
      // Execute the operation
      const result = await operation();

      // Clear lock after a short delay to prevent rapid re-triggering
      if (lockTimeout.current) {
        clearTimeout(lockTimeout.current);
      }
      
      lockTimeout.current = setTimeout(() => {
        setLockState(prev => ({
          ...prev,
          isLocked: false,
          isCreating: false,
          isDeleting: false,
        }));
      }, debounceMs);

      return result;
    } catch (error) {
      // Immediately clear lock on error
      setLockState(prev => ({
        ...prev,
        isLocked: false,
        isCreating: false,
        isDeleting: false,
      }));
      
      console.error(`Operation ${type} failed:`, error);
      throw error;
    }
  }, [shouldIgnoreKeystroke, debounceMs]);

  // Specific handlers for Enter and Backspace
  const executeEnterOperation = useCallback(async <T>(
    blockId: string,
    operation: () => Promise<T>
  ): Promise<T | null> => {
    return executeOperation('enter', blockId, operation);
  }, [executeOperation]);

  const executeBackspaceOperation = useCallback(async <T>(
    blockId: string, 
    operation: () => Promise<T>
  ): Promise<T | null> => {
    return executeOperation('backspace', blockId, operation);
  }, [executeOperation]);

  // Force unlock (for error recovery)
  const forceUnlock = useCallback(() => {
    if (lockTimeout.current) {
      clearTimeout(lockTimeout.current);
    }
    setLockState({
      isLocked: false,
      isCreating: false,
      isDeleting: false,
      lastOperation: null,
      lastOperationTime: 0,
    });
  }, []);

  // Check if a specific operation is currently blocked
  const isOperationBlocked = useCallback((type: 'enter' | 'backspace') => {
    return shouldIgnoreKeystroke(type);
  }, [shouldIgnoreKeystroke]);

  return {
    lockState,
    executeEnterOperation,
    executeBackspaceOperation,
    forceUnlock,
    isOperationBlocked,
  };
}

/**
 * Focus Management Hook
 * Handles proper focus management during block operations
 */
export function useFocusManager() {
  const pendingFocus = useRef<string | null>(null);
  const focusTimeout = useRef<NodeJS.Timeout | null>(null);

  const focusBlock = useCallback(async (blockId: string, delay = 50): Promise<boolean> => {
    pendingFocus.current = blockId;

    if (focusTimeout.current) {
      clearTimeout(focusTimeout.current);
    }

    return new Promise((resolve) => {
      focusTimeout.current = setTimeout(async () => {
        // Only proceed if this is still the pending focus target
        if (pendingFocus.current !== blockId) {
          resolve(false);
          return;
        }

        // Try to find and focus the element
        const element = document.querySelector(`[data-block-id="${blockId}"] textarea`) as HTMLTextAreaElement;
        
        if (element) {
          element.focus();
          pendingFocus.current = null;
          resolve(true);
        } else {
          // Retry once more after another delay
          setTimeout(() => {
            const retryElement = document.querySelector(`[data-block-id="${blockId}"] textarea`) as HTMLTextAreaElement;
            if (retryElement && pendingFocus.current === blockId) {
              retryElement.focus();
              pendingFocus.current = null;
              resolve(true);
            } else {
              resolve(false);
            }
          }, 50);
        }
      }, delay);
    });
  }, []);

  const clearPendingFocus = useCallback(() => {
    pendingFocus.current = null;
    if (focusTimeout.current) {
      clearTimeout(focusTimeout.current);
    }
  }, []);

  return {
    focusBlock,
    clearPendingFocus,
    hasPendingFocus: pendingFocus.current !== null,
  };
}

/**
 * Input Buffer Hook
 * Buffers keystrokes during block transitions to prevent lost input
 */
export function useInputBuffer() {
  const buffer = useRef<{
    content: string;
    targetBlockId: string | null;
    timestamp: number;
  }>({
    content: '',
    targetBlockId: null,
    timestamp: 0,
  });

  const addToBuffer = useCallback((content: string, blockId: string) => {
    const now = Date.now();
    
    // If target block changed, clear buffer
    if (buffer.current.targetBlockId && buffer.current.targetBlockId !== blockId) {
      buffer.current.content = '';
    }
    
    buffer.current.content += content;
    buffer.current.targetBlockId = blockId;
    buffer.current.timestamp = now;
  }, []);

  const flushBuffer = useCallback((): {content: string; targetBlockId: string | null} => {
    const result = {
      content: buffer.current.content,
      targetBlockId: buffer.current.targetBlockId,
    };

    // Clear buffer
    buffer.current.content = '';
    buffer.current.targetBlockId = null;
    buffer.current.timestamp = 0;

    return result;
  }, []);

  const hasBufferedContent = useCallback(() => {
    return buffer.current.content.length > 0;
  }, []);

  return {
    addToBuffer,
    flushBuffer,
    hasBufferedContent,
  };
}

/**
 * Comprehensive keystroke protection hook
 * Combines all protection mechanisms
 */
export function useKeystrokeProtection(debounceMs = 100) {
  const keystrokeLock = useKeystrokeLock(debounceMs);
  const focusManager = useFocusManager();
  const inputBuffer = useInputBuffer();

  return {
    ...keystrokeLock,
    ...focusManager,
    ...inputBuffer,
  };
}