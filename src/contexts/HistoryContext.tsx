"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type HistoryAction = {
  do: () => Promise<void> | void;
  undo: () => Promise<void> | void;
  label?: string;
};

interface HistoryContextType {
  canUndo: boolean;
  canRedo: boolean;
  push: (action: HistoryAction, runDo?: boolean) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const useHistory = () => {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within a HistoryProvider');
  return ctx;
};

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const undoStackRef = useRef<HistoryAction[]>([]);
  const redoStackRef = useRef<HistoryAction[]>([]);
  const [, setVersion] = useState(0); // force re-render for canUndo/canRedo
  const bump = () => setVersion(v => v + 1);

  const push = useCallback(async (action: HistoryAction, runDo: boolean = true) => {
    if (runDo) await action.do();
    undoStackRef.current.push(action);
    redoStackRef.current = [];
    bump();
  }, []);

  const undo = useCallback(async () => {
    const action = undoStackRef.current.pop();
    if (!action) return;
    await action.undo();
    // push an inverse action to redo
    redoStackRef.current.push({ do: action.do, undo: action.undo, label: action.label });
    bump();
  }, []);

  const redo = useCallback(async () => {
    const action = redoStackRef.current.pop();
    if (!action) return;
    await action.do();
    undoStackRef.current.push(action);
    bump();
  }, []);

  const clear = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    bump();
  }, []);

  const value = useMemo<HistoryContextType>(() => ({
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    push,
    undo,
    redo,
    clear,
  }), [push, undo, redo, clear]);

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
};
