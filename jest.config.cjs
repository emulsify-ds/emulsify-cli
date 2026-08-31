const tsJestOptions = {
  diagnostics: { ignoreCodes: [1324, 151002] },
  // Keep coverage mapped to TypeScript without changing the distribution build.
  tsconfig: { sourceMap: true },
  useESM: false,
};

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // Jest otherwise only measures files imported by tests, hiding untested handlers.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
    '!src/scripts/**',
    '!src/testUtils/**',
  ],
  // Keep roughly one percentage point of headroom for unrelated changes. Raise
  // a floor after durable tests lift production coverage enough to retain it.
  coverageThreshold: {
    global: {
      branches: 88,
      functions: 91,
      lines: 95.5,
      statements: 94,
    },
  },
  transform: {
    '\\.[jt]sx?$': ['ts-jest', tsJestOptions],
  },
  transformIgnorePatterns: [
    'node_modules[\\\\/](?!(@inquirer|fast-.+)[\\\\/])',
  ],
  moduleNameMapper: {
    '^(\\.\\.?\\/.+)\\.js$': '$1',
  },
  coveragePathIgnorePatterns: [
    '[\\\\/]node_modules[\\\\/]',
    '[\\\\/]src[\\\\/]index\\.ts$',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
};
