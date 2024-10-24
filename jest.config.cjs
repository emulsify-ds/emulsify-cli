module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  coverageThreshold: {
    global: {
      branches: 92,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  transform: {
    '\\.[jt]sx?$': ['ts-jest', { useESM: true }],
  },
  "moduleNameMapper": {
    "^(\\.\\.?\\/.+)\\.js$": "$1",
  },
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  extensionsToTreatAsEsm: ['.ts'],
};