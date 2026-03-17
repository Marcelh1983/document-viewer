import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // Angular-specific rules disabled for now due to ESLint 10 compatibility
    },
  },
];
