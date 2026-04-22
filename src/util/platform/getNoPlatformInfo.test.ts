jest.mock('../fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../fs/loadJsonFile', () => jest.fn());

import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import getNoPlatformInfo from './getNoPlatformInfo.js';

const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/home/uname/Projects/cornflake/project.emulsify.json',
);

describe('getNoPlatformInfo', () => {
  it('returns PlatformInstanceInfo if current directory is found', async () => {
    expect.assertions(1);
    await expect(getNoPlatformInfo()).resolves.toEqual({
      name: 'none',
      platformMajorVersion: 1,
      emulsifyParentDirectory:
        '/home/uname/Projects/cornflake/web/themes/custom',
      root: '/home/uname/Projects/cornflake',
    });
  });

  it('returns void if no project.emulsify.json file is found', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(getNoPlatformInfo()).resolves.toBeUndefined();
  });
});
