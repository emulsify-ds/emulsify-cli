/**
 * @file Unit tests for the component install handler.
 */

jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/project/getEmulsifyConfig', () => jest.fn());
jest.mock('../util/cache/getJsonFromCachedFile', () => jest.fn());
jest.mock('../util/cache/cloneIntoCache', () => jest.fn());
jest.mock('../util/cache/copyItemFromCache', () => jest.fn());
jest.mock('../util/fs/findFileInCurrentPath', () => jest.fn());
jest.mock('@inquirer/prompts');

import { pathExists } from 'fs-extra';
import { join, resolve } from 'path';
import { confirm } from '@inquirer/prompts';
import type { EmulsifySystem } from '@emulsify-cli/config';
import log from '../lib/log.js';
import CliError from '../lib/CliError.js';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_SYSTEM_CONFIG_FILE,
} from '../lib/constants.js';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig.js';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile.js';
import cloneIntoCache from '../util/cache/cloneIntoCache.js';
import copyItemFromCache from '../util/cache/copyItemFromCache.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import componentInstall from './componentInstall.js';

const logMock = log as jest.Mock;
const getEmulsifyConfigMock = getEmulsifyConfig as jest.Mock;
const getJsonFromCachedFileMock = getJsonFromCachedFile as jest.Mock;
const cloneIntoCacheMock = cloneIntoCache as jest.Mock;
const cloneSystemMock = jest.fn();
const copyItemFromCacheMock = copyItemFromCache as jest.Mock;
const findFileInCurrentPathMock = findFileInCurrentPath as jest.Mock;
const pathExistsMock = pathExists as jest.Mock;
const confirmMock = confirm as jest.Mock;

const projectRoot = resolve('/project');
const projectConfigPath = join(projectRoot, 'project.emulsify.json');
const componentPath = (name: string) =>
  join(projectRoot, 'components', '00-base', name);

const projectConfig = {
  project: {
    platform: 'drupal',
    name: 'Cornflake',
    machineName: 'cornflake',
  },
  starter: {
    repository: 'https://github.com/emulsify-ds/emulsify-starter',
  },
  system: {
    repository: 'https://github.com/emulsify-ds/compound.git',
    checkout: 'main',
  },
  variant: {
    platform: 'drupal',
    structureImplementations: [
      {
        name: 'base',
        directory: 'components/00-base',
      },
    ],
  },
};

const variant = {
  platform: 'drupal',
  structureImplementations: projectConfig.variant.structureImplementations,
  components: [
    {
      name: 'button',
      structure: 'base',
      dependency: ['icon'],
    },
    {
      name: 'icon',
      structure: 'base',
    },
    {
      name: 'card',
      structure: 'base',
    },
  ],
};

const system = {
  name: 'compound',
  homepage: 'https://example.com/compound',
  repository: 'https://github.com/emulsify-ds/compound.git',
  structure: [
    {
      name: 'base',
      description: 'Base components',
    },
  ],
  variants: [variant],
} as EmulsifySystem;

describe('componentInstall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The handler clones systems through a higher-order cache helper.
    cloneIntoCacheMock.mockReturnValue(cloneSystemMock);
    cloneSystemMock.mockResolvedValue(undefined);
    getEmulsifyConfigMock.mockResolvedValue(projectConfig);
    getJsonFromCachedFileMock.mockResolvedValue(system);
    copyItemFromCacheMock.mockResolvedValue(undefined);
    findFileInCurrentPathMock.mockReturnValue(projectConfigPath);
    pathExistsMock.mockResolvedValue(false);
    confirmMock.mockResolvedValue(false);
  });

  it('throws when no Emulsify project is detected', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce(undefined);

    await expect(componentInstall('button', {})).rejects.toThrow(
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
    );
  });

  it('throws when no system is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: undefined,
    });

    await expect(componentInstall('button', {})).rejects.toThrow(
      'You must select and install a system before you can install components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
    );
  });

  it('throws when no variant is configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      variant: undefined,
    });

    await expect(componentInstall('button', {})).rejects.toThrow(
      'You must select and install a system before you can install components. To see a list of out-of-the-box systems, run "emulsify system list". You can install a system by running "emulsify system install [name]"',
    );
  });

  it('throws when the configured system repository is invalid', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: {
        repository: 'not-a-git-url',
        checkout: 'main',
      },
    });

    await expect(componentInstall('button', {})).rejects.toThrow(
      'The repository URL must end in .git.',
    );
  });

  it('throws when the configured system repository has no parseable name', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: {
        repository: 'https://github.com/example/.git',
        checkout: 'main',
      },
    });

    await expect(componentInstall('button', {})).rejects.toThrow(
      'The system specified in your project configuration is not valid. Please make sure your project.emulsify.json file contains a system.repository value that is a valid git url',
    );
  });

  it('throws when the system is not clone-able', async () => {
    cloneSystemMock.mockRejectedValueOnce(new Error('clone failed'));

    await expect(componentInstall('button', {})).rejects.toThrow(
      'The system specified in your project configuration is not clone-able, or has an invalid checkout value.',
    );
  });

  it('throws when the cached system configuration is invalid', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce(undefined);

    await expect(componentInstall('button', {})).rejects.toThrow(
      'Unable to load configuration for the compound system. Please make sure the system is installed.',
    );

    expect(getJsonFromCachedFileMock).toHaveBeenCalledWith({
      bucket: 'systems',
      itemPath: ['compound'],
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'main',
      fileName: EMULSIFY_SYSTEM_CONFIG_FILE,
    });
  });

  it('throws when the configured variant is not found', async () => {
    const wordpressVariant = {
      ...variant,
      platform: 'wordpress',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      variant: {
        ...projectConfig.variant,
        platform: 'none',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [wordpressVariant],
    });

    await expect(componentInstall('button', {})).rejects.toThrow(
      'Unable to find configuration for the variant none within the system compound.',
    );
  });

  it('throws when the cached system has no variants', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: undefined,
    });

    await expect(componentInstall('button', {})).rejects.toThrow(
      'Unable to find configuration for the variant drupal within the system compound.',
    );
  });

  it('throws a CliError when neither a component name nor all option is provided', async () => {
    await expect(componentInstall('', {})).rejects.toThrow(CliError);
    await expect(componentInstall('', {})).rejects.toThrow(
      'Please specify a component to install, or pass --all to install all available components.',
    );

    expect(logMock).not.toHaveBeenCalled();
    expect(getEmulsifyConfigMock).not.toHaveBeenCalled();
  });

  it('throws when the requested component is not found', async () => {
    await expect(componentInstall('missing', {})).rejects.toThrow(
      'Cannot find the definition for component "missing".\n\nRun "emulsify component list" to see the full list.',
    );
  });

  it('installs all components with force when all option is passed', async () => {
    await componentInstall('', { all: true });

    expect(copyItemFromCacheMock).toHaveBeenCalledTimes(3);
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      1,
      'systems',
      ['compound', 'components/00-base', 'button'],
      componentPath('button'),
      true,
    );
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      3,
      'systems',
      ['compound', 'components/00-base', 'card'],
      componentPath('card'),
      true,
    );
  });

  it('installs a component and its dependencies on the happy path', async () => {
    await componentInstall('button', { force: true });

    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      1,
      'systems',
      ['compound', 'components/00-base', 'button'],
      componentPath('button'),
      true,
    );
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      2,
      'systems',
      ['compound', 'components/00-base', 'icon'],
      componentPath('icon'),
      true,
    );
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Success! The button component has been added to your project.',
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'The following dependencies were also installed:\n  → icon',
    );
  });

  it('requests a remote freshness check when refresh is enabled', async () => {
    await componentInstall('button', { force: true, refresh: true });

    expect(cloneIntoCacheMock).toHaveBeenCalledWith('systems', ['compound'], {
      refresh: true,
    });
  });

  it('previews a single component install without copying in dry-run mode', async () => {
    await componentInstall('card', { dryRun: true });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Dry run: component install "card"'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(componentPath('card')),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Real run would: copy component'),
    );
  });

  it('previews dependency installs without copying in dry-run mode', async () => {
    await componentInstall('button', { dryRun: true });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Dependencies:\n  - icon'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('  - icon (dependency of "button")'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(componentPath('icon')),
    );
  });

  it('previews existing component destinations without prompting in dry-run mode', async () => {
    pathExistsMock.mockResolvedValue(true);

    await componentInstall('card', { dryRun: true });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).not.toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Destination exists: yes'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      expect.stringContaining(
        'Real run would: prompt before replacing or skipping',
      ),
    );
  });

  it('installs a component when no project config path is found for destination checks', async () => {
    findFileInCurrentPathMock.mockReturnValueOnce(undefined);

    await componentInstall('card', {});

    expect(copyItemFromCacheMock).toHaveBeenCalledWith(
      'systems',
      ['compound', 'components/00-base', 'card'],
      componentPath('card'),
      false,
    );
  });

  it('prompts and installs when an existing component overwrite is accepted', async () => {
    pathExistsMock.mockResolvedValue(true);
    confirmMock.mockResolvedValue(true);

    await componentInstall('button', {});

    expect(confirmMock).toHaveBeenCalledWith({
      message:
        'The component "button" already exists. Would you like to replace it?',
      default: false,
    });
    expect(copyItemFromCacheMock).toHaveBeenCalledWith(
      'systems',
      ['compound', 'components/00-base', 'button'],
      componentPath('button'),
      true,
    );
  });

  it('does not prompt for overwrite when force is true', async () => {
    pathExistsMock.mockResolvedValue(true);

    await componentInstall('card', { force: true });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(copyItemFromCacheMock).toHaveBeenCalledWith(
      'systems',
      ['compound', 'components/00-base', 'card'],
      componentPath('card'),
      true,
    );
  });

  it('includes dependency context when prompting to overwrite a dependency', async () => {
    pathExistsMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    confirmMock.mockResolvedValue(true);

    await componentInstall('button', {});

    expect(confirmMock).toHaveBeenCalledWith({
      message:
        'The component "icon" (required by "button") already exists. Would you like to replace it?',
      default: false,
    });
    expect(copyItemFromCacheMock).toHaveBeenNthCalledWith(
      2,
      'systems',
      ['compound', 'components/00-base', 'icon'],
      componentPath('icon'),
      true,
    );
  });

  it('skips installation when an existing component overwrite is declined', async () => {
    pathExistsMock.mockResolvedValue(true);
    confirmMock.mockResolvedValue(false);

    await componentInstall('button', {});

    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Skipping installation of component "button".',
    );
    expect(copyItemFromCacheMock).not.toHaveBeenCalled();
  });

  it('logs dependency installation failures after the root component succeeds', async () => {
    copyItemFromCacheMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('missing dependency'));

    await componentInstall('button', { force: true });

    expect(logMock).toHaveBeenCalledWith(
      'warn',
      'The following dependencies could not be installed:\n  → icon',
    );
  });

  it('logs non-Error dependency installation failures immediately', async () => {
    copyItemFromCacheMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce('missing dependency');

    await componentInstall('button', { force: true });

    expect(logMock).toHaveBeenCalledWith(
      'warn',
      'Unable to install icon: missing dependency',
    );
  });

  it('logs non-Error root component installation failures', async () => {
    copyItemFromCacheMock.mockRejectedValueOnce('copy failed');

    await componentInstall('button', { force: true });

    expect(logMock).toHaveBeenCalledWith(
      'warn',
      'Unable to install button: copy failed',
    );
  });

  it('logs root component installation failures', async () => {
    copyItemFromCacheMock.mockRejectedValueOnce(new Error('copy failed'));

    await componentInstall('button', { force: true });

    expect(logMock).toHaveBeenCalledWith(
      'warn',
      'Unable to install button: copy failed',
    );
  });

  it('uses the project config path to check existing destinations', async () => {
    await componentInstall('button', {});

    expect(findFileInCurrentPathMock).toHaveBeenCalledWith(
      EMULSIFY_PROJECT_CONFIG_FILE,
    );
    expect(copyItemFromCacheMock).toHaveBeenCalledWith(
      'systems',
      ['compound', 'components/00-base', 'button'],
      componentPath('button'),
      false,
    );
  });
});
