'use client';

import { FIXED_PAGES } from '@/constants/fixedPages';

interface FixedPageIndicatorProps {
  pageTitle: string;
}

export const FixedPageIndicator: React.FC<FixedPageIndicatorProps> = ({ pageTitle }) => {
  // Check if this page matches any fixed page
  const fixedPage = FIXED_PAGES.find(fp => 
    pageTitle.includes(fp.title) || pageTitle.includes(fp.emoji)
  );

  if (!fixedPage) return null;

  return (
    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm ml-3">
      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
      <span>Fixed Page</span>
    </div>
  );
};
