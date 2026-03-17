import rootConfig from '../../eslint.config.mjs';
import { configs as angularConfigs } from 'angular-eslint';

export default [
  ...rootConfig,
  {
    files: ['**/*.ts'],
    extends: [...angularConfigs.tsRecommended],
    processor: angularConfigs.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'document-viewer', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'documentViewer', style: 'camelCase' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angularConfigs.templateRecommended],
    rules: {},
  },
];
