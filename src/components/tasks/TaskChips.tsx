'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TaskCompany, TASK_RULES } from '@/types/task';
import { TaskMetadata } from '@/types/index';
import { formatValue, formatEffort, formatDueDate } from '@/utils/smartTokenParser';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TaskChipsProps {
  taskMetadata: TaskMetadata;
  blockId?: string;
  onUpdate?: (taskMetadata: TaskMetadata) => void;
}

export function TaskChips({ taskMetadata, blockId, onUpdate }: TaskChipsProps) {
  const { user } = useAuth();
  const [editingChip, setEditingChip] = useState<'value' | 'effort' | 'due' | 'company' | null>(null);
  const hasValue = !!taskMetadata.value;
  const hasEffort = !!taskMetadata.effort;
  const hasDue = !!taskMetadata.dueDate;
  const hasCompany = !!taskMetadata.company;
  const hasROI = taskMetadata.roi !== undefined && isFinite(taskMetadata.roi);

  // If there's nothing meaningful to show, render nothing
  if (!hasValue && !hasEffort && !hasDue && !hasCompany && !hasROI) {
    return null;
  }
  
  return (
    <div className="inline-flex items-center gap-1">
      {/* Value Chip (only when present) */}
      {hasValue && (
        <ChipEditor
          value={taskMetadata.value}
          displayValue={formatValue(taskMetadata.value!)}
          isEditing={editingChip === 'value'}
          onEdit={() => setEditingChip('value')}
          onSave={async (newValue) => {
            if (user && blockId && newValue !== undefined) {
              const blockRef = doc(db, 'users', user.uid, 'blocks', blockId);
              await updateDoc(blockRef, {
                'taskMetadata.value': newValue,
                updatedAt: serverTimestamp()
              });
              onUpdate?.({ ...taskMetadata, value: newValue });
            }
            setEditingChip(null);
          }}
          onCancel={() => setEditingChip(null)}
          placeholder="@15M"
          parser={parseValueInput}
          color="green"
        />
      )}
      
      {/* Effort Chip (only when present) */}
      {hasEffort && (
        <ChipEditor
          value={taskMetadata.effort}
          displayValue={formatEffort(taskMetadata.effort!)}
          isEditing={editingChip === 'effort'}
          onEdit={() => setEditingChip('effort')}
          onSave={async (newValue) => {
            if (user && blockId && newValue !== undefined) {
              const blockRef = doc(db, 'users', user.uid, 'blocks', blockId);
              await updateDoc(blockRef, {
                'taskMetadata.effort': newValue,
                updatedAt: serverTimestamp()
              });
              onUpdate?.({ ...taskMetadata, effort: newValue });
            }
            setEditingChip(null);
          }}
          onCancel={() => setEditingChip(null)}
          placeholder="@3h"
          parser={parseEffortInput}
          color="blue"
        />
      )}
      
      {/* Due Date Chip (only when present) */}
      {hasDue && (
        <ChipEditor
          value={taskMetadata.dueDate}
          displayValue={formatDueDate(taskMetadata.dueDate!)}
          isEditing={editingChip === 'due'}
          onEdit={() => setEditingChip('due')}
          onSave={async (newValue) => {
            if (user && blockId) {
              const blockRef = doc(db, 'users', user.uid, 'blocks', blockId);
              const updateData: Record<string, unknown> = {
                updatedAt: serverTimestamp()
              };
              // Only set dueDate if there's a value, otherwise remove it
              if (newValue !== undefined) {
                updateData['taskMetadata.dueDate'] = newValue;
              } else {
                updateData['taskMetadata.dueDate'] = null;
              }
              await updateDoc(blockRef, updateData);
              onUpdate?.({ ...taskMetadata, dueDate: newValue });
            }
            setEditingChip(null);
          }}
          onCancel={() => setEditingChip(null)}
          placeholder="@tomorrow"
          parser={parseDueDateInput}
          color="purple"
        />
      )}
      
      {/* Company Chip (only when present) */}
      {hasCompany && (
        <ChipEditor
          value={taskMetadata.company}
          displayValue={taskMetadata.company!}
          isEditing={editingChip === 'company'}
          onEdit={() => setEditingChip('company')}
          onSave={async (newValue) => {
            if (user && blockId && newValue !== undefined) {
              const blockRef = doc(db, 'users', user.uid, 'blocks', blockId);
              await updateDoc(blockRef, {
                'taskMetadata.company': newValue,
                updatedAt: serverTimestamp()
              });
              onUpdate?.({ ...taskMetadata, company: newValue });
            }
            setEditingChip(null);
          }}
          onCancel={() => setEditingChip(null)}
          placeholder="@AIC"
          parser={parseCompanyInput}
          color="indigo"
        />
      )}
      
      {/* ROI Display (read-only) */}
      {hasROI && (() => {
        const roi = taskMetadata.roi as number;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            roi > 0 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            ROI: {roi > 0 ? `$${Math.round(roi).toLocaleString()}/h` : 'Incomplete'}
          </span>
        );
      })()}
    </div>
  );
}

interface ChipEditorProps<T> {
  value: T | undefined;
  displayValue: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: T | undefined) => void;
  onCancel: () => void;
  placeholder: string;
  parser: (input: string) => T | undefined;
  color: string;
}

function ChipEditor<T>({
  value,
  displayValue,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder,
  parser,
  color
}: ChipEditorProps<T>) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleSave = () => {
    const parsed = parser(inputValue);
    onSave(parsed);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };
  
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`inline-block px-2 py-0.5 text-xs font-medium rounded border-2 border-${color}-300 focus:outline-none focus:border-${color}-500`}
        style={{ width: '80px' }}
      />
    );
  }
  
  const hasValue = value !== undefined && value !== null;
  
  return (
    <button
      onClick={onEdit}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors ${
        hasValue
          ? `bg-${color}-100 text-${color}-700 hover:bg-${color}-200`
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {displayValue}
    </button>
  );
}

// Parsers for chip inputs
function parseValueInput(input: string): number | undefined {
  const cleaned = input.replace('@', '').trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([KMB])?$/i);
  if (!match) return undefined;
  
  const [, numStr, multiplier] = match;
  const num = parseFloat(numStr);
  
  if (multiplier) {
    const multipliers: Record<string, number> = {
      K: 1000,
      M: 1000000,
      B: 1000000000
    };
    return num * multipliers[multiplier.toUpperCase()];
  }
  
  return num;
}

function parseEffortInput(input: string): number | undefined {
  const cleaned = input.replace('@', '').trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([hdwm])?$/i);
  if (!match) return undefined;
  
  const [, numStr, unit = 'h'] = match;
  const num = parseFloat(numStr);
  
  const multipliers: Record<string, number> = {
    h: 1,
    d: 8,
    w: 40,
    m: 160
  };
  
  return num * multipliers[unit.toLowerCase()];
}

function parseDueDateInput(input: string): Date | undefined {
  // Remove leading @ if present
  const cleaned = input.replace('@', '').trim();
  
  if (cleaned === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  
  if (cleaned === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
  
  // Try parsing as date
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    date.setHours(0, 0, 0, 0);
    return date;
  }
  
  return undefined;
}

function parseCompanyInput(input: string): TaskCompany | undefined {
  const cleaned = input.replace('@', '').trim().toUpperCase();
  
  if (TASK_RULES.COMPANIES.includes(cleaned as TaskCompany)) {
    return cleaned as TaskCompany;
  }
  
  return undefined;
}