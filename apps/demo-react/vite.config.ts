import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const root = resolve(__dirname, 'src');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root,
  publicDir: resolve(__dirname, 'src/assets'),
  resolve: {
    alias: {
      '@document-viewer/data': resolve(__dirname, '../../libs/data/src/index.ts'),
      'react-documents': resolve(__dirname, '../../packages/react-documents/src/index.ts'),
      docviewhelper: resolve(__dirname, '../../packages/docviewhelper/src/index.ts'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../../dist/apps/demo-react'),
    emptyOutDir: true,
  },
  server: {
    port: 4201,
  },
});
