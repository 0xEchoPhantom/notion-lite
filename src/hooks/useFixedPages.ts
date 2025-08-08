'use client';

import { useState, useEffect } from 'react';
import { FIXED_PAGES, FixedPageConfig } from '@/constants/fixedPages';
import { createPage, getPages } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

export function useFixedPages() {
  console.log('🔧 useFixedPages called');
  
  const { user } = useAuth();
  const { isGTDMode } = useSettings();
  const [isInitialized, setIsInitialized] = useState(false);

  console.log('🔧 useFixedPages render:', { 
    hasUser: !!user, 
    userId: user?.uid, 
    isGTDMode, 
    isInitialized 
  });

  useEffect(() => {
    const initializeFixedPages = async () => {
      // Only run in GTD mode
      if (!user || !isGTDMode || isInitialized) return;

      console.log('🚀 Initializing fixed pages in GTD mode...');

      try {
        // Get existing pages first
        const existingPages = await getPages(user.uid);
        const existingPageTitles = new Set(
          existingPages.map((page: any) => page.title.toLowerCase().trim())
        );

        console.log('📋 Fixed pages check:', {
          isGTDMode,
          fixedPagesCount: FIXED_PAGES.length,
          existingPagesCount: existingPages.length,
          existingTitles: Array.from(existingPageTitles)
        });

        // Only create pages that don't exist (case-insensitive check)
        const pagesToCreate = FIXED_PAGES.filter((fixedPage: FixedPageConfig) => {
          const pageTitle = `${fixedPage.emoji} ${fixedPage.title}`.toLowerCase().trim();
          const exists = existingPageTitles.has(pageTitle);
          console.log(`🔍 Check page "${pageTitle}": ${exists ? 'EXISTS' : 'MISSING'}`);
          return !exists;
        });

        if (pagesToCreate.length > 0) {
          console.log(`✨ Creating ${pagesToCreate.length} missing fixed pages...`);
          
          for (const pageConfig of pagesToCreate) {
            try {
              const pageTitle = `${pageConfig.emoji} ${pageConfig.title}`;
              await createPage(user.uid, pageTitle);
              console.log(`✅ Created fixed page: ${pageTitle}`);
            } catch (error) {
              console.warn(`❌ Failed to create page ${pageConfig.title}:`, error);
            }
          }
        } else {
          console.log('✨ All fixed pages already exist!');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('💥 Error initializing fixed pages:', error);
        setIsInitialized(true);
      }
    };

    // Only run when in GTD mode and user is available
    if (user && isGTDMode && !isInitialized) {
      initializeFixedPages();
    }
    
    // Reset when switching out of GTD mode
    if (!isGTDMode) {
      setIsInitialized(false);
    }
  }, [user?.uid, isGTDMode, isInitialized]);

  return {
    fixedPages: FIXED_PAGES,
    isInitialized: isGTDMode ? isInitialized : true // Always "initialized" in Free mode
  };
}
