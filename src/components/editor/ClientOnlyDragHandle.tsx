'use client';

import React, { useEffect, useState } from 'react';
import { SimpleDragHandle } from './SimpleDragHandle';
import { Block } from '@/types/index';

interface ClientOnlyDragHandleProps {
  block: Block;
  pageId: string;
  pageTitle?: string;
  isSelected: boolean;
  onSelect?: () => void;
  onMoveToGTDPage?: (blockId: string, targetPageId: string) => void;
  onConvertToTodo?: () => void;
}

export const ClientOnlyDragHandle: React.FC<ClientOnlyDragHandleProps> = (props) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render on server to avoid hydration mismatch
  if (!isMounted) {
    // Return a placeholder with the same dimensions to avoid layout shift
    return (
      <div className="w-8 h-8 flex-shrink-0" />
    );
  }

  return <SimpleDragHandle {...props} />;
};