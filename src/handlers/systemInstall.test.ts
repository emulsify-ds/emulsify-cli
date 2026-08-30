/**
 * @file Unit tests for the system install handler.
 */

jest.mock('../lib/log', () => jest.fn());
jest.mock('../util/system/getAvailableSystems', () => jest.fn());
jest.mock('../util/cache/cloneIntoCache', () => jest.fn());
jest.mock('../util/cache/getCachedItemCheckout', () => jest.fn());
jest.mock('../util/getRepositoryLatestTag', () => jest.fn());
jest.mock('../util/project/installComponentFromCache', () => jest.fn());
jest.mock('../util/project/installGeneralAssetsFromCache', () => jest.fn());
jest.mock('../util/cache/getJsonFromCachedFile', () => jest.fn());
jest.mock('../util/project/setEmulsifyConfig', () => jest.fn());
jest.mock('../util/project/getEmulsifyConfig', () => jest.fn());
jest.mock('../util/fs/findFileInCurrentPath', () => jest.fn());
jest.mock('../util/fs/executeScript', () => jest.fn());
jest.mock('../util/fs/writeToJsonFile', () => jest.fn());
jest.mock('@inquirer/prompts');

import fs from 'fs';
import { join, resolve } from 'path';
import type { EmulsifySystem, Platform } from '@emulsify-cli/config';
import { select } from '@inquirer/prompts';
import log from '../lib/log.js';
import {
  EMULSIFY_PROJECT_CONFIG_FILE,
  EMULSIFY_PROJECT_HOOK_FOLDER,
  EMULSIFY_PROJECT_HOOK_SYSTEM_INSTALL,
  EMULSIFY_SYSTEM_CONFIG_FILE,
} from '../lib/constants.js';
import getAvailableSystems from '../util/system/getAvailableSystems.js';
import cloneIntoCache from '../util/cache/cloneIntoCache.js';
import getCachedItemCheckout from '../util/cache/getCachedItemCheckout.js';
import getRepositoryLatestTag from '../util/getRepositoryLatestTag.js';
import installComponentFromCache from '../util/project/installComponentFromCache.js';
import installGeneralAssetsFromCache from '../util/project/installGeneralAssetsFromCache.js';
import getJsonFromCachedFile from '../util/cache/getJsonFromCachedFile.js';
import setEmulsifyConfig from '../util/project/setEmulsifyConfig.js';
import getEmulsifyConfig from '../util/project/getEmulsifyConfig.js';
import findFileInCurrentPath from '../util/fs/findFileInCurrentPath.js';
import executeScript from '../util/fs/executeScript.js';
import writeToJsonFile from '../util/fs/writeToJsonFile.js';
import systemInstall, { getSystemRepoInfo } from './systemInstall.js';

const logMock = log as jest.Mock;
const getAvailableSystemsMock = getAvailableSystems as jest.Mock;
const cloneIntoCacheMock = cloneIntoCache as jest.Mock;
const cloneSystemMock = jest.fn();
const getCachedItemCheckoutMock = getCachedItemCheckout as jest.Mock;
const getRepositoryLatestTagMock = getRepositoryLatestTag as jest.Mock;
const installComponentFromCacheMock = installComponentFromCache as jest.Mock;
const installGeneralAssetsFromCacheMock =
  installGeneralAssetsFromCache as jest.Mock;
const getJsonFromCachedFileMock = getJsonFromCachedFile as jest.Mock;
const setEmulsifyConfigMock = setEmulsifyConfig as jest.Mock;
const getEmulsifyConfigMock = getEmulsifyConfig as jest.Mock;
const findFileInCurrentPathMock = findFileInCurrentPath as jest.Mock;
const executeScriptMock = executeScript as jest.Mock;
const writeToJsonFileMock = writeToJsonFile as jest.Mock;
const existsSyncMock = fs.existsSync as jest.Mock;
const selectMock = select as jest.Mock;
const originalStdinIsTTY = process.stdin.isTTY;
const projectRoot = resolve('/project');
const projectConfigPath = join(projectRoot, EMULSIFY_PROJECT_CONFIG_FILE);
const systemConfigPath = join(projectRoot, EMULSIFY_SYSTEM_CONFIG_FILE);
const systemInstallHookPath = join(
  projectRoot,
  EMULSIFY_PROJECT_HOOK_FOLDER,
  EMULSIFY_PROJECT_HOOK_SYSTEM_INSTALL,
);

function setStdinIsTTY(value: boolean | undefined) {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
}

const projectConfig = {
  project: {
    platform: 'drupal',
    name: 'Cornflake',
    machineName: 'cornflake',
  },
  starter: {
    repository: 'https://github.com/emulsify-ds/emulsify-starter',
  },
};

const variant = {
  platform: 'drupal',
  structureImplementations: [
    {
      name: 'base',
      directory: 'components/00-base',
    },
  ],
  components: [
    {
      name: 'button',
      structure: 'base',
      required: true,
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

const availableSystems = [
  {
    name: 'compound',
    repository: 'https://github.com/emulsify-ds/compound.git',
  },
  {
    name: 'emulsify-ui-kit',
    repository: 'https://github.com/emulsify-ds/emulsify-ui-kit.git',
  },
];

function customSystemDefinition(platform: Platform): EmulsifySystem {
  return {
    name: 'custom-system',
    homepage: 'https://example.com/custom-system',
    repository: 'https://github.com/example/custom-system.git',
    structure: [
      {
        name: 'components',
        description: 'Project component library',
      },
    ],
    variants: [
      {
        platform,
        structureImplementations: [
          {
            name: 'components',
            directory: './src/components',
          },
        ],
        components: [],
      },
    ],
  };
}

describe('getSystemRepoInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAvailableSystemsMock.mockResolvedValue(availableSystems);
  });

  it('returns repository information from explicit repository options', async () => {
    await expect(
      getSystemRepoInfo(undefined, {
        repository: 'https://github.com/example/custom-system.git',
        checkout: 'v1.0.0',
      }),
    ).resolves.toEqual({
      name: 'custom-system',
      repository: 'https://github.com/example/custom-system.git',
      checkout: 'v1.0.0',
    });
  });

  it('throws invalid explicit repository URLs', async () => {
    await expect(
      getSystemRepoInfo(undefined, {
        repository: 'https://github.com/example/custom-system',
        checkout: 'v1.0.0',
      }),
    ).rejects.toThrow('The repository URL must end in .git.');
  });

  it('rejects a repository without a checkout instead of falling back to a named system', async () => {
    await expect(
      getSystemRepoInfo('compound', {
        repository: 'https://github.com/example/custom-system.git',
      }),
    ).rejects.toThrow(
      'The --repository option requires --checkout when installing a custom system.',
    );

    expect(getAvailableSystemsMock).not.toHaveBeenCalled();
  });

  it('rejects a checkout without a repository instead of falling back to a named system', async () => {
    await expect(
      getSystemRepoInfo('compound', {
        checkout: 'v1.0.0',
      }),
    ).rejects.toThrow(
      'The --checkout option requires --repository when installing a custom system.',
    );

    expect(getAvailableSystemsMock).not.toHaveBeenCalled();
  });

  it('returns nothing when an explicit repository has no parseable name', async () => {
    await expect(
      getSystemRepoInfo(undefined, {
        repository: 'https://github.com/example/.git',
        checkout: 'v1.0.0',
      }),
    ).resolves.toBeUndefined();
  });

  it('returns repository information from an available system name', async () => {
    await expect(getSystemRepoInfo('compound', {})).resolves.toEqual({
      name: 'compound',
      repository: 'https://github.com/emulsify-ds/compound.git',
    });
  });

  it('returns repository information from the emulsify-ui-kit system name', async () => {
    await expect(getSystemRepoInfo('emulsify-ui-kit', {})).resolves.toEqual({
      name: 'emulsify-ui-kit',
      repository: 'https://github.com/emulsify-ds/emulsify-ui-kit.git',
    });
  });
});

describe('systemInstall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStdinIsTTY(false);
    // The handler clones systems through a higher-order cache helper.
    cloneIntoCacheMock.mockReturnValue(cloneSystemMock);
    cloneSystemMock.mockResolvedValue(undefined);
    getAvailableSystemsMock.mockResolvedValue(availableSystems);
    getCachedItemCheckoutMock.mockResolvedValue('main');
    getRepositoryLatestTagMock.mockResolvedValue('v1.0.0');
    installComponentFromCacheMock.mockResolvedValue(undefined);
    installGeneralAssetsFromCacheMock.mockResolvedValue(undefined);
    getJsonFromCachedFileMock.mockResolvedValue(system);
    setEmulsifyConfigMock.mockResolvedValue(undefined);
    getEmulsifyConfigMock.mockResolvedValue(projectConfig);
    writeToJsonFileMock.mockResolvedValue(undefined);
    // A found project config plus an existing hook covers the optional hook branch.
    findFileInCurrentPathMock.mockReturnValue(projectConfigPath);
    existsSyncMock.mockReturnValue(true);
    executeScriptMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    setStdinIsTTY(originalStdinIsTTY);
  });

  it('throws when no Emulsify project is detected', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce(undefined);

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'No Emulsify project detected. You must run this command within an existing Emulsify project. For more information about creating Emulsify projects, run "emulsify init --help"',
    );
  });

  it('throws when a system is already configured', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'main',
      },
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'You have already selected a system within this Emulsify project.',
    );
  });

  it('prompts with built-in systems plus create and cancel when no system is provided in an interactive terminal', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce('cancel');

    await systemInstall(undefined, {});

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenNthCalledWith(1, {
      message: 'Choose a component system:',
      choices: ['compound', 'emulsify-ui-kit', 'create a new system', 'cancel'],
    });
  });

  it('installs the selected built-in system from the interactive prompt', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce('compound');

    await systemInstall(undefined, {});

    expect(cloneIntoCacheMock).toHaveBeenCalledWith('systems', ['compound'], {
      refresh: true,
    });
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'v1.0.0',
    });
    expect(setEmulsifyConfigMock).toHaveBeenCalledWith({
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'v1.0.0',
      },
      variant: {
        platform: 'drupal',
        structureImplementations: variant.structureImplementations,
      },
    });
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Successfully installed the compound system using the drupal variant.',
    );
  });

  it('cancels the interactive prompt without modifying files', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce('cancel');

    await systemInstall(undefined, {});

    expect(logMock).toHaveBeenCalledWith('info', 'System install cancelled.');
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
    expect(cloneSystemMock).not.toHaveBeenCalled();
    expect(getJsonFromCachedFileMock).not.toHaveBeenCalled();
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
    expect(installComponentFromCacheMock).not.toHaveBeenCalled();
    expect(installGeneralAssetsFromCacheMock).not.toHaveBeenCalled();
  });

  it('writes a custom system definition when create a new system is selected', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce('create a new system');
    findFileInCurrentPathMock.mockReturnValueOnce(projectConfigPath);
    existsSyncMock.mockReturnValueOnce(false);

    await systemInstall(undefined, {});

    expect(writeToJsonFileMock).toHaveBeenCalledWith(
      systemConfigPath,
      customSystemDefinition('drupal'),
    );
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Created system.emulsify.json.',
    );
    expect(logMock).toHaveBeenCalledWith(
      'info',
      'Add your real system name, repository, structures, variants, and components before using this system to install or generate components.',
    );
  });

  it('uses the current none platform in the custom system definition', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce('create a new system');
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'none',
      },
    });
    findFileInCurrentPathMock.mockReturnValueOnce(projectConfigPath);
    existsSyncMock.mockReturnValueOnce(false);

    await systemInstall(undefined, {});

    expect(writeToJsonFileMock).toHaveBeenCalledWith(
      systemConfigPath,
      customSystemDefinition('none'),
    );
  });

  it('uses the current wordpress platform in the custom system definition', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce('create a new system');
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'wordpress',
      },
    });
    findFileInCurrentPathMock.mockReturnValueOnce(projectConfigPath);
    existsSyncMock.mockReturnValueOnce(false);

    await systemInstall(undefined, {});

    expect(writeToJsonFileMock).toHaveBeenCalledWith(
      systemConfigPath,
      customSystemDefinition('wordpress'),
    );
  });

  it('does not overwrite an existing custom system definition', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce('create a new system');
    findFileInCurrentPathMock.mockReturnValueOnce(projectConfigPath);
    existsSyncMock.mockReturnValueOnce(true);

    await expect(systemInstall(undefined, {})).rejects.toThrow(
      'system.emulsify.json already exists. Remove or rename it before creating a new custom system definition.',
    );

    expect(writeToJsonFileMock).not.toHaveBeenCalled();
  });

  it('does not run remote install side effects when creating a custom system definition', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce('create a new system');
    findFileInCurrentPathMock.mockReturnValueOnce(projectConfigPath);
    existsSyncMock.mockReturnValueOnce(false);

    await systemInstall(undefined, {});

    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
    expect(cloneSystemMock).not.toHaveBeenCalled();
    expect(getJsonFromCachedFileMock).not.toHaveBeenCalled();
    expect(setEmulsifyConfigMock).not.toHaveBeenCalled();
    expect(installComponentFromCacheMock).not.toHaveBeenCalled();
    expect(installGeneralAssetsFromCacheMock).not.toHaveBeenCalled();
    expect(executeScriptMock).not.toHaveBeenCalled();
  });

  it('does not prompt when a system name is provided', async () => {
    setStdinIsTTY(true);

    await systemInstall('compound', {});

    expect(selectMock).not.toHaveBeenCalled();
  });

  it('rejects a repository without a checkout before installing a named system', async () => {
    await expect(
      systemInstall('compound', {
        repository: 'https://github.com/example/custom-system.git',
      }),
    ).rejects.toThrow(
      'The --repository option requires --checkout when installing a custom system.',
    );

    expect(getAvailableSystemsMock).not.toHaveBeenCalled();
    expect(getRepositoryLatestTagMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
    expect(cloneSystemMock).not.toHaveBeenCalled();
  });

  it('rejects a checkout without a repository before prompting for a system', async () => {
    setStdinIsTTY(true);

    await expect(
      systemInstall(undefined, {
        checkout: 'v1.0.0',
      }),
    ).rejects.toThrow(
      'The --checkout option requires --repository when installing a custom system.',
    );

    expect(selectMock).not.toHaveBeenCalled();
    expect(getAvailableSystemsMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).not.toHaveBeenCalled();
  });

  it('throws a helpful error in non-interactive mode when no system is provided', async () => {
    await expect(systemInstall(undefined, {})).rejects.toThrow(
      'Unable to download specified system. Specify a valid built-in system name as the positional argument, or provide both --repository and --checkout (branch, tag, or commit) for a custom system.',
    );
  });

  it('throws when no variant can be determined', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: '',
      },
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Unable to determine a variant for the specified system. Please either pass in a valid variant using the --variant flag.',
    );
  });

  it('rejects when the system is not clone-able', async () => {
    cloneSystemMock.mockRejectedValueOnce(new Error('clone failed'));

    await expect(systemInstall('compound', {})).rejects.toThrow('clone failed');
  });

  it('throws when the cached system configuration is invalid', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce(undefined);

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'The system you attempted to install (compound) is invalid, as it does not contain a valid configuration file.',
    );
  });

  it('preserves install validation output after shared extraction', async () => {
    const consoleErrorMock = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      homepage: 'not-a-uri',
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'The system install failed due to the validation errors reported above. Please fix the the errors in the "compound" configuration and try again.',
    );

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'System configuration errors:',
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/homepage',
          keyword: 'format',
        }),
      ]),
    );

    consoleErrorMock.mockRestore();
  });

  it('throws validation errors from invalid system variant platform expressions', async () => {
    const consoleErrorMock = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [
        {
          ...variant,
          platform: 'drupal && wordpress',
        },
      ],
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'The system install failed due to the validation errors reported above. Please fix the the errors in the "compound" configuration and try again.',
    );

    expect(consoleErrorMock).toHaveBeenCalled();

    consoleErrorMock.mockRestore();
  });

  it('throws when the requested variant is not found', async () => {
    await expect(
      systemInstall('compound', { variant: 'none' }),
    ).rejects.toThrow(
      'Unable to find a compatible variant matching "none" for project platform "drupal" within the system (compound). Available variant platform expressions: drupal.',
    );
  });

  it('throws when the system has no variants', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: undefined,
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Unable to find a compatible variant for project platform "drupal" within the system (compound). Available variant platform expressions: none.',
    );
  });

  it('installs the required components and global assets on the happy path', async () => {
    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith({
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'v1.0.0',
      },
      variant: {
        platform: 'drupal',
        structureImplementations: variant.structureImplementations,
      },
    });
    expect(installComponentFromCacheMock).toHaveBeenCalledWith(
      system,
      variant,
      'button',
      true,
    );
    expect(installGeneralAssetsFromCacheMock).toHaveBeenCalledWith(
      system,
      variant,
    );
    expect(executeScriptMock).toHaveBeenCalledWith(systemInstallHookPath);
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Successfully installed the compound system using the drupal variant.',
    );
  });

  it('installs all components when the all option is passed', async () => {
    await systemInstall('compound', { all: true });

    expect(installComponentFromCacheMock).toHaveBeenCalledTimes(2);
    expect(installComponentFromCacheMock).toHaveBeenNthCalledWith(
      2,
      system,
      variant,
      'card',
      true,
    );
  });

  it('uses an explicit variant on the happy path', async () => {
    await systemInstall('compound', { variant: 'drupal' });

    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Successfully installed the compound system using the drupal variant.',
    );
  });

  it('installs a wordpress system variant for a wordpress project', async () => {
    const wordpressVariant = {
      ...variant,
      platform: 'wordpress',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'wordpress',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [wordpressVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('prefers an exact wordpress variant over shared or generic variants for a wordpress project', async () => {
    const genericVariant = {
      ...variant,
      platform: 'none',
    };
    const sharedVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    const wordpressVariant = {
      ...variant,
      platform: 'wordpress',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'wordpress',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [genericVariant, sharedVariant, wordpressVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('installs a shared system variant for a drupal project', async () => {
    const expressionVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [expressionVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith({
      system: {
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'v1.0.0',
      },
      variant: {
        platform: 'drupal || wordpress',
        structureImplementations: variant.structureImplementations,
      },
    });
    expect(logMock).toHaveBeenCalledWith(
      'success',
      'Successfully installed the compound system using the drupal || wordpress variant.',
    );
  });

  it('installs a shared system variant for a wordpress project', async () => {
    const expressionVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'wordpress',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [expressionVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'drupal || wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('prefers a shared expression over a generic none variant for a concrete project', async () => {
    const genericVariant = {
      ...variant,
      platform: 'none',
    };
    const expressionVariant = {
      ...variant,
      platform: 'drupal || wordpress',
    };
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [genericVariant, expressionVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'drupal || wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it.each(['drupal', 'wordpress'] as const)(
    'allows a %s project platform to install a generic none variant',
    async (platform) => {
      const genericVariant = {
        ...variant,
        platform: 'none',
      };
      getEmulsifyConfigMock.mockResolvedValueOnce({
        ...projectConfig,
        project: {
          ...projectConfig.project,
          platform,
        },
      });
      getJsonFromCachedFileMock.mockResolvedValueOnce({
        ...system,
        variants: [genericVariant],
      });

      await systemInstall('compound', {});

      expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: {
            platform: 'none',
            structureImplementations: variant.structureImplementations,
          },
        }),
      );
    },
  );

  it.each(['drupal', 'wordpress'] as const)(
    'allows a none project platform to install a %s-only system variant',
    async (platform) => {
      const platformVariant = {
        ...variant,
        platform,
      };
      getEmulsifyConfigMock.mockResolvedValueOnce({
        ...projectConfig,
        project: {
          ...projectConfig.project,
          platform: 'none',
        },
      });
      getJsonFromCachedFileMock.mockResolvedValueOnce({
        ...system,
        variants: [platformVariant],
      });

      await systemInstall('compound', {});

      expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: {
            platform,
            structureImplementations: variant.structureImplementations,
          },
        }),
      );
    },
  );

  it('throws a clear error when a none project platform matches multiple variants in a non-interactive terminal', async () => {
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'none',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [
        {
          ...variant,
          platform: 'drupal',
        },
        {
          ...variant,
          platform: 'wordpress',
        },
      ],
    });

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Multiple compatible variants were found for project platform "none" within the system (compound): drupal, wordpress. Run this command in an interactive terminal or specify a variant.',
    );
  });

  it('prompts when a none project platform matches multiple variants in an interactive terminal', async () => {
    setStdinIsTTY(true);
    selectMock.mockResolvedValueOnce('wordpress');
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'none',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [
        {
          ...variant,
          platform: 'drupal',
        },
        {
          ...variant,
          platform: 'wordpress',
        },
      ],
    });

    await systemInstall('compound', {});

    expect(selectMock).toHaveBeenCalledWith({
      message: 'Choose a compound variant for project platform "none":',
      choices: ['drupal', 'wordpress'],
    });
    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'wordpress',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('allows a none project platform to prefer an exact none variant', async () => {
    const wordpressVariant = {
      ...variant,
      platform: 'wordpress',
    };
    const genericVariant = {
      ...variant,
      platform: 'none',
    };
    getEmulsifyConfigMock.mockResolvedValueOnce({
      ...projectConfig,
      project: {
        ...projectConfig.project,
        platform: 'none',
      },
    });
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [wordpressVariant, genericVariant],
    });

    await systemInstall('compound', {});

    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: {
          platform: 'none',
          structureImplementations: variant.structureImplementations,
        },
      }),
    );
  });

  it('installs no required components when none are marked required', async () => {
    getJsonFromCachedFileMock.mockResolvedValueOnce({
      ...system,
      variants: [
        {
          ...variant,
          components: [
            {
              name: 'card',
              structure: 'base',
            },
          ],
        },
      ],
    });

    await systemInstall('compound', {});

    expect(installComponentFromCacheMock).not.toHaveBeenCalled();
    expect(installGeneralAssetsFromCacheMock).toHaveBeenCalled();
  });

  it('fetches the latest tag when a named system has no checkout', async () => {
    await systemInstall('compound', {});

    expect(getRepositoryLatestTagMock).toHaveBeenCalledWith(
      'https://github.com/emulsify-ds/compound.git',
    );
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'v1.0.0',
    });
  });

  it('uses a configured system checkout without fetching the latest tag', async () => {
    getAvailableSystemsMock.mockResolvedValueOnce([
      {
        name: 'compound',
        repository: 'https://github.com/emulsify-ds/compound.git',
        checkout: 'main',
      },
    ]);

    await systemInstall('compound', {});

    expect(getRepositoryLatestTagMock).not.toHaveBeenCalled();
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: 'main',
    });
  });

  it('throws when no matching system repository is found', async () => {
    await expect(systemInstall('missing', {})).rejects.toThrow(
      'Unable to download specified system. Specify a valid built-in system name as the positional argument, or provide both --repository and --checkout (branch, tag, or commit) for a custom system.',
    );
  });

  it('throws when an explicit repository has no parseable system name', async () => {
    await expect(
      systemInstall(undefined, {
        repository: 'https://github.com/example/.git',
        checkout: 'main',
      }),
    ).rejects.toThrow(
      'Unable to download specified system. Specify a valid built-in system name as the positional argument, or provide both --repository and --checkout (branch, tag, or commit) for a custom system.',
    );
  });

  it('throws when project configuration cannot be updated', async () => {
    setEmulsifyConfigMock.mockRejectedValueOnce(new Error('write failed'));

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Unable to update your Emulsify project configuration.',
    );
  });

  it('throws when required components or assets cannot be installed', async () => {
    installComponentFromCacheMock.mockRejectedValueOnce(
      new Error('copy failed'),
    );

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Unable to install system assets and/or required components: Error: copy failed',
    );
  });

  it('throws when global assets cannot be installed', async () => {
    installGeneralAssetsFromCacheMock.mockRejectedValueOnce(
      new Error('asset failed'),
    );

    await expect(systemInstall('compound', {})).rejects.toThrow(
      'Unable to install system assets and/or required components: Error: asset failed',
    );
  });

  it('uses explicit repository options when provided', async () => {
    setStdinIsTTY(true);

    await systemInstall(undefined, {
      repository: 'https://github.com/example/custom-system.git',
      checkout: 'release',
    });

    expect(selectMock).not.toHaveBeenCalled();
    expect(cloneIntoCacheMock).toHaveBeenCalledWith(
      'systems',
      ['custom-system'],
      { refresh: true },
    );
    expect(cloneSystemMock).toHaveBeenCalledWith({
      repository: 'https://github.com/example/custom-system.git',
      checkout: 'release',
    });
  });

  it('uses a cached checkout when no checkout is available after installation', async () => {
    getRepositoryLatestTagMock.mockResolvedValueOnce(undefined);

    await systemInstall('compound', {});

    expect(getCachedItemCheckoutMock).toHaveBeenCalledWith({
      bucket: 'systems',
      itemPath: ['compound'],
      repository: 'https://github.com/emulsify-ds/compound.git',
      checkout: undefined,
    });
    expect(setEmulsifyConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: {
          repository: 'https://github.com/emulsify-ds/compound.git',
          checkout: 'main',
        },
      }),
    );
  });

  it('skips the install hook when no project config path is found', async () => {
    findFileInCurrentPathMock.mockReturnValueOnce(undefined);

    await systemInstall('compound', {});

    expect(executeScriptMock).not.toHaveBeenCalled();
    expect(findFileInCurrentPathMock).toHaveBeenCalledWith(
      EMULSIFY_PROJECT_CONFIG_FILE,
    );
  });

  it('skips the install hook when the hook file does not exist', async () => {
    existsSyncMock.mockReturnValueOnce(false);

    await systemInstall('compound', {});

    expect(executeScriptMock).not.toHaveBeenCalled();
  });
});
