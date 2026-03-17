import rootConfig from '../../eslint.config.mjs';
import { configs as angularConfigs } from 'angular-eslint';

export default [
  ...rootConfig,
  ...angularConfigs.tsRecommended,
  ...angularConfigs.templateRecommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'document-viewer', style: 'kebab-case' },
      ],
    },
  },
];
