// Fixed pages that are always available in GTD mode
export interface FixedPageConfig {
  id: string;
  title: string;
  emoji: string;
  order: number;
}

export const FIXED_PAGES: FixedPageConfig[] = [
  {
    id: 'capture-page',
    title: 'Capture',
    emoji: '📥',
    order: 1
  },
  {
    id: '2min-page', 
    title: '2 min',
    emoji: '⚡',
    order: 2
  },
  {
    id: 'next-step-page',
    title: 'Next Step',
    emoji: '🎯',
    order: 3
  },
  {
    id: 'delegate-page',
    title: 'Delegate',
    emoji: '👥',
    order: 4
  },
  {
    id: 'pending-page',
    title: 'Pending',
    emoji: '⏳',
    order: 5
  }
];

// Simple app settings - just 2 modes
export interface AppSettings {
  isGTDMode: boolean; // true = GTD mode (fixed pages), false = Free mode (create pages)
}

export const DEFAULT_SETTINGS: AppSettings = {
  isGTDMode: true // Default to GTD mode
};
