'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TASK_RULES, TaskCompany } from '@/types/task';
import { collection, query, limit, getDocs, orderBy } from 'firebase/firestore';
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

  // Load suggestions based on query
  useEffect(() => {
    if (!isOpen) return;
    
    loadSuggestions();
  }, [searchQuery, isOpen, user]);

  const loadSuggestions = async () => {
    const allSuggestions: Suggestion[] = [];
    
    // Templates and common values based on what user is typing
    if (queryLower === '' || 'value'.startsWith(queryLower) || queryLower.match(/^\d/) || 
        'giá trị'.includes(queryLower) || 'tiền'.includes(queryLower)) {
      // Value suggestions with Vietnamese
      allSuggestions.push(
        { type: 'template', label: '@10K', value: '@10K', icon: '💰', description: '10 nghìn USD ($10,000)' },
        { type: 'template', label: '@50K', value: '@50K', icon: '💰', description: '50 nghìn USD ($50,000)' },
        { type: 'template', label: '@100K', value: '@100K', icon: '💵', description: '100 nghìn USD ($100,000)' },
        { type: 'template', label: '@500K', value: '@500K', icon: '💵', description: '500 nghìn USD ($500,000)' },
        { type: 'template', label: '@1M', value: '@1M', icon: '💎', description: '1 triệu USD ($1 million)' },
        { type: 'template', label: '@5M', value: '@5M', icon: '💎', description: '5 triệu USD ($5 million)' },
        { type: 'template', label: '@10M', value: '@10M', icon: '🚀', description: '10 triệu USD ($10 million)' },
      );
    }
    
    if (queryLower === '' || 'effort'.startsWith(queryLower) || queryLower.match(/^\d+[hdwm]?$/)) {
      // Effort suggestions with Vietnamese
      allSuggestions.push(
        { type: 'template', label: '@15m', value: '@0.25h', icon: '⚡', description: '15 phút (15 minutes)' },
        { type: 'template', label: '@30m', value: '@0.5h', icon: '⏱️', description: '30 phút (30 minutes)' },
        { type: 'template', label: '@1h', value: '@1h', icon: '⏱️', description: '1 giờ (1 hour)' },
        { type: 'template', label: '@2h', value: '@2h', icon: '⏱️', description: '2 giờ (2 hours)' },
        { type: 'template', label: '@4h', value: '@4h', icon: '⏱️', description: '4 giờ (4 hours)' },
        { type: 'template', label: '@1d', value: '@1d', icon: '📅', description: '1 ngày (8 hours)' },
        { type: 'template', label: '@1w', value: '@1w', icon: '📆', description: '1 tuần (40 hours)' },
      );
    }
    
    if (queryLower === '' || 
        'due'.startsWith(queryLower) || 
        'today'.startsWith(queryLower) || 'tomorrow'.startsWith(queryLower) ||
        'hôm nay'.includes(queryLower) || 'ngày mai'.includes(queryLower) ||
        'tmr'.startsWith(queryLower) || 'td'.startsWith(queryLower)) {
      // Due date suggestions with Vietnamese and shortcuts
      allSuggestions.push(
        { type: 'template', label: '@today (@td)', value: '@today', icon: '📅', description: 'Hôm nay (today)' },
        { type: 'template', label: '@tomorrow (@tmr)', value: '@tomorrow', icon: '📅', description: 'Ngày mai (tomorrow)' },
        { type: 'template', label: '@monday (@mon)', value: '@monday', icon: '📅', description: 'Thứ 2 tới (Next Monday)' },
        { type: 'template', label: '@tuesday (@tue)', value: '@tuesday', icon: '📅', description: 'Thứ 3 tới (Next Tuesday)' },
        { type: 'template', label: '@wednesday (@wed)', value: '@wednesday', icon: '📅', description: 'Thứ 4 tới (Next Wednesday)' },
        { type: 'template', label: '@thursday (@thu)', value: '@thursday', icon: '📅', description: 'Thứ 5 tới (Next Thursday)' },
        { type: 'template', label: '@friday (@fri)', value: '@friday', icon: '📅', description: 'Thứ 6 tới (Next Friday)' },
        { type: 'template', label: '@saturday (@sat)', value: '@saturday', icon: '📅', description: 'Thứ 7 tới (Next Saturday)' },
        { type: 'template', label: '@sunday (@sun)', value: '@sunday', icon: '📅', description: 'Chủ nhật tới (Next Sunday)' },
      );
    }
    
    // Company suggestions with Vietnamese
    TASK_RULES.COMPANIES.forEach(company => {
      if (queryLower === '' || company.toLowerCase().includes(queryLower) || 
          'company'.startsWith(queryLower) || 'công ty'.includes(queryLower)) {
        allSuggestions.push({
          type: 'company',
          label: `@${company}`,
          value: `@${company}`,
          icon: getCompanyIcon(company),
          description: getCompanyDescription(company)
        });
      }
    });
    
    // Common Vietnamese names
    const commonVietnameseNames = ['Nam', 'Linh', 'Minh', 'Anh', 'Huy', 'Duc', 'Mai', 'Lan', 'Thao', 'Tuan'];
    commonVietnameseNames.forEach(name => {
      if (queryLower === '' || name.toLowerCase().includes(queryLower)) {
        allSuggestions.push({
          type: 'assignee',
          label: `@${name}`,
          value: `@${name}`,
          icon: '👨‍💼',
          description: 'Thành viên nhóm (Team member)'
        });
      }
    });
    
    // Load historical values from user's tasks
    if (user) {
      try {
        const tasksRef = collection(db, 'users', user.uid, 'tasks');
        const recentTasks = await getDocs(query(tasksRef, orderBy('updatedAt', 'desc'), limit(100)));
        
        const valueSet = new Set<number>();
        const effortSet = new Set<number>();
        const assigneeSet = new Set<string>();
        
        recentTasks.forEach(doc => {
          const data = doc.data();
          if (data.value && !valueSet.has(data.value)) {
            valueSet.add(data.value);
          }
          if (data.effort && !effortSet.has(data.effort)) {
            effortSet.add(data.effort);
          }
          if (data.assignee && !assigneeSet.has(data.assignee)) {
            assigneeSet.add(data.assignee);
          }
        });
        
        // Add recent values
        Array.from(valueSet).slice(0, 3).forEach(val => {
          const formatted = formatValueForDisplay(val);
          if (queryLower === '' || formatted.toLowerCase().includes(queryLower)) {
            allSuggestions.push({
              type: 'value',
              label: `@${formatted}`,
              value: `@${formatted}`,
              icon: '💵',
              description: 'Recent value'
            });
          }
        });
        
        // Add recent efforts
        Array.from(effortSet).slice(0, 3).forEach(val => {
          const formatted = formatEffortForDisplay(val);
          if (queryLower === '' || formatted.toLowerCase().includes(queryLower)) {
            allSuggestions.push({
              type: 'effort',
              label: `@${formatted}`,
              value: `@${formatted}`,
              icon: '⏱️',
              description: 'Recent effort'
            });
          }
        });
        
        // Add recent assignees
        Array.from(assigneeSet).slice(0, 5).forEach(assignee => {
          if (queryLower === '' || assignee.toLowerCase().includes(queryLower)) {
            allSuggestions.push({
              type: 'assignee',
              label: `@${assignee}`,
              value: `@${assignee}`,
              icon: '👤',
              description: 'Team member'
            });
          }
        });
      } catch (error) {
        console.error('Error loading historical suggestions:', error);
      }
    }
    
    // Filter and dedupe
    const seen = new Set<string>();
    const filtered = allSuggestions.filter(s => {
      if (seen.has(s.value)) return false;
      seen.add(s.value);
      return true;
    });
    
    setSuggestions(filtered.slice(0, 8)); // Limit to 8 suggestions
  };

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

function getCompanyDescription(company: TaskCompany): string {
  const descriptions: Record<TaskCompany, string> = {
    'AIC': 'Công ty AI (AI Company)',
    'WN': 'Mạng Web (Web Network)',
    'BXV': 'Kinh doanh (Business Ventures)',
    'EA': 'Phần mềm doanh nghiệp (Enterprise Apps)',
    'PERSONAL': 'Dự án cá nhân (Personal projects)'
  };
  return descriptions[company] || company;
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