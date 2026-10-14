import { extensionEnvironment } from './build-environment';

const environment = extensionEnvironment(import.meta.env.MODE, {
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
});
export const APP_URL = environment.appUrl;
export const API_BASE_URL = environment.apiUrl;
