'use client';

import React, { useMemo } from 'react';
import { parseTaskTokens, formatValue, formatEffort, formatDueDate } from '@/utils/smartTokenParser';
import { TaskCompany } from '@/types/task';

interface TokenChipsProps {
  content: string;
}

export const TokenChips: React.FC<TokenChipsProps> = ({ content }) => {
  const parsed = useMemo(() => parseTaskTokens(content || ''), [content]);

  const chips: Array<{ key: string; label: string; color: string }> = [];

  if (parsed.values.value !== undefined) {
    chips.push({ key: 'value', label: `💵 ${formatValue(parsed.values.value)}`, color: 'emerald' });
  }
  if (parsed.values.effort !== undefined) {
    chips.push({ key: 'effort', label: `⏱️ ${formatEffort(parsed.values.effort)}`, color: 'blue' });
  }
  if (parsed.values.dueDate !== undefined) {
    chips.push({ key: 'due', label: `📅 ${formatDueDate(parsed.values.dueDate)}`, color: 'purple' });
  }
  if (parsed.values.assignee) {
    chips.push({ key: 'assignee', label: `👤 ${parsed.values.assignee}`, color: 'slate' });
  }
  if (parsed.values.company) {
    chips.push({ key: 'company', label: `${getCompanyIcon(parsed.values.company)} ${parsed.values.company}`, color: 'indigo' });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-1 ml-6 flex flex-wrap items-center gap-1">
      {chips.map((c) => (
        <span
          key={c.key}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${c.color}-100 text-${c.color}-700`}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
};

function getCompanyIcon(company: TaskCompany): string {
  const icons: Record<TaskCompany, string> = {
    AIC: '🏢',
    WN: '🌐',
    BXV: '🚀',
    EA: '⚡',
    PERSONAL: '👤',
  };
  return icons[company] || '🏢';
}
