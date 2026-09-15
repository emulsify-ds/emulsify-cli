jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/platform/getPlatformInfo', () => jest.fn());
jest.mock('../util/fs/loadJsonFile', () => jest.fn());
jest.mock('../util/fs/writeToJsonFile', () => jest.fn());
jest.mock('../util/fs/executeScript', () => jest.fn());
jest.mock('../util/project/installDependencies', () => jest.fn());
jest.mock('../lib/session', () => ({
  note: jest.fn(),
  spinner: jest.fn(),
}));
jest.mock('@clack/prompts', () => {
  const CANCEL_SYMBOL = Symbol.for('clack:cancel');

  return {
    __esModule: true,
    CANCEL_SYMBOL,
    isCancel: (value: unknown) => value === CANCEL_SYMBOL,
    text: jest.fn(),
    select: jest.fn(),
  };
});

import fs from 'fs';
import { join, resolve } from 'path';
import { simpleGit as git } from 'simple-git';
import log from '../lib/log.js';
import { select, text } from '@clack/prompts';
import { note, spinner } from '../lib/session.js';
import installDependencies from '../util/project/installDependencies.js';
import getPlatformInfo from '../util/platform/getPlatformInfo.js';
import loadJsonFile from '../util/fs/loadJsonFile.js';
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import executeScript from '../util/fs/executeScript.js';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_PROJECT_HOOK_FOLDER,
  EMULSIFY_PROJECT_HOOK_INIT,
} from '../lib/constants.js';
import init from './init.js';

const root = resolve('/home/uname/Projects/cornflake');
const defaultTarget = join(root, 'cornflake');
const defaultConfigPath = join(defaultTarget, EMULSIFY_PROJECT_CONFIG_FILE);
const defaultGitPath = join(defaultTarget, '.git');
const defaultInitHookPath = join(
  defaultTarget,
  EMULSIFY_PROJECT_HOOK_FOLDER,
  EMULSIFY_PROJECT_HOOK_INIT,
);
const drupalThemesDirectory = join(root, 'web', 'themes', 'custom');
const drupalTarget = join(drupalThemesDirectory, 'cornflake');
const wordpressThemesDirectory = join(root, 'wp-content', 'themes');
const wordpressTarget = join(wordpressThemesDirectory, 'my-theme');

const existsSyncMock = (fs.existsSync as jest.Mock).mockReturnValue(false);
const mkdirMock = (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
const rmMock = (fs.promises.rm as jest.Mock).mockReturnValue(true);
const gitCloneMock = git().clone as jest.Mock;
const getPlatformInfoMock = (getPlatformInfo as jest.Mock).mockReturnValue({
  root,
  name: 'none',
  emulsifyParentDirectory: `${root}`,
  platformMajorVersion: 1,
});
const logMock = log as jest.Mock;
const loadJsonFileMock = (loadJsonFile as jest.Mock).mockResolvedValue(
  undefined,
);
const writeJsonFileMock = writeToJsonFile as jest.Mock;
const installDependenciesMock = installDependencies as jest.Mock;
const executeScriptMock = executeScript as jest.Mock;
const spinnerMock = {
  start: jest.fn(),
  stop: jest.fn(),
  message: jest.fn(),
  cancel: jest.fn(),
  error: jest.fn(),
  clear: jest.fn(),
  isCancelled: false,
};
const noteMock = note as jest.Mock;
const spinnerFactoryMock = (spinner as jest.Mock).mockReturnValue(spinnerMock);
const textMock = text as jest.Mock;
const selectMock = select as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;
const systemSelectionMessage = [
  'emulsify system install',
  '',
  'Pick a component system to render with. Nothing renders until one',
  'is installed.',
].join('\n');

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
    existsSyncMock.mockClear();
    mkdirMock.mockClear();
    rmMock.mockClear();
    loadJsonFileMock.mockClear();
    writeJsonFileMock.mockClear();
    installDependenciesMock.mockClear();
    executeScriptMock.mockClear();
    spinnerFactoryMock.mockClear();
    spinnerMock.start.mockClear();
    spinnerMock.stop.mockClear();
    spinnerMock.message.mockClear();
    spinnerMock.error.mockClear();
    noteMock.mockClear();
    textMock.mockClear();
    selectMock.mockClear();
    setStdinIsTTY(false);
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('should execute the returned function', async () => {
    await expect(init()).rejects.toThrow(
      'Unable to determine the project name. Please provide a valid project name.',
    );
  });

  it('should prompt for the name if not provided in an interactive terminal', async () => {
    expect.assertions(2);
    setStdinIsTTY(true);
    textMock.mockResolvedValueOnce('cornflake');

    await init();
    expect(text).toHaveBeenCalledTimes(1);
    expect(text).toHaveBeenNthCalledWith(1, {
      message: 'Project name',
      placeholder: 'emulsifyTheme',
      defaultValue: 'emulsifyTheme',
    });
  });

  it('can detect the platform, and use information about the platform to autodetect the target directory and Emulsify starter', async () => {
    expect.assertions(4);
    await init('cornflake');
    expect(selectMock).not.toHaveBeenCalled();
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      defaultTarget,
      { '--branch': 'main' },
    );
    expect(rmMock).toHaveBeenCalledWith(defaultGitPath, { recursive: true });
    expect(writeJsonFileMock).toHaveBeenCalledWith(defaultConfigPath, {
      project: {
        platform: 'none',
        machineName: 'cornflake',
        name: 'cornflake',
      },
      starter: {
        repository: 'https://github.com/emulsify-ds/emulsify-starter',
      },
    });
  });

  it('preserves starter configuration defaults while overriding generated project identity', async () => {
    const starterConfig = {
      project: {
        platform: 'drupal' as const,
        name: 'Starter Theme',
        machineName: 'starter_theme',
        singleDirectoryComponents: true,
        description: 'Starter-provided description',
      },
      starter: {
        repository: 'https://github.com/example/original-starter.git',
      },
      assets: {
        roots: ['./static'],
        rebase: true,
        selfContainedOutput: true,
      },
    };
    loadJsonFileMock.mockResolvedValueOnce(starterConfig);

    await init('cornflake');

    expect(loadJsonFileMock).toHaveBeenCalledWith(defaultConfigPath);
    expect(writeJsonFileMock).toHaveBeenCalledWith(defaultConfigPath, {
      ...starterConfig,
      project: {
        ...starterConfig.project,
        platform: 'none',
        name: 'cornflake',
        machineName: 'cornflake',
      },
      starter: {
        ...starterConfig.starter,
        repository: 'https://github.com/emulsify-ds/emulsify-starter',
      },
    });
  });

  it('logs Drupal Composer guidance when Drupal is auto-detected', async () => {
    expect.assertions(4);
    getPlatformInfoMock.mockReturnValueOnce({
      root: join(root, 'web'),
      name: 'drupal',
      emulsifyParentDirectory: drupalThemesDirectory,
      platformMajorVersion: 11,
    });

    await init('cornflake');

    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-drupal-starter',
      drupalTarget,
      { '--branch': 'main' },
    );
    // Guidance on a successful run is a note, never a warning.
    expect(noteMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'composer require drupal/emulsify drupal/emulsify_tools',
      ),
      'Drupal also needs',
    );
    expect(noteMock).toHaveBeenCalledWith(systemSelectionMessage, 'Next');
    expect(logMock).not.toHaveBeenCalledWith('warn', expect.anything());
  });

  it('clones the WordPress starter into the detected themes directory when WordPress is auto-detected', async () => {
    expect.assertions(2);
    getPlatformInfoMock.mockReturnValueOnce({
      root,
      name: 'wordpress',
      emulsifyParentDirectory: wordpressThemesDirectory,
    });

    await init('My Theme');

    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-wordpress-starter',
      wordpressTarget,
      { '--branch': 'main' },
    );
    expect(writeJsonFileMock).toHaveBeenCalledWith(
      join(wordpressTarget, EMULSIFY_PROJECT_CONFIG_FILE),
      {
        project: {
          platform: 'wordpress',
          machineName: 'my-theme',
          name: 'My Theme',
        },
        starter: {
          repository:
            'https://github.com/emulsify-ds/emulsify-wordpress-starter',
        },
      },
    );
  });

  it('reports each phase of the init process as it starts', async () => {
    expect.assertions(4);
    await init('cornflake');

    expect(spinnerMock.start).toHaveBeenCalledWith(
      'Cloning https://github.com/emulsify-ds/emulsify-starter',
    );
    expect(spinnerMock.message).toHaveBeenNthCalledWith(
      1,
      'Installing dependencies',
    );
    expect(spinnerMock.message).toHaveBeenNthCalledWith(
      2,
      'Running the starter init hook',
    );
    expect(spinnerMock.stop).toHaveBeenCalledWith(
      `Created cornflake in ${defaultTarget}`,
    );
  });

  it('never starts the spinner before the target is reserved', async () => {
    expect.assertions(2);
    existsSyncMock.mockReturnValueOnce(true);

    await expect(init('cornflake')).rejects.toThrow(
      'The intended target is already occupied',
    );
    expect(spinnerMock.start).not.toHaveBeenCalled();
  });

  it('stops the spinner before reporting a failure', async () => {
    expect.assertions(2);
    installDependenciesMock.mockRejectedValueOnce(new Error('npm exploded'));

    await expect(init('cornflake')).rejects.toThrow(
      'Unable to initialize project while installing dependencies',
    );
    expect(spinnerMock.error).toHaveBeenCalledWith(
      'Could not finish installing dependencies',
    );
  });

  it('can clone an Emulsify starter based on CLI input, and summarize the result', async () => {
    expect.assertions(2);
    await init('cornflake', `${root}`, {
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
      checkout: 'main',
    });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      defaultTarget,
      { '--branch': 'main' },
    );
    expect(spinnerMock.stop).toHaveBeenCalledWith(
      `Created cornflake in ${defaultTarget}`,
    );
  });

  it('can clone an Emulsify starter without a provided checkout', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await init('cornflake', `${root}`, {
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
      platform: 'wordpress',
    });
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      defaultTarget,
      {},
    );
  });

  it('clones a custom starter without a checkout so Git uses the repository default branch', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);

    await init('cornflake', `${root}`, {
      starter: 'git@github.com:example/custom-starter.git',
      platform: 'drupal',
    });

    expect(gitCloneMock).toHaveBeenCalledWith(
      'git@github.com:example/custom-starter.git',
      defaultTarget,
      {},
    );
  });

  it('can clone the WordPress starter based on platform input', async () => {
    expect.assertions(2);
    getPlatformInfoMock.mockReturnValueOnce(undefined);

    await init('cornflake', `${root}`, {
      platform: 'wordpress',
    });

    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-wordpress-starter',
      defaultTarget,
      { '--branch': 'main' },
    );
    expect(writeJsonFileMock).toHaveBeenCalledWith(defaultConfigPath, {
      project: {
        platform: 'wordpress',
        machineName: 'cornflake',
        name: 'cornflake',
      },
      starter: {
        repository: 'https://github.com/emulsify-ds/emulsify-wordpress-starter',
      },
    });
  });

  it('uses flag-provided values without prompting in non-interactive mode', async () => {
    expect.assertions(5);
    getPlatformInfoMock.mockReturnValueOnce(undefined);

    await init(undefined, root, {
      machineName: 'cornflake',
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
      platform: 'drupal',
    });

    expect(textMock).not.toHaveBeenCalled();
    expect(selectMock).not.toHaveBeenCalled();
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      defaultTarget,
      {},
    );
    expect(writeJsonFileMock).toHaveBeenCalledWith(defaultConfigPath, {
      project: {
        platform: 'drupal',
        machineName: 'cornflake',
        name: 'cornflake',
      },
      starter: {
        repository: 'https://github.com/emulsify-ds/emulsify-starter',
      },
    });
    expect(noteMock).not.toHaveBeenCalledWith(
      expect.stringContaining('composer require drupal/emulsify'),
      expect.anything(),
    );
  });

  it('prompts for the platform with drupal, wordpress, and none choices when missing in an interactive terminal', async () => {
    expect.assertions(5);
    setStdinIsTTY(true);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    selectMock.mockResolvedValueOnce('none');

    await init('cornflake', root, {
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
    });

    expect(textMock).not.toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenNthCalledWith(1, {
      message: 'Platform',
      options: [
        { value: 'drupal', label: 'Drupal', hint: 'Drupal 10 or 11 theme' },
        { value: 'wordpress', label: 'WordPress', hint: 'WordPress theme' },
        { value: 'none', label: 'None', hint: 'standalone front end' },
      ],
      initialValue: 'drupal',
    });
    expect(writeJsonFileMock).toHaveBeenCalledWith(defaultConfigPath, {
      project: {
        platform: 'none',
        machineName: 'cornflake',
        name: 'cornflake',
      },
      starter: {
        repository: 'https://github.com/emulsify-ds/emulsify-starter',
      },
    });
    expect(noteMock).not.toHaveBeenCalledWith(
      expect.stringContaining('composer require drupal/emulsify'),
      expect.anything(),
    );
  });

  it('accepts init defaults without prompting when yes is set', async () => {
    expect.assertions(4);
    getPlatformInfoMock.mockReturnValueOnce(undefined);

    await init(undefined, undefined, {
      starter: 'https://github.com/emulsify-ds/emulsify-starter',
      yes: true,
    });

    expect(textMock).not.toHaveBeenCalled();
    expect(selectMock).not.toHaveBeenCalled();
    expect(gitCloneMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/emulsify-starter',
      'emulsifytheme',
      {},
    );
    expect(writeJsonFileMock).toHaveBeenCalledWith(
      join('emulsifytheme', EMULSIFY_PROJECT_CONFIG_FILE),
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
    await init('cornflake');
    expect(installDependencies).toHaveBeenCalledWith(defaultTarget);
  });

  it('executes the init script within the Emulsify starter, if it exists', async () => {
    expect.assertions(1);
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await init('cornflake');
    expect(executeScript).toHaveBeenCalledWith(defaultInitHookPath);
  });

  it('throws if no valid platform name is detectable', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    await expect(init('cornflake')).rejects.toThrow(
      'Unable to determine which platform you are installing Emulsify within. Please specify a platform (such as "drupal" or "wordpress") by passing a -p or --platform flag with your init command.',
    );
  });

  it('reports the clone phase and removes a partial target when cloning fails', async () => {
    gitCloneMock.mockRejectedValueOnce(new Error('Does not exist!'));

    await expect(init('cornflake')).rejects.toThrow(
      `Unable to initialize project while cloning the starter: Error: Does not exist!. Removed the incomplete target "${defaultTarget}".`,
    );
    expect(rmMock).toHaveBeenCalledWith(defaultTarget, {
      recursive: true,
      force: true,
    });
  });

  it('reports the configuration-read phase and rolls back invalid starter configuration', async () => {
    loadJsonFileMock.mockRejectedValueOnce(
      new Error('Invalid JSON in project.emulsify.json'),
    );

    await expect(init('cornflake')).rejects.toThrow(
      `Unable to initialize project while reading the starter project configuration: Error: Invalid JSON in project.emulsify.json. Removed the incomplete target "${defaultTarget}".`,
    );
    expect(rmMock).toHaveBeenCalledWith(defaultTarget, {
      recursive: true,
      force: true,
    });
  });

  it('reports the configuration-write phase and removes the incomplete target', async () => {
    writeJsonFileMock.mockRejectedValueOnce(new Error('config write failed'));

    await expect(init('cornflake')).rejects.toThrow(
      `Unable to initialize project while writing the project configuration: Error: config write failed. Removed the incomplete target "${defaultTarget}".`,
    );
    expect(rmMock).toHaveBeenCalledWith(defaultTarget, {
      recursive: true,
      force: true,
    });
  });

  it('reports the dependency phase and removes the incomplete target', async () => {
    installDependenciesMock.mockRejectedValueOnce(
      new Error('npm install failed'),
    );

    await expect(init('cornflake')).rejects.toThrow(
      `Unable to initialize project while installing dependencies: Error: npm install failed. Removed the incomplete target "${defaultTarget}".`,
    );
    expect(rmMock).toHaveBeenCalledWith(defaultTarget, {
      recursive: true,
      force: true,
    });
  });

  it('reports the hook phase and removes the incomplete target', async () => {
    existsSyncMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
    executeScriptMock.mockRejectedValueOnce(new Error('hook failed'));

    await expect(init('cornflake')).rejects.toThrow(
      `Unable to initialize project while executing the starter init hook: Error: hook failed. Removed the incomplete target "${defaultTarget}".`,
    );
    expect(executeScriptMock).toHaveBeenCalledWith(defaultInitHookPath);
    expect(rmMock).toHaveBeenCalledWith(defaultTarget, {
      recursive: true,
      force: true,
    });
  });

  it('provides manual cleanup guidance when rollback fails', async () => {
    installDependenciesMock.mockRejectedValueOnce(
      new Error('npm install failed'),
    );
    rmMock.mockRejectedValueOnce(new Error('EACCES'));

    await expect(init('cornflake')).rejects.toThrow(
      `Unable to initialize project while installing dependencies: Error: npm install failed. Automatic cleanup of the incomplete target "${defaultTarget}" also failed: Error: EACCES. Remove it manually before retrying.`,
    );
    expect(rmMock).toHaveBeenCalledWith(defaultTarget, {
      recursive: true,
      force: true,
    });
  });

  it('rolls back the target when removing starter Git metadata fails', async () => {
    rmMock.mockRejectedValueOnce(new Error('Git metadata is locked'));

    await expect(init('cornflake')).rejects.toThrow(
      `Unable to initialize project while removing the starter Git metadata: Error: Git metadata is locked. Removed the incomplete target "${defaultTarget}".`,
    );
    expect(rmMock).toHaveBeenNthCalledWith(1, defaultGitPath, {
      recursive: true,
    });
    expect(rmMock).toHaveBeenNthCalledWith(2, defaultTarget, {
      recursive: true,
      force: true,
    });
  });

  it('does not roll back a completed project when success logging fails', async () => {
    noteMock.mockImplementationOnce(() => {
      throw new Error('terminal output failed');
    });

    await expect(init('cornflake')).rejects.toThrow('terminal output failed');
    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(rmMock).toHaveBeenCalledWith(defaultGitPath, { recursive: true });
    expect(rmMock).not.toHaveBeenCalledWith(defaultTarget, {
      recursive: true,
      force: true,
    });
  });

  it('throws if no target is found or specified', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce({
      name: 'drupal',
    });
    await expect(init('cornflake')).rejects.toThrow(
      'Unable to find a directory to put Emulsify in. Please specify a directory using the "path" argument: emulsify init myTheme ./themes',
    );
  });

  it('throws if a detected platform is not supported', async () => {
    expect.assertions(1);
    getPlatformInfoMock.mockReturnValueOnce({
      name: 'invalid',
    });
    await expect(init('cornflake', root)).rejects.toThrow(
      'Unsupported platform "invalid". Supported platforms are "none", "drupal", and "wordpress".',
    );
  });

  it('throws if the target directory already exists', async () => {
    expect.assertions(4);
    existsSyncMock.mockReturnValueOnce(true);
    await expect(init('cornflake')).rejects.toThrow(
      `The intended target is already occupied: ${defaultTarget}`,
    );
    expect(mkdirMock).not.toHaveBeenCalled();
    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('does not remove a target created by another process after preflight', async () => {
    mkdirMock.mockRejectedValueOnce(
      Object.assign(new Error('already exists'), { code: 'EEXIST' }),
    );

    await expect(init('cornflake')).rejects.toThrow(
      `The intended target is already occupied: ${defaultTarget}`,
    );
    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('does not remove an unowned target when reserving it fails', async () => {
    mkdirMock.mockRejectedValueOnce(
      Object.assign(new Error('permission denied'), { code: 'EACCES' }),
    );

    await expect(init('cornflake')).rejects.toThrow(
      `Unable to initialize project while creating the target directory "${defaultTarget}": Error: permission denied`,
    );
    expect(gitCloneMock).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
  });

  it('should prompt for all info if name is missing', async () => {
    setStdinIsTTY(true);
    getPlatformInfoMock.mockReturnValueOnce(undefined);
    textMock.mockResolvedValueOnce('new-project').mockResolvedValueOnce(root);
    selectMock.mockResolvedValueOnce('drupal');

    await init();

    expect(text).toHaveBeenCalledTimes(2);
    expect(text).toHaveBeenNthCalledWith(1, {
      message: 'Project name',
      placeholder: 'emulsifyTheme',
      defaultValue: 'emulsifyTheme',
    });
    expect(text).toHaveBeenNthCalledWith(2, {
      message: 'Target directory',
      placeholder: './',
      defaultValue: './',
    });
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenNthCalledWith(1, {
      message: 'Platform',
      options: [
        { value: 'drupal', label: 'Drupal', hint: 'Drupal 10 or 11 theme' },
        { value: 'wordpress', label: 'WordPress', hint: 'WordPress theme' },
        { value: 'none', label: 'None', hint: 'standalone front end' },
      ],
      initialValue: 'drupal',
    });
    expect(gitCloneMock).toHaveBeenCalled();
    expect(noteMock).not.toHaveBeenCalledWith(
      expect.stringContaining('composer require drupal/emulsify'),
      expect.anything(),
    );
  });
});
