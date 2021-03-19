// rollup.config.js
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import typescript from '@rollup/plugin-typescript';
import packageJson from './package.json';
import copy from 'rollup-plugin-copy';

export default {
  input: './libs/react-documents-wrapper.ts',
  output: [
    {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true,
    },
  ],
  output: {
    file: './dist/libs/react-documents/index.js',
},
  plugins: [
    peerDepsExternal(),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './libs/react-documents/tsconfig.lib.json'
    }),
    copy({
      targets: [{ src: ['./libs/react-documents/package.json', './libs/react-documents/README.md'], dest: './dist/libs/react-documents/' }],
    }),
  ],
};
