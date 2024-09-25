jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/platform/getPlatformInfo', () => jest.fn());
jest.mock('../util/fs/writeToJsonFile', () => jest.fn());
jest.mock('../util/fs/executeScript', () => jest.fn());
jest.mock('../util/project/installDependencies', () => jest.fn());
jest.mock('inquirer');

import fs from 'fs';
import git from 'simple-git';
import log from '../lib/log.js';
import inquirer from 'inquirer';
import ProgressBar from 'progress';
import installDependencies from '../util/project/installDependencies.js';
import getPlatformInfo from '../util/platform/getPlatformInfo.js';
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import executeScript from '../util/fs/executeScript.js';
import init, { DIRECTORY, questions } from './init.js';
import { EXIT_ERROR } from '../lib/constants.js';

const root = '/home/uname/Projects/cornflake';

const existsSyncMock = (fs.existsSync as jest.Mock).mockReturnValue(false);
const rmdirMock = (fs.promises.rmdir as jest.Mock).mockReturnValue(true);
const gitCloneMock = git().clone as jest.Mock;
const getPlatformInfoMock = (getPlatformInfo as jest.Mock).mockReturnValue({
  root,
  name: 'none',
  emulsifyParentDirectory: `${root}`,
  platformMajorVersion: 1,
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

  it('should execute the returned function', async () => {
    await init(progress)();
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to determine the project name. Please provide a valid project name.',
      EXIT_ERROR,
    );
  });

  it('should prompt for the name if not provided', async () => {
    expect.assertions(1);
    const mockPrompt = jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({
      name: 'cornflake',
      platform: 'drupal',
      targetDirectory: root,
    });

    await init(progress)();
    questions[DIRECTORY].default = root;
    expect(mockPrompt).toHaveBeenCalledWith(questions);
    mockPrompt.mockRestore();
  });

  it('can detect the platform, and use information about the platform to autodetect the target directory and Emulsify starter', async () => {
    expect.assertions(3);
    await init(progress)('cornflake');
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      '/home/uname/Projects/cornflake/cornflake',
      { '--branch': 'main' },
    );
    expect(rmdirMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/cornflake/.git',
      { recursive: true },
    );
    expect(writeJsonFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/cornflake/project.emulsify.json',
      {
        project: {
          platform: 'none',
          machineName: 'cornflake',
          name: 'cornflake',
        },
        starter: {
          repository: 'https://github.com/emulsify-ds/emulsify-starter',
        },
      },
    );
  });

  it('uses the progress obj to display information on the init process', async () => {
    expect.assertions(5);
    await init(progress)('cornflake');
    expect(progress.tick).toHaveBeenNthCalledWith(1, 10, {
      message:
        'using starter for none as the selected platform, validating config',
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
    await init(progress)('cornflake', `${root}`, {
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
      checkout: 'main',
    });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      '/home/uname/Projects/cornflake/cornflake',
      { '--branch': 'main' },
    );
    expect(logMock).toHaveBeenCalledTimes(5);
  });

  it('can clone an Emulsify starter without a provided checkout', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await init(progress)('cornflake', `${root}`, {
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
      platform: 'wordpress',
    });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      '/home/uname/Projects/cornflake/cornflake',
      {},
    );
  });

  it('installs the project dependencies', async () => {
    expect.assertions(1);
    await init(progress)('cornflake');
    expect(installDependencies).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/cornflake',
    );
  });

  it('executes the init script within the Emulsify starter, if it exists', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await init(progress)('cornflake');
    expect(executeScript).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/cornflake/.cli/init.js',
    );
  });

  it('logs an error and exits if no valid platform name is detectable', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await init(progress)('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to determine which platform you are installing Emulsify within. Please specify a platform (such as "drupal" or "wordpress") by passing a -p or --platform flag with your init command.',
      1,
    );
  });

  it('logs a helpful error if the given Emulsify starter is not clone-able', async () => {
    gitCloneMock.mockImplementationOnce(() => {
      throw new Error('Does not exist!');
    });
    await init(progress)('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'Unable to pull down https://github.com/emulsify-ds/emulsify-starter: Error: Does not exist!',
      1,
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
      1,
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
      'Unable to find an Emulsify starter for your project. Please specify one using the --starter flag: emulsify init myTheme --starter https://github.com/emulsify-ds/emulsify-starter',
      1,
    );
  });

  it('logs an error and exists if the target directory already exists', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(true);
    await init(progress)('cornflake');
    expect(logMock).toHaveBeenCalledWith(
      'error',
      'The intended target is already occupied: /home/uname/Projects/cornflake/cornflake',
      1,
    );
  });
});
