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
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    // Separate npm packages with their own node_modules and tsc. Root lint must
    // pass on a fresh clone without installing them, so don't resolve their imports.
    files: ['pipeline/**/*.ts', 'workers/**/*.ts'],
    rules: { 'import/no-unresolved': 'off' },
  },
  {
    // React Three Fiber JSX uses three.js props (position, args, castShadow...).
    // R3F mutates three.js objects inside useFrame by design.
    files: ['src/three/**/*.tsx'],
    rules: {
      'react/no-unknown-property': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
    },
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
