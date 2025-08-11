// Authentication guard to prevent production accounts in development
export const PRODUCTION_ACCOUNTS = [
  'quangvust201@gmail.com'
];

export const DEVELOPMENT_ACCOUNTS = [
  'admin@dev.com',
  'test@dev.com',
  'dev@dev.com'
];

export const ADMIN_ACCOUNTS = [
  'admin@dev.vn'
];

export function isProductionAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return PRODUCTION_ACCOUNTS.includes(email.toLowerCase());
}

export function isDevelopmentAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEVELOPMENT_ACCOUNTS.includes(email.toLowerCase());
}

export function isAdminAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_ACCOUNTS.includes(email.toLowerCase());
}

export function checkAccountRestrictions(email: string): { allowed: boolean; message?: string } {
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1';
  
  const isProduction = window.location.hostname.includes('vercel.app') || 
                      window.location.hostname.includes('notion-lite');

  // In development, block production accounts
  if (isDevelopment && isProductionAccount(email)) {
    return {
      allowed: false,
      message: `⚠️ Production account "${email}" cannot be used in development environment. Please use a development account like admin@dev.com`
    };
  }

  // In production, warn about development accounts (but allow)
  if (isProduction && isDevelopmentAccount(email)) {
    console.warn(`⚠️ Development account "${email}" is being used in production environment`);
  }

  return { allowed: true };
}