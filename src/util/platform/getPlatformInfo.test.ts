jest.mock('./getDrupalInfo', () => jest.fn());
jest.mock('./getWordPressInfo', () => jest.fn());
jest.mock('./getNoPlatformInfo', () => jest.fn());

import getDrupalInfo from './getDrupalInfo.js';
import getWordPressInfo from './getWordPressInfo.js';
import getNoPlatformInfo from './getNoPlatformInfo.js';
import getPlatformInfo from './getPlatformInfo.js';

describe('getPlatformInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('can return information about Drupal, if the user is currently within a Drupal instance', async () => {
    expect.assertions(1);
    (getDrupalInfo as jest.Mock).mockResolvedValueOnce({
      name: 'drupal',
      root: '/home/uname/Projects/cornflake',
      platformMajorVersion: 11,
    });

    const expected = {
      name: 'drupal',
      platformMajorVersion: 11,
      root: '/home/uname/Projects/cornflake',
    };

    await expect(getPlatformInfo()).resolves.toEqual(expected);
  });

  it('prefers Drupal when both Drupal and WordPress signals appear', async () => {
    expect.assertions(2);
    (getDrupalInfo as jest.Mock).mockResolvedValueOnce({
      name: 'drupal',
      root: '/home/uname/Projects/cornflake/web',
      platformMajorVersion: 11,
    });
    (getWordPressInfo as jest.Mock).mockResolvedValueOnce({
      name: 'wordpress',
      root: '/home/uname/Projects/cornflake',
      emulsifyParentDirectory:
        '/home/uname/Projects/cornflake/wp-content/themes',
    });

    await expect(getPlatformInfo()).resolves.toEqual({
      name: 'drupal',
      root: '/home/uname/Projects/cornflake/web',
      platformMajorVersion: 11,
    });
    expect(getWordPressInfo).not.toHaveBeenCalled();
  });

  it('can return information about WordPress, if the user is currently within a WordPress instance', async () => {
    expect.assertions(1);
    (getDrupalInfo as jest.Mock).mockResolvedValueOnce(undefined);
    (getWordPressInfo as jest.Mock).mockResolvedValueOnce({
      name: 'wordpress',
      root: '/home/uname/Projects/cornflake',
      emulsifyParentDirectory:
        '/home/uname/Projects/cornflake/wp-content/themes',
    });

    const expected = {
      name: 'wordpress',
      root: '/home/uname/Projects/cornflake',
      emulsifyParentDirectory:
        '/home/uname/Projects/cornflake/wp-content/themes',
    };

    await expect(getPlatformInfo()).resolves.toEqual(expected);
  });

  it('returns no platform info if the user (cwd) is not within Drupal or WordPress but an Emulsify project is detected', async () => {
    expect.assertions(1);
    (getDrupalInfo as jest.Mock).mockResolvedValueOnce(null);
    (getWordPressInfo as jest.Mock).mockResolvedValueOnce(null);
    (getNoPlatformInfo as jest.Mock).mockResolvedValueOnce({ name: 'none' });

    const result = await getPlatformInfo();
    expect(result).toEqual({ name: 'none' });
  });
});
