import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    files: ['**/*.tsx', '**/*.jsx'],
    rules: {
      // Basic React rules without plugin dependencies
      'no-undef': 'off', // React handles this
    },
  },
];
