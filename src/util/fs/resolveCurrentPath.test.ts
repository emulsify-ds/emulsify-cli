import { expect } from '@jest/globals';
import { resolveCurrentPath } from './resolveCurrentPath';
import { resolve, dirname } from 'path';

// Mocks
const mockArgv = ['/usr/local/bin/node', '/path/to/file.js'];
global.process = {
  argv: mockArgv,
} as unknown as NodeJS.Process; // Mock process.argv

describe('resolveCurrentPath', () => {
  it('should resolve absolute file path and directory path correctly', () => {
    // Expected values based on the mocked process.argv[1]
    const expectedAbsolutePath = resolve(mockArgv[1]);
    const expectedDirectoryPath = dirname(expectedAbsolutePath);

    // Call the function
    const { absoluteFilePath, directoryPath } = resolveCurrentPath();

    // Assert the results
    expect(absoluteFilePath).toBe(expectedAbsolutePath);
    expect(directoryPath).toBe(expectedDirectoryPath);
  });
});
