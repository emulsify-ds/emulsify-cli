jest.mock('./getDrupalInfo', () => jest.fn());

import getDrupalInfo from './getDrupalInfo';
import getPlatformInfo from './getPlatformInfo';

describe('getPlatformInfo', () => {
  it('can return information about Drupal, if the user is currently within a Drupal instance', async () => {
    expect.assertions(1);
    (getDrupalInfo as jest.Mock).mockResolvedValueOnce({
      name: 'drupal',
      root: '/home/uname/Projects/cornflake',
      platformMajorVersion: 9,
    });

    await expect(getPlatformInfo()).resolves.toMatchInlineSnapshot(`
      Object {
        "name": "drupal",
        "platformMajorVersion": 9,
        "root": "/home/uname/Projects/cornflake",
      }
    `);
  });

  it('returns undefined if the user (cwd) is not within any detectable platform', async () => {
    (getDrupalInfo as jest.Mock).mockReturnValueOnce(undefined);
    await expect(getPlatformInfo()).resolves.toBe(undefined);
  });
});
