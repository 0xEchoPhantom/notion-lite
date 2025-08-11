import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/client';
import type { TaskCompany } from '@/types/task';

export interface TokenSettings {
  assignees: string[];
  companies: TaskCompany[];
  commonValues: number[];
  commonEfforts: number[];
  defaultCompany?: TaskCompany;
  updatedAt?: Date | { toDate(): Date };
}

/**
 * Load token settings for a user
 */
export async function loadTokenSettings(userId: string): Promise<TokenSettings | null> {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'tokens');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      return settingsDoc.data() as TokenSettings;
    }
    return null;
  } catch (error) {
    console.error('Error loading token settings:', error);
    return null;
  }
}

/**
 * Save token settings for a user
 */
export async function saveTokenSettings(userId: string, settings: TokenSettings): Promise<void> {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'tokens');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving token settings:', error);
    throw error;
  }
}

/**
 * Add a new assignee to token settings if it doesn't exist
 */
export async function addAssigneeToSettings(userId: string, assignee: string): Promise<void> {
  const settings = await loadTokenSettings(userId) || {
    assignees: [],
    companies: [],
    commonValues: [],
    commonEfforts: []
  };
  
  if (!settings.assignees.includes(assignee)) {
    settings.assignees.push(assignee);
    settings.assignees.sort();
    await saveTokenSettings(userId, settings);
  }
}

/**
 * Add a new company to token settings if it doesn't exist
 */
export async function addCompanyToSettings(userId: string, company: string): Promise<void> {
  const settings = await loadTokenSettings(userId) || {
    assignees: [],
    companies: [],
    commonValues: [],
    commonEfforts: []
  };
  
  const companyUpper = company.toUpperCase() as TaskCompany;
  if (!settings.companies.includes(companyUpper)) {
    settings.companies.push(companyUpper);
    settings.companies.sort();
    await saveTokenSettings(userId, settings);
  }
}

/**
 * Add a new value to token settings if it doesn't exist
 */
export async function addValueToSettings(userId: string, value: number): Promise<void> {
  const settings = await loadTokenSettings(userId) || {
    assignees: [],
    companies: [],
    commonValues: [],
    commonEfforts: []
  };
  
  if (!settings.commonValues.includes(value)) {
    settings.commonValues.push(value);
    settings.commonValues.sort((a, b) => a - b);
    await saveTokenSettings(userId, settings);
  }
}

/**
 * Add a new effort to token settings if it doesn't exist
 */
export async function addEffortToSettings(userId: string, effort: number): Promise<void> {
  const settings = await loadTokenSettings(userId) || {
    assignees: [],
    companies: [],
    commonValues: [],
    commonEfforts: []
  };
  
  if (!settings.commonEfforts.includes(effort)) {
    settings.commonEfforts.push(effort);
    settings.commonEfforts.sort((a, b) => a - b);
    await saveTokenSettings(userId, settings);
  }
}