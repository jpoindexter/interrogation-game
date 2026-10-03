import config from './eslint.config.mjs';

const sizeConfig = [
  ...config,
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', {
        max: 50,
        skipBlankLines: true,
        skipComments: true,
      }],
      complexity: ['error', 10],
      'max-params': ['error', 4],
      'max-depth': ['error', 4],
    },
  },
];

export default sizeConfig;
