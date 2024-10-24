jest.mock('./getDrupalInfo', () => jest.fn());

import getDrupalInfo from './getDrupalInfo.js';
import getPlatformInfo from './getPlatformInfo.js';

describe('getPlatformInfo', () => {
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

  it('returns no platform info if the user (cwd) is not within any detectable platform', async () => {
    expect.assertions(1);
    (getDrupalInfo as jest.Mock).mockResolvedValueOnce({
      name: 'none',
      root: '/home/uname/Projects/cornflake',
      platformMajorVersion: 1,
    });

    const expected = {
      name: 'none',
      platformMajorVersion: 1,
      root: '/home/uname/Projects/cornflake',
    };

    await expect(getPlatformInfo()).resolves.toEqual(expected);
  });
});
