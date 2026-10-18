import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version-plugin',
    closeBundle() {
      const swDistPath = path.resolve(__dirname, 'dist/client/sw.js');
      if (fs.existsSync(swDistPath)) {
        const buildVersion = `b${Date.now().toString(36)}`;
        let content = fs.readFileSync(swDistPath, 'utf-8');
        content = content.replace(/__BUILD_VERSION__/g, buildVersion);
        fs.writeFileSync(swDistPath, content, 'utf-8');
        console.log(`[SW-Build] Injected cache build version ${buildVersion} into dist/client/sw.js`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
