jest.mock('./getCachedItemPath', () =>
  jest.fn(
    () =>
      '/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json'
  )
);
jest.mock('../../lib/constants', () => ({
  CACHE_DIR: 'home/uname/.emulsify/cache',
}));
jest.mock('../fs/loadJsonFile', () => jest.fn());

import loadJsonFile from '../fs/loadJsonFile';
import getJsonFromCachedFile from './getJsonFromCachedFile';

const loadJsonMock = (loadJsonFile as jest.Mock).mockResolvedValue({
  the: 'json',
});

describe('getJsonFromCachedFile', () => {
  it('can load and parse the JSON from a file stored in cache', async () => {
    expect.assertions(2);
    await expect(
      getJsonFromCachedFile('systems', ['compound'], 'system.emulsify.json')
    ).resolves.toEqual({
      the: 'json',
    });
    expect(loadJsonMock).toHaveBeenCalledWith(
      '/home/uname/.emulsify/cache/systems/12345/compound/system.emulsify.json'
    );
  });

  it('returns undefined if the file is not found', async () => {
    expect.assertions(1);
    loadJsonMock.mockResolvedValueOnce(undefined);
    await expect(
      getJsonFromCachedFile('systems', ['compound'], 'system.emulsify.json')
    ).resolves.toBe(undefined);
  });
});
