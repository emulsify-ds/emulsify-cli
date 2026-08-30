import type { EmulsifyProjectConfiguration } from '@emulsify-cli/config';

jest.mock('../fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../fs/writeToJsonFile', () => jest.fn());
jest.mock('./getEmulsifyConfig', () => jest.fn());

import { promises as fs } from 'fs';
import { copy, remove } from 'fs-extra';

import { EMULSIFY_PROJECT_CONFIG_FILE } from '../../lib/constants.js';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';
import writeToJsonFile from '../fs/writeToJsonFile.js';
import getEmulsifyConfig from './getEmulsifyConfig.js';
import unsetEmulsifyConfig from './unsetEmulsifyConfig.js';

const configPath = '/project/project.emulsify.json';
const findFileInCurrentPathMock = findFileInCurrentPath as jest.Mock;
const getEmulsifyConfigMock = getEmulsifyConfig as jest.Mock;
const writeToJsonFileMock = writeToJsonFile as jest.Mock;
const copyMock = copy as jest.Mock;
const removeMock = remove as jest.Mock;
const mkdirMock = fs.mkdir as jest.Mock;
const copyFileMock = fs.copyFile as jest.Mock;
const renameMock = fs.rename as jest.Mock;
const rmMock = fs.rm as jest.Mock;
const writeFileMock = fs.writeFile as jest.Mock;

const projectConfig: EmulsifyProjectConfiguration = {
  project: {
    platform: 'none',
    name: 'Fixture Project',
    machineName: 'fixture-project',
    description: 'Configuration fields unrelated to the system are preserved.',
  },
  starter: {
    repository: 'https://github.com/emulsify-ds/emulsify-starter.git',
  },
  assets: {
    roots: ['./assets'],
    rebase: true,
  },
  system: {
    repository: 'https://github.com/example/fixture-system.git',
    checkout: 'main',
  },
  variant: {
    platform: 'none',
    structureImplementations: [
      {
        name: 'components',
        directory: 'components',
      },
    ],
  },
};

describe('unsetEmulsifyConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findFileInCurrentPathMock.mockReturnValue(configPath);
    getEmulsifyConfigMock.mockResolvedValue(projectConfig);
    writeToJsonFileMock.mockResolvedValue(undefined);
  });

  it('writes the complete project configuration with only the requested keys removed', async () => {
    await unsetEmulsifyConfig('system', 'variant');

    expect(findFileInCurrentPathMock).toHaveBeenCalledTimes(1);
    expect(findFileInCurrentPathMock).toHaveBeenCalledWith(
      EMULSIFY_PROJECT_CONFIG_FILE,
    );
    expect(getEmulsifyConfigMock).toHaveBeenCalledTimes(1);
    expect(writeToJsonFileMock).toHaveBeenCalledTimes(1);
    expect(writeToJsonFileMock).toHaveBeenCalledWith(configPath, {
      project: projectConfig.project,
      starter: projectConfig.starter,
      assets: projectConfig.assets,
    });

    // The helper delegates its sole write to the project-config writer. It
    // must never copy, rename, or remove project/component filesystem entries.
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(mkdirMock).not.toHaveBeenCalled();
    expect(copyFileMock).not.toHaveBeenCalled();
    expect(renameMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
    expect(copyMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('throws without writing when no project configuration path is found', async () => {
    findFileInCurrentPathMock.mockReturnValueOnce(undefined);

    await expect(unsetEmulsifyConfig('system')).rejects.toThrow();

    expect(writeToJsonFileMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('throws without writing when the project configuration cannot be loaded', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce(undefined);

    await expect(unsetEmulsifyConfig('variant')).rejects.toThrow();

    expect(writeToJsonFileMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('preserves the complete configuration when no keys are requested', async () => {
    await unsetEmulsifyConfig();

    expect(writeToJsonFileMock).toHaveBeenCalledTimes(1);
    expect(writeToJsonFileMock).toHaveBeenCalledWith(configPath, projectConfig);
    expect(rmMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });
});
