'use client';

import { useState, useEffect } from 'react';
import { FIXED_PAGES, FixedPageConfig } from '@/constants/fixedPages';
import { createPage, getPages } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

export function useFixedPages() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeFixedPages = async () => {
      if (!user || isInitialized) return;

      try {
        // Get existing pages first
        const existingPages = await getPages(user.uid);
        const existingPageTitles = new Set(
          existingPages.map((page: any) => page.title.toLowerCase().trim())
        );

        console.log('Fixed pages initialization:', {
          fixedPagesCount: FIXED_PAGES.length,
          existingPagesCount: existingPages.length,
          existingTitles: Array.from(existingPageTitles)
        });

        // Only create pages that don't exist (case-insensitive check)
        const pagesToCreate = FIXED_PAGES.filter((fixedPage: FixedPageConfig) => {
          const pageTitle = `${fixedPage.emoji} ${fixedPage.title}`.toLowerCase().trim();
          return !existingPageTitles.has(pageTitle);
        });

        if (pagesToCreate.length > 0) {
          console.log(`Creating ${pagesToCreate.length} missing fixed pages...`);
          
          for (const pageConfig of pagesToCreate) {
            try {
              const pageTitle = `${pageConfig.emoji} ${pageConfig.title}`;
              await createPage(user.uid, pageTitle);
              console.log(`Created fixed page: ${pageTitle}`);
            } catch (error) {
              console.warn(`Failed to create page ${pageConfig.title}:`, error);
            }
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing fixed pages:', error);
        setIsInitialized(true);
      }
    };

    // Only try to initialize once per user session  
    if (user && !isInitialized) {
      initializeFixedPages();
    }
  }, [user?.uid, isInitialized]);

  return {
    fixedPages: FIXED_PAGES,
    isInitialized
  };
}
