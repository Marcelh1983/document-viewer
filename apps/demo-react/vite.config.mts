import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, 'src');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root,
  publicDir: resolve(import.meta.dirname, 'src/assets'),
  resolve: {
    alias: {
      '@document-viewer/data': resolve(import.meta.dirname, '../../libs/data/src/index.ts'),
      'react-documents': resolve(import.meta.dirname, '../../packages/react-documents/src/index.ts'),
      docviewhelper: resolve(import.meta.dirname, '../../packages/docviewhelper/src/index.ts'),
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, '../../dist/apps/demo-react'),
    emptyOutDir: true,
  },
  server: {
    port: 4201,
  },
});
