'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TaskCompany } from '@/types/task';
import { collection, query, limit, getDocs, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TokenSuggestProps {
  isOpen: boolean;
  position: { x: number; y: number };
  searchQuery: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

interface Suggestion {
  type: 'value' | 'effort' | 'due' | 'company' | 'assignee' | 'template';
  label: string;
  value: string;
  icon: string;
  description?: string;
  count?: number; // How many times used
}

export function TokenSuggest({ isOpen, position, searchQuery, onSelect, onClose }: TokenSuggestProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryLower = searchQuery.toLowerCase();

  // Memoize loader to avoid exhaustive-deps warning
  const loadSuggestions = useCallback(async () => {
  const allSuggestions: Suggestion[] = [];
  const intendedType = inferType(queryLower);
    
    // Load historical values from user's tasks
    if (user) {
      try {
        // Load team members from delegation settings
        const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'delegation'));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          if (settings?.teamMembers && Array.isArray(settings.teamMembers)) {
            settings.teamMembers.forEach((member: { name: string; email?: string }) => {
              if (member.name) {
                const matchesQuery = !queryLower || member.name.toLowerCase().includes(queryLower);
                const matchesType = !intendedType || intendedType === 'assignee';
                if (matchesQuery && matchesType) {
                  allSuggestions.push({
                    type: 'assignee',
                    label: `@${member.name}`,
                    value: `@${member.name}`,
                    icon: '👤',
                    description: 'Team member',
                    count: 1000 // High priority for configured team members
                  });
                }
              }
            });
          }
        }
        // Query blocks with taskMetadata instead of tasks collection
        const blocksRef = collection(db, 'users', user.uid, 'blocks');
        // Simplified query to avoid index issues - get all blocks and filter client-side
        const allBlocks = await getDocs(query(
          blocksRef, 
          orderBy('updatedAt', 'desc'), 
          limit(500)
        ));
        
        // Filter for todo-list blocks client-side
        const todoBlocks = allBlocks.docs.filter(doc => {
          const data = doc.data();
          return data.type === 'todo-list';
        });

        const valueCounts = new Map<number, number>();
        const effortCounts = new Map<number, number>();
        const assigneeCounts = new Map<string, number>();
        const dueCounts = new Map<string, number>(); // store token form YYYY-MM-DD
        const companyCounts = new Map<string, number>();

        todoBlocks.forEach(docSnap => {
          const blockData = docSnap.data();
          const data = blockData.taskMetadata || {};
          
          if (data.value) valueCounts.set(data.value, (valueCounts.get(data.value) || 0) + 1);
          if (data.effort) effortCounts.set(data.effort, (effortCounts.get(data.effort) || 0) + 1);
          if (data.assignee) assigneeCounts.set(String(data.assignee), (assigneeCounts.get(String(data.assignee)) || 0) + 1);
          if (data.company) companyCounts.set(String(data.company), (companyCounts.get(String(data.company)) || 0) + 1);
          if (data.dueDate) {
            try {
              const d = coerceToDate(data.dueDate);
              const iso = toISODate(d);
              dueCounts.set(iso, (dueCounts.get(iso) || 0) + 1);
            } catch {}
          }
        });

        // Build suggestions by type, filter and sort by count desc
        const pushIfMatch = (s: Suggestion) => {
          const q = queryLower;
          const matchesQuery = !q || s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q);
          const matchesType = !intendedType || s.type === intendedType;
          if (matchesQuery && matchesType) allSuggestions.push(s);
        };

        valueCounts.forEach((count, val) => {
          const formatted = formatValueForDisplay(val);
          pushIfMatch({ type: 'value', label: `@${formatted}`, value: `@${formatted}`, icon: '💵', description: `Used ${count}×`, count });
        });
        effortCounts.forEach((count, hrs) => {
          const formatted = formatEffortForDisplay(hrs);
          pushIfMatch({ type: 'effort', label: `@${formatted}`, value: `@${formatted}`, icon: '⏱️', description: `Used ${count}×`, count });
        });
        dueCounts.forEach((count, iso) => {
          pushIfMatch({ type: 'due', label: `@${iso}`, value: `@${iso}`, icon: '📅', description: `Used ${count}×`, count });
        });
        // Only add historical assignees if no team members are configured
        const hasTeamMembers = allSuggestions.some(s => s.type === 'assignee' && s.count === 1000);
        if (!hasTeamMembers) {
          assigneeCounts.forEach((count, name) => {
            pushIfMatch({ type: 'assignee', label: `@${name}`, value: `@${name}`, icon: '👤', description: `Used ${count}×`, count });
          });
        }
        companyCounts.forEach((count, comp) => {
          pushIfMatch({ type: 'company', label: `@${comp}`, value: `@${comp}`, icon: getCompanyIcon(comp as TaskCompany), description: `Used ${count}×`, count });
        });
      } catch (error) {
        console.error('Error loading historical suggestions:', error);
      }
    }
    
    // Dedupe by value and sort by count desc (historical frequency), fallback by label
    const seen = new Map<string, Suggestion>();
    for (const s of allSuggestions) {
      const existing = seen.get(s.value);
      if (!existing || ((s.count || 0) > (existing.count || 0))) {
        seen.set(s.value, s);
      }
    }

    const sorted = Array.from(seen.values()).sort((a, b) => (b.count || 0) - (a.count || 0) || a.label.localeCompare(b.label));
    setSuggestions(sorted.slice(0, 8));
  }, [queryLower, user]);
  // Load suggestions based on query
  useEffect(() => {
    if (!isOpen) return;
    loadSuggestions();
  }, [searchQuery, isOpen, loadSuggestions]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex].value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-72"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">
        Suggestions
      </div>
      
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.type}-${suggestion.value}`}
          className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
            index === selectedIndex ? 'bg-blue-50' : ''
          }`}
          onClick={() => onSelect(suggestion.value)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-gray-900">{suggestion.label}</div>
            {suggestion.description && (
              <div className="text-xs text-gray-500">{suggestion.description}</div>
            )}
          </div>
          {index === selectedIndex && (
            <span className="text-xs text-gray-400">↵</span>
          )}
        </button>
      ))}
      
      <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100 mt-1">
        Use ↑↓ to navigate, Enter to select
      </div>
    </div>
  );
}

// Helper functions
function coerceToDate(input: unknown): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'string' || typeof input === 'number') return new Date(input);
  const maybe = input as { toDate?: () => Date } | undefined;
  if (maybe && typeof maybe.toDate === 'function') return maybe.toDate();
  return new Date(NaN);
}
function inferType(q: string): Suggestion['type'] | undefined {
  if (!q) return undefined;
  // explicit prefixes
  if (q.startsWith('value:') || q.startsWith('v:')) return 'value';
  if (q.startsWith('effort:') || q.startsWith('e:')) return 'effort';
  if (q.startsWith('due:') || q.startsWith('d:')) return 'due';
  if (q.startsWith('company:') || q.startsWith('c:')) return 'company';
  if (q.startsWith('assignee:') || q.startsWith('a:')) return 'assignee';
  // patterns
  if (/^\d+(?:\.\d+)?[kmb]?$/i.test(q)) return 'value';
  if (/^\d+(?:\.\d+)?[hdwm]$/i.test(q)) return 'effort';
  if (/^\d{4}-\d{2}-\d{2}$/.test(q) || /^(today|tomorrow|td|tmr|mon|tue|wed|thu|fri|sat|sun)$/i.test(q)) return 'due';
  // all uppercase short looks like company, but we only include historical ones anyway
  if (/^[A-Z]{2,8}$/.test(q)) return 'company';
  // default leave undefined (assignee/tag-like), but we removed tags
  return undefined;
}

function getCompanyIcon(company: TaskCompany): string {
  const icons: Record<TaskCompany, string> = {
    'AIC': '🏢',
    'WN': '🌐',
    'BXV': '🚀',
    'EA': '⚡',
    'PERSONAL': '👤'
  };
  return icons[company] || '🏢';
}

function formatValueForDisplay(value: number): string {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

function formatEffortForDisplay(hours: number): string {
  if (hours >= 160) return `${(hours / 160).toFixed(1)}m`;
  if (hours >= 40) return `${(hours / 40).toFixed(1)}w`;
  if (hours >= 8) return `${(hours / 8).toFixed(1)}d`;
  if (hours < 1) {
    const minutes = hours * 60;
    if (minutes === 15) return '15m';
    if (minutes === 30) return '30m';
    return `${minutes.toFixed(0)}m`;
  }
  return `${hours}h`;
}

function toISODate(date: Date): string {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d.toISOString().split('T')[0];
}