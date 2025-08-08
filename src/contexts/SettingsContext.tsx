'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '@/constants/fixedPages';

interface SettingsContextType {
  settings: AppSettings;
  toggleMode: () => void;
  isGTDMode: boolean;
  isFreeMode: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const toggleMode = () => {
    const newMode = !settings.isGTDMode;
    console.log(`🔄 Toggling mode: ${settings.isGTDMode ? 'GTD' : 'Free'} → ${newMode ? 'GTD' : 'Free'}`);
    setSettings(prev => ({ 
      isGTDMode: newMode 
    }));
  };

  console.log('⚙️ SettingsContext render:', { 
    isGTDMode: settings.isGTDMode,
    isFreeMode: !settings.isGTDMode 
  });

  return (
    <SettingsContext.Provider value={{
      settings,
      toggleMode,
      isGTDMode: settings.isGTDMode,
      isFreeMode: !settings.isGTDMode
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
