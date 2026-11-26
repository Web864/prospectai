import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { defineConfig, loadEnv } from 'vite';
import { createManifest } from './manifest.config';
import { extensionEnvironment, isLocalMode } from './src/build-environment';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '../..', 'VITE_');
  const { apiUrl, appUrl } = extensionEnvironment(mode, environment);

  return {
    envDir: '../..',
    plugins: [
      react(),
      crx({
        manifest: createManifest({
          apiOrigin: new URL(apiUrl).origin,
          appUrl,
          local: isLocalMode(mode),
        }),
      }),
    ],
    build: { outDir: mode === 'production' ? 'dist-production' : 'dist', emptyOutDir: true },
  };
});
