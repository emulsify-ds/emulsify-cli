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
  ],
  // Temporary honest floor to ratchet back up once handler tests are added (Prompt 5).
  coverageThreshold: {
    global: {
      branches: 88,
      functions: 91,
      lines: 96,
      statements: 94,
    },
  },
  transform: {
    '\\.[jt]sx?$': [
      'ts-jest',
      { diagnostics: { ignoreCodes: [1324, 151002] }, useESM: false },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@inquirer|fast-.+)/)'],
  "moduleNameMapper": {
    "^(\\.\\.?\\/.+)\\.js$": "$1",
  },
  coveragePathIgnorePatterns: [
    '[\\\\/]node_modules[\\\\/]',
    '[\\\\/]src[\\\\/]index\\.ts$',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
};
