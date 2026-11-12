// Jest for a React app: jsdom, TypeScript through ts-jest, Testing Library matchers and polyfills from src/testing/setup.ts,
// coverage gate on application code (scaffold glue excluded).
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  // authFlag reads import.meta (Vite only); tests use a stub with the sign-in field on.
  moduleNameMapper: { '^.*/state/authFlag$': '<rootDir>/src/testing/authFlag.stub.ts' },
  setupFilesAfterEnv: ['<rootDir>/src/testing/setup.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/{providers,router,theme,config}.{ts,tsx}', '!src/main.tsx', '!**/*.d.ts'],
  coverageThreshold: { global: { statements: 80, lines: 80, functions: 80, branches: 70 } }
};
