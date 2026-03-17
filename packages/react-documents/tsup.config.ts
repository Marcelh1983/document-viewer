import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  external: ['react', 'react-dom', 'react/jsx-runtime', 'docviewhelper'],
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.lib.json',
  outDir: '../../dist/packages/react-documents',
});
