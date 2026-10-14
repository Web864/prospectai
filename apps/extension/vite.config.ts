import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { defineConfig, loadEnv } from 'vite';
import { createManifest } from './manifest.config';
import { extensionEnvironment } from './src/build-environment';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '../..', 'VITE_');
  const { apiUrl } = extensionEnvironment(mode, environment);
  const hostPermission = `${new URL(apiUrl).origin}/*`;

  return {
    envDir: '../..',
    plugins: [react(), crx({ manifest: createManifest(hostPermission) })],
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
