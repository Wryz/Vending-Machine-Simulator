/** Jest runs the pure modules (src/sim, src/map, src/three helpers, src/config, src/data). */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/scripts'],
  testMatch: ['**/*.test.ts'],
  // Type-checking is done by `npm run typecheck`; ts-jest only transpiles here.
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: {
          module: 'commonjs',
          target: 'es2022',
          jsx: 'react-jsx',
          esModuleInterop: true,
          isolatedModules: true,
          rootDir: __dirname,
        },
      },
    ],
  },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: ['src/sim/**/*.ts', '!src/sim/**/*.test.ts', '!src/sim/__fixtures__/**'],
  coverageThreshold: { './src/sim/': { lines: 85, branches: 70, functions: 85 } },
};
