jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/platform/getPlatformInfo', () => jest.fn());
jest.mock('../util/fs/writeToJsonFile', () => jest.fn());
jest.mock('../util/fs/executeScript', () => jest.fn());
jest.mock('../util/project/installDependencies', () => jest.fn());
jest.mock('@inquirer/prompts');

import fs from 'fs';
import { simpleGit as git } from 'simple-git';
import log from '../lib/log.js';
import { input, select } from '@inquirer/prompts';
import ProgressBar from 'progress';
import installDependencies from '../util/project/installDependencies.js';
import getPlatformInfo from '../util/platform/getPlatformInfo.js';
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import executeScript from '../util/fs/executeScript.js';
import init from './init.js';

const root = '/home/uname/Projects/cornflake';

const existsSyncMock = (fs.existsSync as jest.Mock).mockReturnValue(false);
const rmMock = (fs.promises.rm as jest.Mock).mockReturnValue(true);
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
const inputMock = input as jest.Mock;
const selectMock = select as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;

function setStdinIsTTY(value: boolean | undefined) {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

describe('init', () => {
  beforeEach(() => {
    logMock.mockClear();
    gitCloneMock.mockClear();
    writeJsonFileMock.mockClear();
    progressMock.tick.mockClear();
    inputMock.mockClear();
    selectMock.mockClear();
    setStdinIsTTY(false);
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('should execute the returned function', async () => {
    await expect(init(progress)()).rejects.toThrow(
      'Unable to determine the project name. Please provide a valid project name.',
    );
  });

  it('should prompt for the name if not provided in an interactive terminal', async () => {
    expect.assertions(2);
    setStdinIsTTY(true);
    inputMock.mockResolvedValueOnce('cornflake');

    await init(progress)();
    expect(input).toHaveBeenCalledTimes(1);
    expect(input).toHaveBeenNthCalledWith(1, {
      message: 'Project name:',
      default: 'emulsifyTheme',
    });
  });

  it('can detect the platform, and use information about the platform to autodetect the target directory and Emulsify starter', async () => {
    expect.assertions(4);
    await init(progress)('cornflake');
    expect(selectMock).not.toHaveBeenCalled();
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      '/home/uname/Projects/cornflake/cornflake',
      { '--branch': 'main' },
    );
    expect(rmMock).toHaveBeenCalledWith(
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
    expect.assertions(3);
    await init(progress)('cornflake', `${root}`, {
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
      checkout: 'main',
    });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      '/home/uname/Projects/cornflake/cornflake',
      { '--branch': 'main' },
    );
    expect(logMock).toHaveBeenCalledTimes(2);
    expect(logMock).toHaveBeenNthCalledWith(
      1,
      'success',
      'Created an Emulsify project in /home/uname/Projects/cornflake/cornflake.',
    );
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

  it('uses flag-provided values without prompting in non-interactive mode', async () => {
    expect.assertions(4);
    getPlatformInfoMock.mockReturnValueOnce(undefined);

    await init(progress)(undefined, root, {
      machineName: 'cornflake',
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
      platform: 'drupal',
    });

    expect(inputMock).not.toHaveBeenCalled();
    expect(selectMock).not.toHaveBeenCalled();
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      '/home/uname/Projects/cornflake/cornflake',
      { '--branch': 'main' },
    );
    expect(writeJsonFileMock).toHaveBeenCalledWith(
      '/home/uname/Projects/cornflake/cornflake/project.emulsify.json',
      {
        project: {
          platform: 'drupal',
          machineName: 'cornflake',
          name: 'cornflake',
        },
        starter: {
          repository: 'https://github.com/emulsify-ds/emulsify-starter',
        },
      },
    );
  });

  it('prompts for the platform with drupal and none choices when missing in an interactive terminal', async () => {
    expect.assertions(4);
    setStdinIsTTY(true);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    selectMock.mockResolvedValueOnce('none');

    await init(progress)('cornflake', root, {
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
    });

    expect(inputMock).not.toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenNthCalledWith(1, {
      message: 'Platform:',
      choices: ['drupal', 'none'],
      default: 'drupal',
    });
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

  it('accepts init defaults without prompting when yes is set', async () => {
    expect.assertions(4);
    getPlatformInfoMock.mockReturnValueOnce(undefined);

    await init(progress)(undefined, undefined, {
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
      yes: true,
    });

    expect(inputMock).not.toHaveBeenCalled();
    expect(selectMock).not.toHaveBeenCalled();
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      'emulsifytheme',
      { '--branch': 'main' },
    );
    expect(writeJsonFileMock).toHaveBeenCalledWith(
      'emulsifytheme/project.emulsify.json',
      {
        project: {
          platform: 'drupal',
          machineName: 'emulsifytheme',
          name: 'emulsifyTheme',
        },
        starter: {
          repository: 'https://github.com/emulsify-ds/emulsify-starter',
        },
      },
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

  it('throws if no valid platform name is detectable', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await expect(init(progress)('cornflake')).rejects.toThrow(
      'Unable to determine which platform you are installing Emulsify within. Please specify a platform (such as "drupal" or "wordpress") by passing a -p or --platform flag with your init command.',
    );
  });

  it('throws a helpful error if the given Emulsify starter is not clone-able', async () => {
    gitCloneMock.mockImplementationOnce(() => {
      throw new Error('Does not exist!');
    });
    await expect(init(progress)('cornflake')).rejects.toThrow(
      'Unable to pull down https://github.com/emulsify-ds/emulsify-starter: Error: Does not exist!',
    );
  });

  it('throws if no target is found or specified', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce({
      name: 'drupal',
    });
    await expect(init(progress)('cornflake')).rejects.toThrow(
      'Unable to find a directory to put Emulsify in. Please specify a directory using the "path" argument: emulsify init myTheme ./themes',
    );
  });

  it('throws if no repository is found or specified', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce({
      name: 'invalid',
    });
    await expect(init(progress)('cornflake', root)).rejects.toThrow(
      'Unable to find an Emulsify starter for your project. Please specify one using the --starter flag: emulsify init myTheme --starter https://github.com/emulsify-ds/emulsify-starter',
    );
  });

  it('throws if the target directory already exists', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(true);
    await expect(init(progress)('cornflake')).rejects.toThrow(
      'The intended target is already occupied: /home/uname/Projects/cornflake/cornflake',
    );
  });

  it('should prompt for all info if name is missing', async () => {
    setStdinIsTTY(true);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    inputMock.mockResolvedValueOnce('new-project').mockResolvedValueOnce(root);
    selectMock.mockResolvedValueOnce('drupal');

    await init(progress)();

    expect(input).toHaveBeenCalledTimes(2);
    expect(input).toHaveBeenNthCalledWith(1, {
      message: 'Project name:',
      default: 'emulsifyTheme',
    });
    expect(input).toHaveBeenNthCalledWith(2, {
      message: 'Target directory:',
      default: './',
    });
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenNthCalledWith(1, {
      message: 'Platform:',
      choices: ['drupal', 'none'],
      default: 'drupal',
    });
    expect(gitCloneMock).toHaveBeenCalled();
  });
});
