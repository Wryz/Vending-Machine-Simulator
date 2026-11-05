// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      'workers/*/node_modules/*',
      'workers/*/.wrangler/*',
      'ios/*',
      'android/*',
      'pipeline/out/*',
    ],
  },
  {
    files: ['*.config.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: { globals: { __dirname: 'readonly', module: 'writable', require: 'readonly', process: 'readonly', console: 'readonly' } },
  },
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      // The sim must stay pure: no React, rendering or I/O (CLAUDE.md).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-native',
                'react-native-*',
                'expo*',
                '@react-three/*',
                'three',
                '@maplibre/*',
                'zustand*',
              ],
              message: 'src/sim must stay pure TypeScript.',
            },
            {
              group: ['@/store/*', '@/ui/*', '@/services/*', '@/three/*', '@/map/*'],
              message: 'src/sim must not depend on app layers.',
            },
          ],
        },
      ],
    },
  },
]);
