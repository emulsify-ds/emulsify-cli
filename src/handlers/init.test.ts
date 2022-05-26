jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/platform/getPlatformInfo', () => jest.fn());
jest.mock('../util/fs/writeToJsonFile', () => jest.fn());
jest.mock('../util/fs/executeScript', () => jest.fn());
jest.mock('../util/project/installDependencies', () => jest.fn());

import fs from 'fs';
import git from 'simple-git';
import log from '../lib/log';
import init from './init';
import getPlatformInfo from '../util/platform/getPlatformInfo';
import writeToJsonFile from '../util/fs/writeToJsonFile';
import executeScript from '../util/fs/executeScript';
import installDependencies from '../util/project/installDependencies';
import ProgressBar from 'progress';

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
const progressMock = {
  tick: jest.fn(),
};
const progress = progressMock as unknown as InstanceType<typeof ProgressBar>;

describe('init', () => {
  beforeEach(() => {
    logMock.mockClear();
    gitCloneMock.mockClear();
    progressMock.tick.mockClear();
  });

  it('can detect the platform, and use information about the platform to autodetect the target directory and Emulsify starter', async () => {
    expect.assertions(3);
    await init(progress)('cornflake');
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-drupal.git',
      '/home/uname/Projects/cornflake/themes/cornflake',
      { '--branch': 'master' }
    );
    expect(rmdirMock).toHaveBeenCalledWith(
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

  it('uses the progress obj to display information on the init process', async () => {
    expect.assertions(5);
    await init(progress)('cornflake');
    expect(progress.tick).toHaveBeenNthCalledWith(1, 10, {
      message: 'using starter for drupal, validating config',
    });
    expect(progress.tick).toHaveBeenNthCalledWith(2, 10, {
      message: 'validation complete, cloning starter',
    });
    expect(progress.tick).toHaveBeenNthCalledWith(3, 30, {
      message:
        'starter cloned, installing dependencies (this will take a moment)',
    });
    expect(progress.tick).toHaveBeenNthCalledWith(4, 40, {
      message: 'dependencies installed, executing init script',
    });
    expect(progress.tick).toHaveBeenNthCalledWith(5, 10, {
      message: 'init script executed, initialization complete',
    });
  });

  it('can clone an Emulsify starter based on CLI input, and log a success message upon completion', async () => {
    expect.assertions(2);
    await init(progress)('cornflake', `${root}/themes/subDir`, {
      starter: 'https://github.com/cornflake-ds/cornflake-drupal.git',
      checkout: '5.6x',
    });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/cornflake-ds/cornflake-drupal.git',
      '/home/uname/Projects/cornflake/themes/subDir/cornflake',
      { '--branch': '5.6x' }
    );
    expect(logMock).toHaveBeenCalledTimes(5);
  });

  it('can clone an Emulsify starter without a provided checkout', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await init(progress)('cornflake', `${root}/themes/subDir`, {
      starter: 'https://github.com/cornflake-ds/cornflake-drupal.git',
      platform: 'wordpress',
    });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/cornflake-ds/cornflake-drupal.git',
      '/home/uname/Projects/cornflake/themes/subDir/cornflake',
      {}
    );
  });

  it('installs the project dependencies', async () => {
    expect.assertions(1);
    await init(progress)('cornflake');
    expect(installDependencies).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/themes/cornflake'
    );
  });

  it('executes the init script within the Emulsify starter, if it exists', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await init(progress)('cornflake');
    expect(executeScript).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/themes/cornflake/.cli/init.js'
    );
  });

  it('logs an error and exits if no valid platform name is detectable', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await init(progress)('cornflake');
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
    await init(progress)('cornflake');
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
    await init(progress)('cornflake');
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
    await init(progress)('cornflake', root);
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to find an Emulsify starter for your project. Please specify one using the --starter flag: emulsify init myTheme --starter https://github.com/emulsify-ds/emulsify-drupal.git',
      1
    );
  });

  it('logs an error and exists if the target directory already exists', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(true);
    await init(progress)('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'The intended target is already occupied: /home/uname/Projects/cornflake/themes/cornflake',
      1
    );
  });
});
