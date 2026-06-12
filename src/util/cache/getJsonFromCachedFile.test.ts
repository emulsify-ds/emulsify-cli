jest.mock('./getCachedItemPath', () =>
  jest.fn(
    () =>
      '/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json',
  ),
);
jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'home/uname/.emulsify/cache',
}));
jest.mock('../fs/loadJsonFile', () => jest.fn());

import loadJsonFile from '../fs/loadJsonFile.js';
import getJsonFromCachedFile from './getJsonFromCachedFile.js';

const loadJsonMock = (loadJsonFile as jest.Mock).mockResolvedValue({
  the: 'json',
});

describe('getJsonFromCachedFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadJsonMock.mockResolvedValue({
      the: 'json',
    });
  });

  it('can load and parse the JSON from a file stored in cache', async () => {
    expect.assertions(2);
    await expect(
      getJsonFromCachedFile(
        'systems',
        ['compound'],
        'branch-name',
        'system.emulsify.json',
      ),
    ).resolves.toEqual({
      the: 'json',
    });
    expect(loadJsonMock).toHaveBeenCalledWith(
      '/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json',
    );
  });

  it('returns undefined if the file is not found', async () => {
    expect.assertions(1);
    loadJsonMock.mockResolvedValueOnce(undefined);
    await expect(
      getJsonFromCachedFile(
        'systems',
        ['compound'],
        'branch-name',
        'system.emulsify.json',
      ),
    ).resolves.toBe(undefined);
  });

  it('throws malformed cached JSON errors with the cached file path', async () => {
    expect.assertions(1);
    loadJsonMock.mockRejectedValueOnce(
      new Error(
        'Invalid JSON in "/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json": Expected property name or \'}\' in JSON',
      ),
    );

    await expect(
      getJsonFromCachedFile(
        'systems',
        ['compound'],
        'branch-name',
        'system.emulsify.json',
      ),
    ).rejects.toThrow(
      'Invalid JSON in "/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json"',
    );
  });
});
