jest.mock('../fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../fs/loadJsonFile', () => jest.fn());

import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import loadJsonFile from '../fs/loadJsonFile.js';
import getDrupalInfo from './getDrupalInfo.js';
import { join, resolve } from 'path';

const projectRoot = resolve('fixtures', 'cornflake');

const loadJsonMock = (loadJsonFile as jest.Mock).mockResolvedValue({
  extra: {
    'drupal-scaffold': {
      locations: {
        'web-root': 'web/',
      },
    },
  },
});
const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  join(projectRoot, 'composer.json'),
);

describe('getDrupalInfo', () => {
  it('returns PlatformInstanceInfo if a composer.json file is found, and contains drupal-core within its extras object', async () => {
    expect.assertions(1);
    await expect(getDrupalInfo()).resolves.toEqual({
      name: 'drupal',
      platformMajorVersion: 11,
      emulsifyParentDirectory: join(projectRoot, 'web', 'themes', 'custom'),
      root: join(projectRoot, 'web/'),
    });
  });

  it('returns void if the composer.json file does not contain the expected values', async () => {
    expect.assertions(1);
    loadJsonMock.mockResolvedValueOnce({});
    await expect(getDrupalInfo()).resolves.toBe(undefined);
  });

  it('returns void if the composer.json file that was found cannot be read (without throwing)', async () => {
    expect.assertions(1);
    loadJsonMock.mockImplementationOnce(() => {
      throw new Error(
        'Big oof, the composer.json file that was found cannot be loaded.',
      );
    });

    await expect(getDrupalInfo()).resolves.toBe(undefined);
  });

  it('returns void if no composer.json file is found', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(getDrupalInfo()).resolves.toBe(undefined);
  });
});
