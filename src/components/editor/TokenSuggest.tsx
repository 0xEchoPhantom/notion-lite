'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TaskCompany } from '@/types/task';
import { collection, query, limit, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
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
  source?: 'configured' | 'historical' | 'create'; // Where this suggestion comes from
  action?: 'use' | 'create' | 'add-to-manager'; // What happens on selection
}

export function TokenSuggest({ isOpen, position, searchQuery, onSelect, onClose }: TokenSuggestProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Extract symbol and content from searchQuery
  const tokenSymbol = searchQuery[0] || '@';
  const queryContent = searchQuery.slice(1) || '';
  const queryLower = queryContent.toLowerCase();

  // Helper function to normalize values for comparison
  const normalizeForComparison = (value: string, type: Suggestion['type']): string => {
    if (type === 'company') return value.toUpperCase();
    if (type === 'assignee') return value.toLowerCase();
    if (type === 'value' || type === 'effort') {
      // Normalize numeric values
      const parsed = type === 'value' ? parseValueString(value) : parseEffortString(value);
      return parsed ? parsed.toString() : value.toLowerCase();
    }
    return value.toLowerCase();
  };

  // Memoize loader to avoid exhaustive-deps warning
  const loadSuggestions = useCallback(async () => {
  const allSuggestions: Suggestion[] = [];
  const configuredValues = new Set<string>(); // Track configured values to prevent duplicates
  
  // Determine type based on symbol - STRICT filtering
  let symbolType: Suggestion['type'] | undefined;
  let strictFilter = true; // Only show suggestions for this symbol's type
  
  switch (tokenSymbol) {
    case '$': 
      symbolType = 'value'; 
      break;
    case '#': 
      symbolType = 'due'; 
      break;
    case '~': 
      symbolType = 'effort'; 
      break;
    case '&': 
      symbolType = 'company'; 
      break;
    case '@': 
      symbolType = 'assignee'; 
      // @ is STRICTLY for assignees only - no type inference
      strictFilter = true; // Always strict for @
      break;
    default: 
      // For unknown symbols, don't suggest anything
      symbolType = undefined;
      strictFilter = true;
      break;
  }
  
  const intendedType = symbolType;
    
    // Load predefined values from token settings
    if (user) {
      try {
        // Load token settings
        const tokenSettingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'tokens'));
        if (tokenSettingsDoc.exists()) {
          const tokenSettings = tokenSettingsDoc.data();
          
          // Add team members (@ symbol only)
          if (tokenSymbol === '@' && tokenSettings?.assignees && Array.isArray(tokenSettings.assignees)) {
            tokenSettings.assignees.forEach((name: string) => {
              const matchesQuery = !queryLower || name.toLowerCase().includes(queryLower);
              if (matchesQuery) {
                const normalizedName = normalizeForComparison(name, 'assignee');
                configuredValues.add(`assignee:${normalizedName}`);
                allSuggestions.push({
                  type: 'assignee',
                  label: `@${name}`,
                  value: `@${name}`,
                  icon: '👤',
                  description: 'Team member',
                  count: 1000, // High priority for configured team members
                  source: 'configured',
                  action: 'use'
                });
              }
            });
          }
          
          // Add common values ($ symbol only)
          if (tokenSymbol === '$' && tokenSettings?.commonValues && Array.isArray(tokenSettings.commonValues)) {
            tokenSettings.commonValues.forEach((value: number) => {
              const formatted = formatValueForDisplay(value);
              const matchesQuery = !queryLower || formatted.toLowerCase().includes(queryLower) || value.toString().includes(queryLower);
              if (matchesQuery) {
                configuredValues.add(`value:${value}`);
                allSuggestions.push({
                  type: 'value',
                  label: `$${formatted.replace('$', '')}`,
                  value: `$${formatted.replace('$', '')}`,
                  icon: '💵',
                  description: 'Configured value',
                  count: 1000,
                  source: 'configured',
                  action: 'use'
                });
              }
            });
          }
          
          // Add common efforts (~ symbol only)
          if (tokenSymbol === '~' && tokenSettings?.commonEfforts && Array.isArray(tokenSettings.commonEfforts)) {
            tokenSettings.commonEfforts.forEach((effort: number) => {
              const formatted = formatEffortForDisplay(effort);
              const matchesQuery = !queryLower || formatted.toLowerCase().includes(queryLower);
              if (matchesQuery) {
                configuredValues.add(`effort:${effort}`);
                allSuggestions.push({
                  type: 'effort',
                  label: `~${formatted}`,
                  value: `~${formatted}`,
                  icon: '⏱️',
                  description: 'Configured effort',
                  count: 1000,
                  source: 'configured',
                  action: 'use'
                });
              }
            });
          }
          
          // Add companies from settings (& symbol only)
          if (tokenSymbol === '&' && tokenSettings?.companies && Array.isArray(tokenSettings.companies)) {
            tokenSettings.companies.forEach((company: string) => {
              const matchesQuery = !queryLower || company.toLowerCase().includes(queryLower);
              if (matchesQuery) {
                const normalizedCompany = company.toUpperCase();
                configuredValues.add(`company:${normalizedCompany}`);
                allSuggestions.push({
                  type: 'company',
                  label: `&${company}`,
                  value: `&${company}`,
                  icon: '🏢',
                  description: 'Organization',
                  count: 1000, // High priority for configured companies
                  source: 'configured',
                  action: 'use'
                });
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

        // Add historical values (skip if already in configured)
        valueCounts.forEach((count, val) => {
          const key = `value:${val}`;
          if (!configuredValues.has(key)) {
            const formatted = formatValueForDisplay(val);
            const suggestion: Suggestion = {
              type: 'value',
              label: `$${formatted}`,
              value: `$${formatted}`,
              icon: count >= 5 ? '⭐' : '📊',
              description: count >= 5 ? `Frequently used (${count}×)` : `Used ${count}×`,
              count,
              source: 'historical',
              action: count >= 5 ? 'add-to-manager' : 'use'
            };
            pushIfMatch(suggestion);
          }
        });
        
        effortCounts.forEach((count, hrs) => {
          const key = `effort:${hrs}`;
          if (!configuredValues.has(key)) {
            const formatted = formatEffortForDisplay(hrs);
            const suggestion: Suggestion = {
              type: 'effort',
              label: `~${formatted}`,
              value: `~${formatted}`,
              icon: count >= 5 ? '⭐' : '📊',
              description: count >= 5 ? `Frequently used (${count}×)` : `Used ${count}×`,
              count,
              source: 'historical',
              action: count >= 5 ? 'add-to-manager' : 'use'
            };
            pushIfMatch(suggestion);
          }
        });
        
        dueCounts.forEach((count, iso) => {
          pushIfMatch({ 
            type: 'due', 
            label: `#${iso}`, 
            value: `#${iso}`, 
            icon: '📅', 
            description: `Used ${count}×`, 
            count,
            source: 'historical',
            action: 'use'
          });
        });
        
        // Add historical assignees (check for duplicates case-insensitively)
        assigneeCounts.forEach((count, name) => {
          const normalizedName = normalizeForComparison(name, 'assignee');
          const key = `assignee:${normalizedName}`;
          if (!configuredValues.has(key)) {
            const suggestion: Suggestion = {
              type: 'assignee',
              label: `@${name}`,
              value: `@${name}`,
              icon: count >= 5 ? '⭐' : '👤',
              description: count >= 5 ? `Frequently used (${count}×)` : `Used ${count}×`,
              count,
              source: 'historical',
              action: count >= 5 ? 'add-to-manager' : 'use'
            };
            pushIfMatch(suggestion);
          }
        });
        
        companyCounts.forEach((count, comp) => {
          const normalizedCompany = comp.toUpperCase();
          const key = `company:${normalizedCompany}`;
          if (!configuredValues.has(key)) {
            const suggestion: Suggestion = {
              type: 'company',
              label: `&${comp}`,
              value: `&${comp}`,
              icon: count >= 5 ? '⭐' : getCompanyIcon(comp as TaskCompany),
              description: count >= 5 ? `Frequently used (${count}×)` : `Used ${count}×`,
              count,
              source: 'historical',
              action: count >= 5 ? 'add-to-manager' : 'use'
            };
            pushIfMatch(suggestion);
          }
        });
      } catch (error) {
        console.error('Error loading historical suggestions:', error);
      }
    }
    
    // Add comprehensive date suggestions based on query (# symbol only)
    const addDateSuggestions = () => {
      // Only show date suggestions for # symbol
      if (tokenSymbol !== '#') return;
      // All available date shortcuts with bilingual support (# symbol for dates)
      const allDateShortcuts = [
        // Basic terms
        { label: '#today', desc: 'Today', alt: ['#td', '#hôm nay'], priority: 1000 },
        { label: '#tomorrow', desc: 'Tomorrow', alt: ['#tmr', '#mai', '#ngày mai'], priority: 999 },
        { label: '#yesterday', desc: 'Yesterday', alt: ['#yst', '#hôm qua'], priority: 998 },
        
        // Weekdays English
        { label: '#monday', desc: 'Next Monday', alt: ['#mon', '#thứ 2', '#t2'], priority: 900 },
        { label: '#tuesday', desc: 'Next Tuesday', alt: ['#tue', '#thứ 3', '#t3'], priority: 900 },
        { label: '#wednesday', desc: 'Next Wednesday', alt: ['#wed', '#thứ 4', '#t4'], priority: 900 },
        { label: '#thursday', desc: 'Next Thursday', alt: ['#thu', '#thứ 5', '#t5'], priority: 900 },
        { label: '#friday', desc: 'Next Friday', alt: ['#fri', '#thứ 6', '#t6'], priority: 900 },
        { label: '#saturday', desc: 'Next Saturday', alt: ['#sat', '#thứ 7', '#t7'], priority: 900 },
        { label: '#sunday', desc: 'Next Sunday', alt: ['#sun', '#chủ nhật', '#cn'], priority: 900 },
        
        // Week terms
        { label: '#weekend', desc: 'This weekend', alt: ['#cuối tuần'], priority: 850 },
        { label: '#next week', desc: 'Next week', alt: ['#tuần tới', '#tuần sau'], priority: 850 },
        { label: '#this week', desc: 'End of this week', alt: ['#tuần này', '#eow'], priority: 850 },
        { label: '#eow', desc: 'End of week (Friday)', alt: ['#friday'], priority: 840 },
        { label: '#eom', desc: 'End of month', alt: [], priority: 830 },
        
        // Vietnamese specific
        { label: '#mai', desc: 'Ngày mai (Tomorrow)', alt: ['#tomorrow', '#tmr'], priority: 950 },
        { label: '#hôm nay', desc: 'Today (Vietnamese)', alt: ['#today', '#td'], priority: 950 },
        { label: '#hôm qua', desc: 'Yesterday (Vietnamese)', alt: ['#yesterday', '#yst'], priority: 940 },
        
        // Relative dates
        { label: '#+3', desc: '3 days from now', alt: ['#3d', '#sau 3 ngày'], priority: 800 },
        { label: '#+7', desc: '7 days from now', alt: ['#7d', '#in 1 week'], priority: 800 },
        { label: '#+14', desc: '2 weeks from now', alt: ['#14d', '#in 2 weeks'], priority: 790 },
        
        // Vietnamese weekdays
        { label: '#t2', desc: 'Thứ 2 (Monday)', alt: ['#monday', '#mon'], priority: 880 },
        { label: '#t3', desc: 'Thứ 3 (Tuesday)', alt: ['#tuesday', '#tue'], priority: 880 },
        { label: '#t4', desc: 'Thứ 4 (Wednesday)', alt: ['#wednesday', '#wed'], priority: 880 },
        { label: '#t5', desc: 'Thứ 5 (Thursday)', alt: ['#thursday', '#thu'], priority: 880 },
        { label: '#t6', desc: 'Thứ 6 (Friday)', alt: ['#friday', '#fri'], priority: 880 },
        { label: '#t7', desc: 'Thứ 7 (Saturday)', alt: ['#saturday', '#sat'], priority: 880 },
        { label: '#cn', desc: 'Chủ nhật (Sunday)', alt: ['#sunday', '#sun'], priority: 880 },
      ];
      
      // Smart filtering based on query
      allDateShortcuts.forEach(({ label, desc, alt, priority }) => {
        // Check if this suggestion matches the query
        const labelMatch = label.toLowerCase().includes(queryLower);
        const descMatch = desc.toLowerCase().includes(queryLower);
        const altMatch = alt.some(a => a.toLowerCase().includes(queryLower));
        
        // Special matching for common patterns
        const isDateQuery = intendedType === 'due' || 
          /^(t|m|w|h|d|th|tu|cu|ng|sa|su|ye|to|eo|ne|\+|\d)/.test(queryLower) ||
          queryLower.includes('day') || queryLower.includes('week') || 
          queryLower.includes('ngày') || queryLower.includes('tuần');
        
        // Include if matches query or if query is date-related and this is a high-priority item
        if (labelMatch || descMatch || altMatch || (isDateQuery && priority >= 850 && queryLower.length <= 2)) {
          // Calculate match score for better ordering
          let matchScore = priority;
          if (label.toLowerCase().startsWith('@' + queryLower)) matchScore += 100;
          if (labelMatch) matchScore += 50;
          if (descMatch) matchScore += 30;
          
          allSuggestions.push({
            type: 'due',
            label,
            value: label,
            icon: '📅',
            description: `${desc}${alt.length > 0 ? ' • Also: ' + alt.slice(0, 2).join(', ') : ''}`,
            count: matchScore,
            source: 'configured',
            action: 'use'
          });
        }
      });
      
      // If user is typing a number, suggest relative date format
      if (/^\+?\d+$/.test(queryLower)) {
        const days = parseInt(queryLower.replace('+', ''));
        if (days > 0 && days <= 365) {
          allSuggestions.push({
            type: 'due',
            label: `#+${days}`,
            value: `#+${days}`,
            icon: '📅',
            description: `${days} day${days > 1 ? 's' : ''} from now`,
            count: 750,
            source: 'configured',
            action: 'use'
          });
        }
      }
      
      // If user is typing a date format, recognize it
      if (/^\d{1,2}[\/\-\.]/.test(queryLower)) {
        allSuggestions.push({
          type: 'due',
          label: `#${queryLower}`,
          value: `#${queryLower}`,
          icon: '📅',
          description: 'Custom date',
          count: 700,
          source: 'configured',
          action: 'use'
        });
      }
    };
    
    // Call the date suggestions function
    addDateSuggestions();
    
    // Dedupe by value and sort by count desc (historical frequency), fallback by label
    const seen = new Map<string, Suggestion>();
    for (const s of allSuggestions) {
      const existing = seen.get(s.value);
      if (!existing || ((s.count || 0) > (existing.count || 0))) {
        seen.set(s.value, s);
      }
    }

    let sorted = Array.from(seen.values()).sort((a, b) => (b.count || 0) - (a.count || 0) || a.label.localeCompare(b.label));
    
    // Add "Create new" option if query doesn't match existing suggestions exactly
    if (queryLower && queryLower.length >= 1) {
      // Check if value already exists (case-insensitive, normalized)
      // Use the symbol's type strictly - no inference
      const detectedType = symbolType || 'assignee';
      const normalizedQuery = normalizeForComparison(queryLower, detectedType);
      
      // Check if this exact value already exists in suggestions
      const exactMatch = sorted.find(s => {
        const valueWithoutSymbol = s.value.substring(1); // Remove symbol
        const normalizedSuggestion = normalizeForComparison(valueWithoutSymbol, s.type);
        return normalizedSuggestion === normalizedQuery;
      });
      
      if (!exactMatch) {
        const typeLabels: Record<string, string> = {
          'value': '💵 Value',
          'effort': '⏱️ Effort', 
          'due': '📅 Due date',
          'assignee': '👤 Person',
          'company': '🏢 Company',
          'template': '📋 Template'
        };
        
        // Use the appropriate symbol for the type
        const symbolMap: Record<string, string> = {
          'value': '$',
          'effort': '~',
          'due': '#',
          'assignee': '@',
          'company': '&'
        };
        
        const symbol = symbolMap[detectedType] || '@';
        
        const createOption: Suggestion = {
          type: detectedType,
          label: `Create new: ${symbol}${queryLower}`,
          value: `${symbol}${queryLower}`,
          icon: '➕',
          description: `Add as ${typeLabels[detectedType]} and save to Manager`,
          count: -1, // Always show at bottom
          source: 'create',
          action: 'create'
        };
        
        sorted = [...sorted.slice(0, 7), createOption];
      }
    }
    
    setSuggestions(sorted.slice(0, 8));
  }, [queryLower, tokenSymbol, user]);
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
          if (suggestions.length > 0) {
            setSelectedIndex(prev => (prev + 1) % suggestions.length);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (suggestions.length > 0) {
            setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          }
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex].value);
          } else if (searchQuery && suggestions.length === 0) {
            // Create new with the original symbol from searchQuery
            onSelect(searchQuery);
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

  if (!isOpen) return null;
  
  // Always show menu even if no suggestions (will show "Create new" option)

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
        {suggestions.length > 0 ? 'Suggestions' : 'Type to create'}
      </div>
      
      {suggestions.length === 0 ? (
        <div className="px-3 py-3 text-sm text-gray-500">
          Type a value and press Enter to create
        </div>
      ) : (
        suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.type}-${suggestion.value}-${suggestion.source}`}
          className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
            index === selectedIndex ? 'bg-blue-50' : ''
          }`}
          onClick={() => onSelect(suggestion.value)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{suggestion.label}</span>
              {suggestion.source === 'configured' && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Manager</span>
              )}
              {suggestion.source === 'historical' && suggestion.count && suggestion.count >= 5 && (
                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Frequent</span>
              )}
              {suggestion.action === 'create' && (
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">New</span>
              )}
            </div>
            {suggestion.description && (
              <div className="text-xs text-gray-500">{suggestion.description}</div>
            )}
          </div>
          {suggestion.action === 'add-to-manager' && (
            <span className="text-xs text-purple-600">📍 Add</span>
          )}
          {index === selectedIndex && (
            <span className="text-xs text-gray-400">↵</span>
          )}
        </button>
      ))
      )}
      
      <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100 mt-1">
        Use ↑↓ to navigate, Enter to select
      </div>
    </div>
  );
}

// Helper functions
function parseValueString(input: string): number | undefined {
  const cleaned = input.replace(/[@$,]/g, '').trim();
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

function parseEffortString(input: string): number | undefined {
  const cleaned = input.replace(/@/g, '').trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([mhdwM])?$/);
  if (!match) return undefined;
  
  const [, numStr, unit = 'h'] = match;
  const num = parseFloat(numStr);
  
  const multipliers: Record<string, number> = {
    m: 1/60,
    h: 1,
    d: 8,
    w: 40,
    M: 160
  };
  
  return num * multipliers[unit.toLowerCase()];
}

function coerceToDate(input: unknown): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'string' || typeof input === 'number') return new Date(input);
  const maybe = input as { toDate?: () => Date } | undefined;
  if (maybe && typeof maybe.toDate === 'function') return maybe.toDate();
  return new Date(NaN);
}
// DEPRECATED: No longer infer types - each symbol has strict meaning
// @ = assignee, $ = value, # = date, ~ = effort, & = company
function inferType(q: string): Suggestion['type'] | undefined {
  // Only used for legacy explicit prefixes
  if (!q) return undefined;
  // explicit prefixes only - no pattern matching
  if (q.startsWith('value:') || q.startsWith('v:')) return 'value';
  if (q.startsWith('effort:') || q.startsWith('e:')) return 'effort';
  if (q.startsWith('due:') || q.startsWith('d:')) return 'due';
  if (q.startsWith('company:') || q.startsWith('c:')) return 'company';
  if (q.startsWith('assignee:') || q.startsWith('a:')) return 'assignee';
  
  // NO PATTERN MATCHING - symbols determine type
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