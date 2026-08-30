jest.mock('../fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../fs/loadJsonFile', () => jest.fn());

import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import getNoPlatformInfo from './getNoPlatformInfo.js';
import { join, resolve } from 'path';

const projectRoot = resolve('fixtures', 'cornflake');

const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  join(projectRoot, 'project.emulsify.json'),
);

describe('getNoPlatformInfo', () => {
  it('returns PlatformInstanceInfo if current directory is found', async () => {
    expect.assertions(1);
    await expect(getNoPlatformInfo()).resolves.toEqual({
      name: 'none',
      platformMajorVersion: 1,
      emulsifyParentDirectory: join(projectRoot, 'web', 'themes', 'custom'),
      root: projectRoot,
    });
  });

  it('returns void if no project.emulsify.json file is found', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(getNoPlatformInfo()).resolves.toBeUndefined();
  });
});
