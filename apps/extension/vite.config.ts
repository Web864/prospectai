import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { defineConfig, loadEnv } from 'vite';
import { createManifest } from './manifest.config';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '../..', 'VITE_');
  const apiUrl = environment.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
  if (mode !== 'development' && !environment.VITE_API_BASE_URL)
    throw new Error('VITE_API_BASE_URL is required for production extension builds.');
  const hostPermission = `${new URL(apiUrl).origin}/*`;

  return {
    envDir: '../..',
    plugins: [react(), crx({ manifest: createManifest(hostPermission) })],
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
