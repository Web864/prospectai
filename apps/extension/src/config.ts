const developmentAppUrl = 'http://localhost:3000';
if (!import.meta.env.DEV && (!import.meta.env.VITE_APP_URL || !import.meta.env.VITE_API_BASE_URL))
  throw new Error('VITE_APP_URL and VITE_API_BASE_URL are required in production.');

export const APP_URL = import.meta.env.VITE_APP_URL ?? developmentAppUrl;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? `${APP_URL}/api/v1`;
