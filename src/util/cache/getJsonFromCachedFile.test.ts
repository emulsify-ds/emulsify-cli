jest.mock('./getCachedItemPath', () =>
  jest.fn(
    () =>
      '/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json',
  ),
);
jest.mock('../fs/loadJsonFile', () => jest.fn());

import loadJsonFile from '../fs/loadJsonFile.js';
import getCachedItemPath from './getCachedItemPath.js';
import getJsonFromCachedFile from './getJsonFromCachedFile.js';

const loadJsonMock = loadJsonFile as jest.Mock;
const getCachedItemPathMock = getCachedItemPath as jest.Mock;
const options = {
  bucket: 'systems' as const,
  itemPath: ['compound'],
  repository: 'https://github.com/emulsify-ds/compound.git',
  checkout: 'branch-name',
  fileName: 'system.emulsify.json',
};

describe('getJsonFromCachedFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadJsonMock.mockResolvedValue({
      the: 'json',
    });
  });

  it('loads JSON using the complete cache identity', async () => {
    await expect(getJsonFromCachedFile(options)).resolves.toEqual({
      the: 'json',
    });
    expect(getCachedItemPathMock).toHaveBeenCalledWith({
      bucket: 'systems',
      itemPath: ['compound', 'system.emulsify.json'],
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'branch-name',
    });
    expect(loadJsonMock).toHaveBeenCalledWith(
      '/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json',
    );
  });

  it('returns undefined if the file is not found', async () => {
    loadJsonMock.mockResolvedValueOnce(undefined);

    await expect(getJsonFromCachedFile(options)).resolves.toBeUndefined();
  });

  it('throws malformed cached JSON errors with the cached file path', async () => {
    loadJsonMock.mockRejectedValueOnce(
      new Error(
        'Invalid JSON in "/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json": malformed',
      ),
    );

    await expect(getJsonFromCachedFile(options)).rejects.toThrow(
      'Invalid JSON in "/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json"',
    );
  });
});
