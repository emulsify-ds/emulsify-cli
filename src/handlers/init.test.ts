jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/platform/getPlatformInfo', () => jest.fn());
jest.mock('../util/fs/writeToJsonFile', () => jest.fn());
jest.mock('../util/fs/executeScript', () => jest.fn());

import fs from 'fs';
import git from 'simple-git';
import log from '../lib/log';
import init from './init';
import getPlatformInfo from '../util/platform/getPlatformInfo';
import writeToJsonFile from '../util/fs/writeToJsonFile';
import executeScript from '../util/fs/executeScript';

const root = '/home/uname/Projects/cornflake';

const existsSyncMock = (fs.existsSync as jest.Mock).mockReturnValue(false);
const rmdirMock = (fs.promises.rmdir as jest.Mock).mockReturnValue(true);
const gitCloneMock = git().clone as jest.Mock;
const getPlatformInfoMock = (getPlatformInfo as jest.Mock).mockReturnValue({
  root,
  name: 'drupal',
  emulsifyParentDirectory: `${root}/themes`,
  platformMajorVersion: 9,
});
const logMock = log as jest.Mock;
const writeJsonFileMock = writeToJsonFile as jest.Mock;

describe('init', () => {
  beforeEach(() => {
    logMock.mockClear();
    gitCloneMock.mockClear();
  });

  it('can detect the platform, and use information about the platform to autodetect the target directory and Emulsify starter', async () => {
    expect.assertions(3);
    await init('cornflake');
    expect(
      gitCloneMock
    ).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-drupal.git',
      '/home/uname/Projects/cornflake/themes/cornflake',
      { '--branch': 'cli' }
    );
    expect(
      rmdirMock
    ).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/themes/cornflake/.git',
      { recursive: true }
    );
    expect(writeJsonFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/themes/cornflake/project.emulsify.json',
      {
        project: {
          platform: 'drupal',
          machineName: 'cornflake',
          name: 'cornflake',
        },
        starter: {
          repository: 'https://github.com/emulsify-ds/emulsify-drupal.git',
        },
      }
    );
  });

  it('can clone an Emulsify starter based on CLI input, and log a success message upon completion', async () => {
    expect.assertions(3);
    await init('cornflake', `${root}/themes/subDir`, {
      starter: 'https://github.com/cornflake-ds/cornflake-drupal.git',
      checkout: '5.6x',
    });
    expect(
      gitCloneMock
    ).toHaveBeenCalledWith(
      'https://github.com/cornflake-ds/cornflake-drupal.git',
      '/home/uname/Projects/cornflake/themes/subDir/cornflake',
      { '--branch': '5.6x' }
    );
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Created an Emulsify project in /home/uname/Projects/cornflake/themes/subDir/cornflake.'
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      `Emulsify does not come with components by default.\nPlease use "emulsify system install" to select a design system you'd like to use.\nDoing so will install the system's default components, and allow you to install any other components made available by the design system.\nTo see a list of out-of-the-box design systems, run: "emulsify system ls"`
    );
  });

  it('can clone an Emulsify starter without a provided checkout', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await init('cornflake', `${root}/themes/subDir`, {
      starter: 'https://github.com/cornflake-ds/cornflake-drupal.git',
      platform: 'drupal',
    });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/cornflake-ds/cornflake-drupal.git',
      '/home/uname/Projects/cornflake/themes/subDir/cornflake',
      {
        '--branch': 'cli',
      }
    );
  });

  it('executes the init script within the Emulsify starter, if it exists', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await init('cornflake');
    expect(executeScript).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/themes/cornflake/init.js'
    );
  });

  it('logs an error and exits if no valid platform name is detectable', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await init('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to determine which platform you are installing Emulsify within. Please specify a platform (such as "drupal" or "wordpress") by passing a -p or --platform flag with your init command.',
      1
    );
  });

  it('logs a helpful error if the given Emulsify starter is not clone-able', async () => {
    gitCloneMock.mockImplementationOnce(() => {
      throw new Error('Does not exist!');
    });
    await init('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to pull down https://github.com/emulsify-ds/emulsify-drupal.git: Error: Does not exist!',
      1
    );
  });

  it('logs an error and exits if no target is found or specified', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce({
      name: 'drupal',
    });
    await init('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to find a directory to put Emulsify in. Please specify a directory using the "path" argument: emulsify init myTheme ./themes',
      1
    );
  });

  it('logs an error and exits if no repository is found or specified', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce({
      name: 'invalid',
    });
    await init('cornflake', root);
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to find an Emulsify starter for your project. Please specify one using the --starter flag: emulsify init myTheme --starter https://github.com/emulsify-ds/emulsify-drupal.git',
      1
    );
  });

  it('logs an error and exists if the target directory already exists', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(true);
    await init('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'The intended target is already occupied: /home/uname/Projects/cornflake/themes/cornflake',
      1
    );
  });
});
